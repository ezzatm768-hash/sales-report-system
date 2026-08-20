const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticateToken, requireTeamLeader } = require('../auth');

const router = express.Router();
router.use(authenticateToken, requireTeamLeader);

router.get('/dashboard', async (req, res) => {
  const team = await dbGet('SELECT * FROM teams WHERE team_leader_id = $1', [req.user.id]);
  if (!team) return res.json({ team: null, members: [], stats: {}, recentReports: [], reports: [], activePeriod: null });

  const members = await dbAll('SELECT * FROM sales WHERE team_id = $1 ORDER BY name', [team.id]);
  const activePeriod = await dbGet("SELECT * FROM evaluation_periods WHERE status = 'active' LIMIT 1");

  let stats = { totalMembers: members.length, requiredReports: 0, completedReports: 0, pendingReports: 0, submittedReports: 0 };

  if (activePeriod) {
    stats.requiredReports = members.length;
    stats.completedReports = (await dbGet("SELECT COUNT(*) as count FROM reports WHERE team_leader_id = $1 AND evaluation_period_id = $2 AND status = 'reviewed'", [req.user.id, activePeriod.id])).count;
    stats.submittedReports = (await dbGet("SELECT COUNT(*) as count FROM reports WHERE team_leader_id = $1 AND evaluation_period_id = $2 AND status = 'submitted'", [req.user.id, activePeriod.id])).count;
    stats.pendingReports = stats.requiredReports - stats.completedReports - stats.submittedReports;
  }

  const reports = await dbAll(`
    SELECT r.*, s.name as sales_name, ep.name as period_name
    FROM reports r
    JOIN sales s ON r.sales_id = s.id
    JOIN evaluation_periods ep ON r.evaluation_period_id = ep.id
    WHERE r.team_leader_id = $1
    ORDER BY r.created_at DESC
  `, [req.user.id]);

  res.json({ team, members, stats, recentReports: reports.slice(0, 5), reports, activePeriod });
});

router.get('/members', async (req, res) => {
  const team = await dbGet('SELECT id FROM teams WHERE team_leader_id = $1', [req.user.id]);
  if (!team) return res.json([]);
  const members = await dbAll('SELECT * FROM sales WHERE team_id = $1 ORDER BY name', [team.id]);
  res.json(members);
});

router.post('/members', async (req, res) => {
  const team = await dbGet('SELECT id FROM teams WHERE team_leader_id = $1', [req.user.id]);
  if (!team) return res.status(400).json({ error: 'No team found' });

  const { name, phone, join_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const result = await dbRun("INSERT INTO sales (name, team_id, phone, join_date) VALUES ($1, $2, $3, $4) RETURNING id", [name, team.id, phone || '', join_date || new Date().toISOString().split('T')[0]]);

  const activePeriod = await dbGet("SELECT id FROM evaluation_periods WHERE status = 'active' LIMIT 1");
  if (activePeriod) {
    await dbRun('INSERT INTO reports (sales_id, team_leader_id, evaluation_period_id, status) VALUES ($1, $2, $3, $4)', [result.lastInsertRowid, req.user.id, activePeriod.id, 'draft']);
  }

  res.json({ id: result.lastInsertRowid, message: 'Member added' });
});

router.put('/members/:id', async (req, res) => {
  const { name, phone, join_date } = req.body;
  await dbRun('UPDATE sales SET name = $1, phone = $2, join_date = $3 WHERE id = $4', [name, phone || '', join_date, parseInt(req.params.id)]);
  res.json({ message: 'Updated' });
});

router.delete('/members/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await dbRun('DELETE FROM evaluation_answers WHERE report_id IN (SELECT id FROM reports WHERE sales_id = $1)', [id]);
  await dbRun('DELETE FROM reports WHERE sales_id = $1', [id]);
  await dbRun('DELETE FROM sales WHERE id = $1', [id]);
  res.json({ message: 'Deleted' });
});

router.get('/reports', async (req, res) => {
  const reports = await dbAll(`
    SELECT r.*, s.name as sales_name, ep.name as period_name
    FROM reports r
    JOIN sales s ON r.sales_id = s.id
    JOIN evaluation_periods ep ON r.evaluation_period_id = ep.id
    WHERE r.team_leader_id = $1
    ORDER BY r.created_at DESC
  `, [req.user.id]);
  res.json(reports);
});

router.get('/reports/:id', async (req, res) => {
  const report = await dbGet(`
    SELECT r.*, s.name as sales_name, s.phone as sales_phone, u.name as team_leader_name,
           ep.name as period_name, ep.start_date, ep.end_date
    FROM reports r
    JOIN sales s ON r.sales_id = s.id
    JOIN users u ON r.team_leader_id = u.id
    JOIN evaluation_periods ep ON r.evaluation_period_id = ep.id
    WHERE r.id = $1 AND r.team_leader_id = $2
  `, [parseInt(req.params.id), req.user.id]);

  if (!report) return res.status(404).json({ error: 'Report not found' });

  const answers = await dbAll(`
    SELECT ea.*, ef.field_name, ef.field_order
    FROM evaluation_answers ea
    JOIN evaluation_fields ef ON ea.field_id = ef.id
    WHERE ea.report_id = $1
    ORDER BY ef.field_order
  `, [parseInt(req.params.id)]);

  res.json({ ...report, answers });
});

router.post('/reports', async (req, res) => {
  const { sales_id, evaluation_period_id, answers, status } = req.body;
  if (!sales_id || !evaluation_period_id) return res.status(400).json({ error: 'Missing required fields' });

  const existing = await dbGet('SELECT id FROM reports WHERE sales_id = $1 AND evaluation_period_id = $2 AND team_leader_id = $3', [sales_id, evaluation_period_id, req.user.id]);

  let reportId;
  if (existing) {
    reportId = existing.id;
    if (status === 'submitted') {
      await dbRun('UPDATE reports SET status = $1, submitted_at = CURRENT_TIMESTAMP WHERE id = $2', ['submitted', reportId]);
    }
    await dbRun('DELETE FROM evaluation_answers WHERE report_id = $1', [reportId]);
  } else {
    const result = await dbRun("INSERT INTO reports (sales_id, team_leader_id, evaluation_period_id, status) VALUES ($1, $2, $3, $4) RETURNING id", [sales_id, req.user.id, evaluation_period_id, status || 'draft']);
    reportId = result.lastInsertRowid;
    if (status === 'submitted') {
      await dbRun('UPDATE reports SET submitted_at = CURRENT_TIMESTAMP WHERE id = $1', [reportId]);
    }
  }

  if (answers && answers.length > 0) {
    for (const a of answers) {
      if (a.field_id && a.answer !== undefined) {
        await dbRun('INSERT INTO evaluation_answers (report_id, field_id, answer) VALUES ($1, $2, $3)', [reportId, a.field_id, a.answer]);
      }
    }
  }

  if (status === 'submitted') {
    await dbRun('INSERT INTO notifications (user_id, message, type) VALUES (1, $1, $2)', [`تقرير جديد تم إرساله من ${req.user.name}`, 'info']);
  }

  res.json({ id: reportId, message: 'Report saved' });
});

router.put('/reports/:id', async (req, res) => {
  const { answers, status } = req.body;
  const id = parseInt(req.params.id);
  const report = await dbGet('SELECT * FROM reports WHERE id = $1 AND team_leader_id = $2', [id, req.user.id]);
  if (!report) return res.status(404).json({ error: 'Not found' });

  if (status === 'submitted') {
    await dbRun('UPDATE reports SET status = $1, submitted_at = CURRENT_TIMESTAMP WHERE id = $2', ['submitted', id]);
    await dbRun('INSERT INTO notifications (user_id, message, type) VALUES (1, $1, $2)', [`تقرير جديد تم إرساله من ${req.user.name}`, 'info']);
  }

  if (answers && answers.length > 0) {
    await dbRun('DELETE FROM evaluation_answers WHERE report_id = $1', [id]);
    for (const a of answers) {
      if (a.field_id && a.answer !== undefined) {
        await dbRun('INSERT INTO evaluation_answers (report_id, field_id, answer) VALUES ($1, $2, $3)', [id, a.field_id, a.answer]);
      }
    }
  }

  res.json({ message: 'Updated' });
});

router.get('/fields', async (req, res) => {
  const fields = await dbAll('SELECT * FROM evaluation_fields WHERE active = 1 ORDER BY field_order');
  res.json(fields);
});

router.get('/active-period', async (req, res) => {
  const period = await dbGet("SELECT * FROM evaluation_periods WHERE status = 'active' LIMIT 1");
  res.json(period || null);
});

router.get('/notifications', async (req, res) => {
  const notifications = await dbAll('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.id]);
  res.json(notifications);
});

router.put('/notifications/:id/read', async (req, res) => {
  await dbRun('UPDATE notifications SET read = 1 WHERE id = $1 AND user_id = $2', [parseInt(req.params.id), req.user.id]);
  res.json({ message: 'Read' });
});

module.exports = router;

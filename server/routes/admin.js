const express = require('express');
const bcrypt = require('bcryptjs');
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticateToken, requireAdmin } = require('../auth');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/dashboard', async (req, res) => {
  const totalTeamLeaders = (await dbGet("SELECT COUNT(*) as count FROM users WHERE role = 'team_leader'")).count;
  const totalSales = (await dbGet('SELECT COUNT(*) as count FROM sales')).count;
  const completedReports = (await dbGet("SELECT COUNT(*) as count FROM reports WHERE status = 'reviewed'")).count;
  const pendingReports = (await dbGet("SELECT COUNT(*) as count FROM reports WHERE status = 'draft'")).count;
  const submittedReports = (await dbGet("SELECT COUNT(*) as count FROM reports WHERE status = 'submitted'")).count;
  const activeTeams = (await dbGet('SELECT COUNT(*) as count FROM teams')).count;

  const reportsByTeamLeader = await dbAll(`
    SELECT u.name as team_leader_name, 
           SUM(CASE WHEN r.status = 'reviewed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN r.status = 'draft' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN r.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
           SUM(CASE WHEN r.status = 'returned' THEN 1 ELSE 0 END) as returned,
           COUNT(r.id) as total
    FROM users u
    LEFT JOIN teams t ON t.team_leader_id = u.id
    LEFT JOIN sales s ON s.team_id = t.id
    LEFT JOIN reports r ON r.sales_id = s.id
    WHERE u.role = 'team_leader'
    GROUP BY u.id
  `);

  res.json({ totalTeamLeaders, totalSales, completedReports, pendingReports, submittedReports, activeTeams, reportsByTeamLeader });
});

router.get('/team-leaders', async (req, res) => {
  const leaders = await dbAll(`
    SELECT u.id, u.username, u.name, u.created_at, t.team_name, t.id as team_id,
           (SELECT COUNT(*) FROM sales WHERE team_id = t.id) as member_count
    FROM users u
    LEFT JOIN teams t ON t.team_leader_id = u.id
    WHERE u.role = 'team_leader'
  `);
  res.json(leaders);
});

router.post('/team-leaders', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'All fields required' });

  const exists = await dbGet('SELECT id FROM users WHERE username = $1', [username]);
  if (exists) return res.status(400).json({ error: 'Username already exists' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = await dbRun("INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id", [username, hashedPassword, 'team_leader', name]);

  const teamResult = await dbRun("INSERT INTO teams (team_name, team_leader_id) VALUES ($1, $2) RETURNING id", [`${name} Team`, result.lastInsertRowid]);
  await dbRun('UPDATE users SET team_id = $1 WHERE id = $2', [teamResult.lastInsertRowid, result.lastInsertRowid]);

  res.json({ id: result.lastInsertRowid, message: 'Team leader created' });
});

router.put('/team-leaders/:id', async (req, res) => {
  const { name, username } = req.body;
  await dbRun('UPDATE users SET name = $1, username = $2 WHERE id = $3', [name, username, parseInt(req.params.id)]);
  res.json({ message: 'Updated' });
});

router.delete('/team-leaders/:id', async (req, res) => {
  const leader = await dbGet('SELECT team_id FROM users WHERE id = $1', [parseInt(req.params.id)]);
  if (leader && leader.team_id) {
    await dbRun('DELETE FROM evaluation_answers WHERE report_id IN (SELECT id FROM reports WHERE sales_id IN (SELECT id FROM sales WHERE team_id = $1))', [leader.team_id]);
    await dbRun('DELETE FROM reports WHERE sales_id IN (SELECT id FROM sales WHERE team_id = $1)', [leader.team_id]);
    await dbRun('DELETE FROM sales WHERE team_id = $1', [leader.team_id]);
    await dbRun('DELETE FROM teams WHERE id = $1', [leader.team_id]);
  }
  await dbRun('DELETE FROM users WHERE id = $1', [parseInt(req.params.id)]);
  res.json({ message: 'Deleted' });
});

router.get('/sales', async (req, res) => {
  const sales = await dbAll(`
    SELECT s.*, t.team_name, u.name as team_leader_name
    FROM sales s
    JOIN teams t ON s.team_id = t.id
    JOIN users u ON t.team_leader_id = u.id
    ORDER BY s.name
  `);
  res.json(sales);
});

router.get('/reports', async (req, res) => {
  const { team_leader_id, sales_id, period_id, status, search } = req.query;
  let query = `
    SELECT r.*, s.name as sales_name, u.name as team_leader_name, ep.name as period_name,
           ep.start_date, ep.end_date
    FROM reports r
    JOIN sales s ON r.sales_id = s.id
    JOIN users u ON r.team_leader_id = u.id
    JOIN evaluation_periods ep ON r.evaluation_period_id = ep.id
    WHERE 1=1
  `;
  const params = [];
  let i = 1;

  if (team_leader_id) { query += ` AND r.team_leader_id = $${i++}`; params.push(parseInt(team_leader_id)); }
  if (sales_id) { query += ` AND r.sales_id = $${i++}`; params.push(parseInt(sales_id)); }
  if (period_id) { query += ` AND r.evaluation_period_id = $${i++}`; params.push(parseInt(period_id)); }
  if (status) { query += ` AND r.status = $${i++}`; params.push(status); }
  if (search) { query += ` AND (s.name ILIKE $${i} OR u.name ILIKE $${i})`; params.push(`%${search}%`); i++; }

  query += ' ORDER BY r.created_at DESC';
  const reports = await dbAll(query, params);
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
    WHERE r.id = $1
  `, [parseInt(req.params.id)]);

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

router.put('/reports/:id/status', async (req, res) => {
  const { status, admin_notes } = req.body;
  const id = parseInt(req.params.id);
  if (status === 'reviewed') {
    await dbRun('UPDATE reports SET status = $1, admin_notes = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3', [status, admin_notes || '', id]);
  } else if (status === 'returned') {
    await dbRun('UPDATE reports SET status = $1, admin_notes = $2 WHERE id = $3', [status, admin_notes || '', id]);
    const report = await dbGet('SELECT team_leader_id FROM reports WHERE id = $1', [id]);
    if (report) {
      await dbRun('INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)', [report.team_leader_id, 'تم إعادتك التقرير للمراجعة. يرجى التعديل وإعادة الإرسال.', 'warning']);
    }
  }
  res.json({ message: 'Status updated' });
});

router.get('/periods', async (req, res) => {
  const periods = await dbAll('SELECT * FROM evaluation_periods ORDER BY start_date DESC');
  res.json(periods);
});

router.post('/periods', async (req, res) => {
  const { name, start_date, end_date, period_type } = req.body;
  const result = await dbRun("INSERT INTO evaluation_periods (name, start_date, end_date, period_type) VALUES ($1, $2, $3, $4) RETURNING id", [name, start_date, end_date, period_type || 'monthly']);

  const activeSales = await dbAll("SELECT id, team_id FROM sales WHERE status = 'active'");
  for (const sale of activeSales) {
    const team = await dbGet('SELECT team_leader_id FROM teams WHERE id = $1', [sale.team_id]);
    if (team && team.team_leader_id) {
      await dbRun('INSERT INTO reports (sales_id, team_leader_id, evaluation_period_id, status) VALUES ($1, $2, $3, $4)', [sale.id, team.team_leader_id, result.lastInsertRowid, 'draft']);
    }
  }

  const leaders = await dbAll("SELECT id FROM users WHERE role = 'team_leader'");
  for (const l of leaders) {
    await dbRun('INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)', [l.id, `فترة تقييم جديدة بدأت: ${name}`, 'info']);
  }

  res.json({ id: result.lastInsertRowid, message: 'Period created' });
});

router.put('/periods/:id', async (req, res) => {
  const { status } = req.body;
  await dbRun('UPDATE evaluation_periods SET status = $1 WHERE id = $2', [status, parseInt(req.params.id)]);
  res.json({ message: 'Updated' });
});

router.get('/fields', async (req, res) => {
  const fields = await dbAll('SELECT * FROM evaluation_fields ORDER BY field_order');
  res.json(fields);
});

router.post('/fields', async (req, res) => {
  const { field_name, field_description } = req.body;
  const maxOrder = await dbGet('SELECT MAX(field_order) as max_order FROM evaluation_fields');
  const order = (maxOrder.max_order || 0) + 1;
  const result = await dbRun("INSERT INTO evaluation_fields (field_name, field_description, field_order) VALUES ($1, $2, $3) RETURNING id", [field_name, field_description || '', order]);
  res.json({ id: result.lastInsertRowid, message: 'Field added' });
});

router.put('/fields/:id', async (req, res) => {
  const { field_name, field_description, field_order, active } = req.body;
  await dbRun('UPDATE evaluation_fields SET field_name = $1, field_description = $2, field_order = $3, active = $4 WHERE id = $5',
    [field_name, field_description || '', field_order || 0, active !== undefined ? active : 1, parseInt(req.params.id)]);
  res.json({ message: 'Updated' });
});

router.delete('/fields/:id', async (req, res) => {
  await dbRun('DELETE FROM evaluation_fields WHERE id = $1', [parseInt(req.params.id)]);
  res.json({ message: 'Deleted' });
});

router.get('/employee-history/:salesId', async (req, res) => {
  const reports = await dbAll(`
    SELECT r.*, ep.name as period_name, ep.start_date
    FROM reports r
    JOIN evaluation_periods ep ON r.evaluation_period_id = ep.id
    WHERE r.sales_id = $1
    ORDER BY ep.start_date DESC
  `, [parseInt(req.params.salesId)]);

  const reportsWithAnswers = [];
  for (const report of reports) {
    const answers = await dbAll(`
      SELECT ea.*, ef.field_name, ef.field_order
      FROM evaluation_answers ea
      JOIN evaluation_fields ef ON ea.field_id = ef.id
      WHERE ea.report_id = $1
      ORDER BY ef.field_order
    `, [report.id]);
    reportsWithAnswers.push({ ...report, answers });
  }

  res.json(reportsWithAnswers);
});

router.get('/notifications', async (req, res) => {
  const notifications = await dbAll('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
  res.json(notifications);
});

module.exports = router;

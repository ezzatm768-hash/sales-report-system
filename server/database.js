const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function dbAll(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function dbGet(sql, params = []) {
  const rows = await dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function dbRun(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    const idResult = await client.query('SELECT lastval() as id');
    return { lastInsertRowid: idResult.rows[0].id, rowCount: result.rowCount };
  } finally {
    client.release();
  }
}

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'team_leader')),
        name TEXT NOT NULL,
        team_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        team_name TEXT NOT NULL,
        team_leader_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_leader_id) REFERENCES users(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        team_id INTEGER NOT NULL,
        phone TEXT,
        join_date TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_periods (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        period_type TEXT DEFAULT 'monthly',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        sales_id INTEGER NOT NULL,
        team_leader_id INTEGER NOT NULL,
        evaluation_period_id INTEGER NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        reviewed_at TIMESTAMP,
        admin_notes TEXT,
        FOREIGN KEY (sales_id) REFERENCES sales(id),
        FOREIGN KEY (team_leader_id) REFERENCES users(id),
        FOREIGN KEY (evaluation_period_id) REFERENCES evaluation_periods(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_fields (
        id SERIAL PRIMARY KEY,
        field_name TEXT NOT NULL,
        field_description TEXT,
        field_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_answers (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL,
        field_id INTEGER NOT NULL,
        answer TEXT DEFAULT '',
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
        FOREIGN KEY (field_id) REFERENCES evaluation_fields(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Seed admin
    const adminCheck = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.rows.length === 0) {
      const hashed = bcrypt.hashSync('me011012', 10);
      await client.query("INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)", ['msms.ezzat@gmail.com', hashed, 'admin', 'MS Ezzat']);
    }

    // Seed team leader
    const tlCheck = await client.query("SELECT id FROM users WHERE username = 'mahmoud.elew@gmail.com'");
    if (tlCheck.rows.length === 0) {
      const hashed = bcrypt.hashSync('00000', 10);
      const tlResult = await client.query("INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id", ['mahmoud.elew@gmail.com', hashed, 'team_leader', 'محمود']);
      const tlId = tlResult.rows[0].id;
      const teamResult = await client.query("INSERT INTO teams (team_name, team_leader_id) VALUES ($1, $2) RETURNING id", ['فريق محمود', tlId]);
      await client.query("UPDATE users SET team_id = $1 WHERE id = $2", [teamResult.rows[0].id, tlId]);
    }

    // Seed evaluation fields
    const fieldsCheck = await client.query("SELECT COUNT(*) as count FROM evaluation_fields");
    if (parseInt(fieldsCheck.rows[0].count) === 0) {
      const defaultFields = [
        'معرفة المنتج', 'مهارات التواصل', 'اكتشاف احتياجات العميل',
        'التعامل مع الاعتراضات', 'الالتزام بعملية البيع', 'استخدام الـ CRM',
        'سرعة المتابعة', 'جودة المتابعة', 'النشاط اليومي',
        'التعامل مع الـ Leads', 'القدرة على توليد Leads', 'استخدام Social Media',
        'Personal Branding', 'الالتزام بتعليمات Team Leader', 'نقاط القوة',
        'نقاط الضعف', 'المشكلة الحالية', 'ملاحظات Team Leader'
      ];
      for (let i = 0; i < defaultFields.length; i++) {
        await client.query("INSERT INTO evaluation_fields (field_name, field_order) VALUES ($1, $2)", [defaultFields[i], i + 1]);
      }
    }

    // Seed active period
    const periodCheck = await client.query("SELECT id FROM evaluation_periods WHERE status = 'active'");
    if (periodCheck.rows.length === 0) {
      const now = new Date();
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      await client.query("INSERT INTO evaluation_periods (name, start_date, end_date, period_type, status) VALUES ($1, $2, $3, $4, $5)",
        [`${monthNames[now.getMonth()]} ${now.getFullYear()}`, startOfMonth, endOfMonth, 'monthly', 'active']);
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase, dbAll, dbGet, dbRun };

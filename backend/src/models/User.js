const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// Helper: shape a DB row into the object the routes & frontend expect
function formatUser(row) {
  if (!row) return null;
  return {
    _id: row.id,          // alias for frontend compatibility
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
    // password is intentionally omitted
  };
}

const User = {
  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return formatUser(rows[0]);
  },

  async findByIdWithPassword(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;  // raw row with password for auth checks
  },

  async findOne({ email }) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;  // raw row (password included) for auth
  },

  async count() {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
    return rows[0].cnt;
  },

  async create({ name, email, password, role = 'member', avatar = '' }) {
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, avatar)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email.toLowerCase().trim(), hashed, role, avatar]
    );
    return formatUser(rows[0]);
  },

  async findAll() {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows.map(formatUser);
  },

  async update(id, { name, avatar }) {
    const { rows } = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           avatar = COALESCE($2, avatar),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name || null, avatar !== undefined ? avatar : null, id]
    );
    return formatUser(rows[0]);
  },

  async comparePassword(candidate, hash) {
    return bcrypt.compare(candidate, hash);
  }
};

module.exports = User;

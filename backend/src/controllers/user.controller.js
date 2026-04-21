const bcrypt = require('bcrypt');
const pool   = require('../../config/db');

const SALT_ROUNDS = 12;

// ── GET /api/users ────────────────────────────────────────────
// Admin: list all users
async function getUsers(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error('getUsers error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve users' });
  }
}

// ── GET /api/users/agents ─────────────────────────────────────
// Admin: list only field agents (used for assignment dropdowns)
async function getAgents(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email,
              (SELECT COUNT(*) FROM fields WHERE assigned_to = users.id) AS field_count
       FROM   users
       WHERE  role = 'agent'
       ORDER  BY name ASC`
    );
    return res.json({ agents: rows });
  } catch (err) {
    console.error('getAgents error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve agents' });
  }
}

// ── POST /api/users ───────────────────────────────────────────
// Admin creates a new user account
async function createUser(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are required' });
  }

  if (!['admin', 'agent'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin' or 'agent'" });
  }

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );

    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('createUser error:', err.message);
    return res.status(500).json({ error: 'Could not create user' });
  }
}

// ── DELETE /api/users/:id ─────────────────────────────────────
async function deleteUser(req, res) {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err.message);
    return res.status(500).json({ error: 'Could not delete user' });
  }
}

module.exports = { getUsers, getAgents, createUser, deleteUser };

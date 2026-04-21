const pool              = require('../../config/db');
const { computeStatus } = require('../utils/status');

// Attach computed status to every field row from the DB
function withStatus(rows) {
  return rows.map((f) => ({ ...f, status: computeStatus(f.stage, f.planting_date) }));
}

// ── GET /api/fields ───────────────────────────────────────────
// Admin: all fields | Agent: assigned fields only
async function getFields(req, res) {
  try {
    let rows;

    if (req.user.role === 'admin') {
      const result = await pool.query(
        `SELECT f.*,
                u.name  AS agent_name,
                u.email AS agent_email
         FROM   fields f
         LEFT   JOIN users u ON u.id = f.assigned_to
         ORDER  BY f.created_at DESC`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT f.*,
                u.name  AS agent_name,
                u.email AS agent_email
         FROM   fields f
         LEFT   JOIN users u ON u.id = f.assigned_to
         WHERE  f.assigned_to = $1
         ORDER  BY f.created_at DESC`,
        [req.user.id]
      );
      rows = result.rows;
    }

    return res.json({ fields: withStatus(rows) });
  } catch (err) {
    console.error('getFields error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve fields' });
  }
}

// ── GET /api/fields/:id ───────────────────────────────────────
async function getFieldById(req, res) {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT f.*,
              u.name  AS agent_name,
              u.email AS agent_email
       FROM   fields f
       LEFT   JOIN users u ON u.id = f.assigned_to
       WHERE  f.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const field = rows[0];

    // Agents can only view their own fields
    if (req.user.role === 'agent' && field.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this field' });
    }

    return res.json({ field: { ...field, status: computeStatus(field.stage, field.planting_date) } });
  } catch (err) {
    console.error('getFieldById error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve field' });
  }
}

// ── POST /api/fields ──────────────────────────────────────────
async function createField(req, res) {
  const { name, crop_type, planting_date, location, size_hectares, assigned_to } = req.body;

  if (!name || !crop_type || !planting_date) {
    return res.status(400).json({ error: 'Name, crop type and planting date are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO fields (name, crop_type, planting_date, location, size_hectares, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, crop_type, planting_date, location || null, size_hectares || null, assigned_to || null, req.user.id]
    );

    const field = rows[0];
    return res.status(201).json({ field: { ...field, status: computeStatus(field.stage, field.planting_date) } });
  } catch (err) {
    console.error('createField error:', err.message);
    return res.status(500).json({ error: 'Could not create field' });
  }
}

// ── PUT /api/fields/:id ───────────────────────────────────────
async function updateField(req, res) {
  const { id } = req.params;
  const { name, crop_type, planting_date, location, size_hectares, assigned_to, stage } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM fields WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const { rows } = await pool.query(
      `UPDATE fields
       SET    name          = COALESCE($1, name),
              crop_type     = COALESCE($2, crop_type),
              planting_date = COALESCE($3, planting_date),
              location      = COALESCE($4, location),
              size_hectares = COALESCE($5, size_hectares),
              assigned_to   = COALESCE($6, assigned_to),
              stage         = COALESCE($7, stage)
       WHERE  id = $8
       RETURNING *`,
      [name, crop_type, planting_date, location, size_hectares, assigned_to, stage, id]
    );

    const field = rows[0];
    return res.json({ field: { ...field, status: computeStatus(field.stage, field.planting_date) } });
  } catch (err) {
    console.error('updateField error:', err.message);
    return res.status(500).json({ error: 'Could not update field' });
  }
}

// ── DELETE /api/fields/:id ────────────────────────────────────
async function deleteField(req, res) {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query('DELETE FROM fields WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    return res.json({ message: 'Field deleted successfully' });
  } catch (err) {
    console.error('deleteField error:', err.message);
    return res.status(500).json({ error: 'Could not delete field' });
  }
}

// ── GET /api/fields/dashboard/stats ──────────────────────────
async function getDashboardStats(req, res) {
  try {
    let fieldRows;

    if (req.user.role === 'admin') {
      const { rows } = await pool.query('SELECT stage, planting_date FROM fields');
      fieldRows = rows;
    } else {
      const { rows } = await pool.query(
        'SELECT stage, planting_date FROM fields WHERE assigned_to = $1',
        [req.user.id]
      );
      fieldRows = rows;
    }

    const total = fieldRows.length;

    // Stage breakdown
    const stages = { planted: 0, growing: 0, ready: 0, harvested: 0 };
    // Status breakdown
    const statuses = { active: 0, at_risk: 0, completed: 0 };

    for (const f of fieldRows) {
      stages[f.stage] = (stages[f.stage] || 0) + 1;
      const status = computeStatus(f.stage, f.planting_date);
      statuses[status] = (statuses[status] || 0) + 1;
    }

    // Admin-only: agent activity summary
    let agentSummary = null;
    if (req.user.role === 'admin') {
      const { rows } = await pool.query(
        `SELECT u.id, u.name, COUNT(f.id) AS assigned_count
         FROM   users u
         LEFT   JOIN fields f ON f.assigned_to = u.id
         WHERE  u.role = 'agent'
         GROUP  BY u.id, u.name
         ORDER  BY assigned_count DESC`
      );
      agentSummary = rows;
    }

    return res.json({ total, stages, statuses, agentSummary });
  } catch (err) {
    console.error('getDashboardStats error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve dashboard stats' });
  }
}

module.exports = { getFields, getFieldById, createField, updateField, deleteField, getDashboardStats };

const pool              = require('../../config/db');
const { computeStatus } = require('../utils/status');

const VALID_STAGES = ['planted', 'growing', 'ready', 'harvested'];

// Enforce forward-only stage progression
const STAGE_ORDER = { planted: 0, growing: 1, ready: 2, harvested: 3 };

// ── POST /api/updates ─────────────────────────────────────────
// Agent updates a field's stage and/or adds a note
async function createUpdate(req, res) {
  const { field_id, stage, notes } = req.body;

  if (!field_id || !stage) {
    return res.status(400).json({ error: 'field_id and stage are required' });
  }

  if (!VALID_STAGES.includes(stage)) {
    return res.status(400).json({ error: `stage must be one of: ${VALID_STAGES.join(', ')}` });
  }

  try {
    // Confirm the field exists and the agent is assigned to it
    const { rows: fieldRows } = await pool.query(
      'SELECT id, stage, assigned_to FROM fields WHERE id = $1',
      [field_id]
    );

    if (fieldRows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const field = fieldRows[0];

    if (req.user.role === 'agent' && field.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this field' });
    }

    // Prevent going backwards in the lifecycle
    if (STAGE_ORDER[stage] < STAGE_ORDER[field.stage]) {
      return res.status(400).json({
        error: `Cannot move field back to '${stage}' — it is already at '${field.stage}'`,
      });
    }

    // Record the update log entry
    const { rows: updateRows } = await pool.query(
      `INSERT INTO field_updates (field_id, agent_id, stage, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [field_id, req.user.id, stage, notes || null]
    );

    // Update the field's current stage
    await pool.query('UPDATE fields SET stage = $1 WHERE id = $2', [stage, field_id]);

    return res.status(201).json({ update: updateRows[0] });
  } catch (err) {
    console.error('createUpdate error:', err.message);
    return res.status(500).json({ error: 'Could not save update' });
  }
}

// ── GET /api/updates/field/:fieldId ──────────────────────────
// Returns the full update history for a field
async function getFieldUpdates(req, res) {
  const { fieldId } = req.params;

  try {
    // Confirm access
    const { rows: fieldRows } = await pool.query(
      'SELECT id, assigned_to FROM fields WHERE id = $1',
      [fieldId]
    );

    if (fieldRows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    if (req.user.role === 'agent' && fieldRows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this field' });
    }

    const { rows } = await pool.query(
      `SELECT fu.*,
              u.name  AS agent_name,
              u.email AS agent_email
       FROM   field_updates fu
       JOIN   users u ON u.id = fu.agent_id
       WHERE  fu.field_id = $1
       ORDER  BY fu.created_at DESC`,
      [fieldId]
    );

    return res.json({ updates: rows });
  } catch (err) {
    console.error('getFieldUpdates error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve updates' });
  }
}

// ── GET /api/updates/recent ───────────────────────────────────
// Admin: last 20 updates across all fields
async function getRecentUpdates(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT fu.*,
              f.name  AS field_name,
              u.name  AS agent_name
       FROM   field_updates fu
       JOIN   fields f ON f.id = fu.field_id
       JOIN   users  u ON u.id = fu.agent_id
       ORDER  BY fu.created_at DESC
       LIMIT  20`
    );

    return res.json({ updates: rows });
  } catch (err) {
    console.error('getRecentUpdates error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve recent updates' });
  }
}

module.exports = { createUpdate, getFieldUpdates, getRecentUpdates };

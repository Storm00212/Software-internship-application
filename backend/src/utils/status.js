/**
 * Field Status Logic
 * ─────────────────────────────────────────────────────────────
 * Status is derived from stage + planting date:
 *
 *  completed  — stage is 'harvested'
 *  at_risk    — stage is 'planted' or 'growing' AND planting date
 *               was more than the expected days ago for that stage
 *  active     — everything else (normal progression)
 *
 * Expected durations (rough agricultural approximation):
 *  planted  → should move to growing within 21 days
 *  growing  → should move to ready within 90 days
 *  ready    → should be harvested within 30 days
 */

const STAGE_MAX_DAYS = {
  planted: 21,
  growing: 90,
  ready:   30,
};

function daysSince(dateString) {
  const planted = new Date(dateString);
  const now     = new Date();
  return Math.floor((now - planted) / (1000 * 60 * 60 * 24));
}

function computeStatus(stage, planting_date) {
  if (stage === 'harvested') return 'completed';

  const age = daysSince(planting_date);

  // Accumulate threshold across all stages up to and including current
  const stageOrder = ['planted', 'growing', 'ready'];
  let threshold = 0;
  for (const s of stageOrder) {
    threshold += STAGE_MAX_DAYS[s];
    if (s === stage) break;
  }

  if (age > threshold) return 'at_risk';
  return 'active';
}

module.exports = { computeStatus };

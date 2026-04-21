import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import FormField, { Input, Select, Textarea, Button } from '../components/ui/FormField';
import './FieldDetailPage.css';

const STAGE_LABELS  = { planted:'Planted', growing:'Growing', ready:'Ready', harvested:'Harvested' };
const STAGE_NEXT    = { planted:'growing', growing:'ready', ready:'harvested', harvested: null };
const STATUS_LABELS = { active:'Active', at_risk:'At Risk', completed:'Completed' };

export default function FieldDetailPage() {
  const { id }        = useParams();
  const navigate       = useNavigate();
  const { isAdmin, user } = useAuth();

  const [field,   setField]   = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      const [fieldRes, updatesRes] = await Promise.all([
        api.get(`/fields/${id}`),
        api.get(`/updates/field/${id}`),
      ]);
      setField(fieldRes.data.field);
      setUpdates(updatesRes.data.updates);
    } catch (err) {
      setError(err.response?.status === 403 ? 'You do not have access to this field' : 'Could not load field');
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    try {
      await api.delete(`/fields/${id}`);
      navigate('/fields');
    } catch { setError('Could not delete field'); }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>;
  if (error)   return <div style={{ padding:40 }}><p style={{ color:'var(--ember)' }}>{error}</p><Button variant="ghost" onClick={() => navigate('/fields')}>← Back</Button></div>;

  const canUpdate = !isAdmin && field?.assigned_to === user?.id && field?.stage !== 'harvested';
  const nextStage = STAGE_NEXT[field?.stage];

  return (
    <div className="field-detail fade-up">
      {/* ── Header ── */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/fields')}>← Fields</button>
        <div className="detail-title-row">
          <div>
            <h1 className="serif detail-title">{field.name}</h1>
            <p className="detail-crop">{field.crop_type} {field.location ? `· ${field.location}` : ''}</p>
          </div>
          <div className="detail-badges">
            <span className={`status-badge status-${field.status}`}>{STATUS_LABELS[field.status]}</span>
            <span className="stage-badge">{STAGE_LABELS[field.stage]}</span>
          </div>
        </div>
        <div className="detail-actions">
          {canUpdate && nextStage && (
            <Button onClick={() => setShowUpdateModal(true)}>
              ↑ Move to {STAGE_LABELS[nextStage]}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setShowEditModal(true)}>Edit Field</Button>
              <Button variant="danger"    onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
            </>
          )}
        </div>
      </div>

      <div className="detail-body">
        {/* ── Info card ── */}
        <div className="card detail-info-card">
          <h2 className="serif detail-section-title">Field Info</h2>
          <div className="info-grid">
            <InfoRow label="Crop type"      value={field.crop_type} />
            <InfoRow label="Planting date"  value={new Date(field.planting_date).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })} />
            <InfoRow label="Current stage"  value={STAGE_LABELS[field.stage]} />
            <InfoRow label="Status"         value={STATUS_LABELS[field.status]} />
            {field.location     && <InfoRow label="Location"       value={field.location} />}
            {field.size_hectares && <InfoRow label="Size"          value={`${field.size_hectares} hectares`} />}
            {field.agent_name   && <InfoRow label="Assigned agent" value={field.agent_name} />}
          </div>
        </div>

        {/* ── Stage timeline ── */}
        <div className="card detail-info-card">
          <h2 className="serif detail-section-title">Lifecycle</h2>
          <div className="stage-timeline">
            {Object.entries(STAGE_LABELS).map(([key, label], i) => {
              const stageOrder  = ['planted','growing','ready','harvested'];
              const currentIdx  = stageOrder.indexOf(field.stage);
              const thisIdx     = stageOrder.indexOf(key);
              const isDone      = thisIdx < currentIdx;
              const isCurrent   = key === field.stage;
              return (
                <div key={key} className={`timeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="timeline-dot">{isDone ? '✓' : i + 1}</div>
                  <span>{label}</span>
                  {i < 3 && <div className="timeline-line" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Update history ── */}
      <div className="card detail-updates">
        <h2 className="serif detail-section-title">Update History</h2>
        {updates.length === 0 ? (
          <p style={{ color:'var(--text-muted)', fontSize:14, padding:'8px 0' }}>No updates yet.</p>
        ) : (
          <div className="updates-list">
            {updates.map((u) => (
              <div key={u.id} className="update-item">
                <div className="update-meta">
                  <span className="stage-badge">{STAGE_LABELS[u.stage]}</span>
                  <span className="update-agent">{u.agent_name}</span>
                  <span className="update-time">{new Date(u.created_at).toLocaleString('en-KE', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                </div>
                {u.notes && <p className="update-notes">{u.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showUpdateModal && (
        <UpdateModal
          field={field}
          nextStage={nextStage}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={() => { setShowUpdateModal(false); loadData(); }}
        />
      )}
      {showEditModal && (
        <EditFieldModal
          field={field}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => { setField(updated); setShowEditModal(false); }}
        />
      )}
      {showDeleteConfirm && (
        <Modal title="Delete Field" onClose={() => setShowDeleteConfirm(false)}>
          <p style={{ color:'var(--text-soft)', fontSize:14 }}>Are you sure you want to delete <strong>{field.name}</strong>? This will also remove all update history and cannot be undone.</p>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Yes, Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function UpdateModal({ field, nextStage, onClose, onUpdated }) {
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/updates', { field_id: field.id, stage: nextStage, notes: notes.trim() || undefined });
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save update');
    } finally { setLoading(false); }
  }

  return (
    <Modal title={`Update: ${field.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background:'var(--mist)', borderRadius:'var(--radius-sm)', padding:'12px 16px', fontSize:14, color:'var(--text-soft)' }}>
          Moving field from <strong>{STAGE_LABELS[field.stage]}</strong> → <strong style={{ color:'var(--sage)' }}>{STAGE_LABELS[nextStage]}</strong>
        </div>
        <FormField label="Observations / Notes (optional)">
          <Textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe what you observed in the field…" />
        </FormField>
        {error && <p style={{ color:'var(--ember)', fontSize:13 }}>{error}</p>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save Update</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditFieldModal({ field, onClose, onSaved }) {
  const [form,    setForm]    = useState({ name: field.name, crop_type: field.crop_type, planting_date: field.planting_date?.split('T')[0] || '', location: field.location || '', size_hectares: field.size_hectares || '', stage: field.stage });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleChange(e) { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await api.put(`/fields/${field.id}`, { ...form, size_hectares: form.size_hectares ? parseFloat(form.size_hectares) : null });
      onSaved(data.field);
    } catch (err) { setError(err.response?.data?.error || 'Could not update field'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Edit Field" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FormField label="Field name"><Input name="name" value={form.name} onChange={handleChange} required /></FormField>
        <FormField label="Crop type"><Input name="crop_type" value={form.crop_type} onChange={handleChange} required /></FormField>
        <FormField label="Planting date"><Input type="date" name="planting_date" value={form.planting_date} onChange={handleChange} required /></FormField>
        <FormField label="Location"><Input name="location" value={form.location} onChange={handleChange} /></FormField>
        <FormField label="Size (ha)"><Input type="number" step="0.1" name="size_hectares" value={form.size_hectares} onChange={handleChange} /></FormField>
        <FormField label="Stage">
          <Select name="stage" value={form.stage} onChange={handleChange}>
            {Object.entries(STAGE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        {error && <p style={{ color:'var(--ember)', fontSize:13 }}>{error}</p>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}

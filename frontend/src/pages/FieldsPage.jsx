import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import FormField, { Input, Select, Button } from '../components/ui/FormField';
import './FieldsPage.css';

const STAGE_LABELS  = { planted:'Planted', growing:'Growing', ready:'Ready', harvested:'Harvested' };
const STATUS_LABELS = { active:'Active', at_risk:'At Risk', completed:'Completed' };

export default function FieldsPage() {
  const { isAdmin }        = useAuth();
  const navigate            = useNavigate();

  const [fields,  setFields]  = useState([]);
  const [agents,  setAgents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadFields();
    if (isAdmin) loadAgents();
  }, [isAdmin]);

  async function loadFields() {
    try {
      const { data } = await api.get('/fields');
      setFields(data.fields);
    } catch { setError('Could not load fields'); }
    finally  { setLoading(false); }
  }

  async function loadAgents() {
    try {
      const { data } = await api.get('/users/agents');
      setAgents(data.agents);
    } catch {}
  }

  const filtered = fields.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
                          f.crop_type.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || f.status === filter || f.stage === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>;

  return (
    <div className="fields-page fade-up">
      <header className="page-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 className="serif page-title">Fields</h1>
          <p className="page-sub">{fields.length} field{fields.length !== 1 ? 's' : ''} total</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)}>
            <span>+</span> Add Field
          </Button>
        )}
      </header>

      {/* ── Filters ── */}
      <div className="fields-toolbar">
        <input
          className="search-input"
          placeholder="Search by name or crop…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {['all', 'active', 'at_risk', 'completed', 'planted', 'growing', 'ready', 'harvested'].map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : (STATUS_LABELS[f] || STAGE_LABELS[f])}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color:'var(--ember)', marginBottom:16 }}>{error}</p>}

      {/* ── Field cards ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No fields match your search.</p>
        </div>
      ) : (
        <div className="fields-grid">
          {filtered.map((f) => (
            <FieldCard key={f.id} field={f} onClick={() => navigate(`/fields/${f.id}`)} />
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {showModal && (
        <CreateFieldModal
          agents={agents}
          onClose={() => setShowModal(false)}
          onCreated={(field) => { setFields((prev) => [field, ...prev]); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function FieldCard({ field, onClick }) {
  const daysOld = Math.floor((new Date() - new Date(field.planting_date)) / 86400000);

  return (
    <div className="field-card card" onClick={onClick}>
      <div className="field-card-top">
        <div>
          <h3 className="field-card-name serif">{field.name}</h3>
          <p className="field-card-crop">{field.crop_type}</p>
        </div>
        <span className={`status-badge status-${field.status}`}>
          {STATUS_LABELS[field.status]}
        </span>
      </div>
      <div className="field-card-meta">
        <span className="stage-badge">{STAGE_LABELS[field.stage]}</span>
        {field.location && <span className="field-meta-item">{field.location}</span>}
        {field.size_hectares && <span className="field-meta-item">{field.size_hectares} ha</span>}
      </div>
      <div className="field-card-footer">
        <span className="field-meta-item">{daysOld}d since planting</span>
        {field.agent_name && <span className="field-meta-item">{field.agent_name}</span>}
      </div>
    </div>
  );
}

function CreateFieldModal({ agents, onClose, onCreated }) {
  const [form,    setForm]    = useState({ name:'', crop_type:'', planting_date:'', location:'', size_hectares:'', assigned_to:'' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, size_hectares: form.size_hectares ? parseFloat(form.size_hectares) : null, assigned_to: form.assigned_to || null };
      const { data } = await api.post('/fields', payload);
      onCreated(data.field);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create field');
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Add New Field" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FormField label="Field name *">
          <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Rift Valley Plot A" required />
        </FormField>
        <FormField label="Crop type *">
          <Input name="crop_type" value={form.crop_type} onChange={handleChange} placeholder="e.g. Maize" required />
        </FormField>
        <FormField label="Planting date *">
          <Input type="date" name="planting_date" value={form.planting_date} onChange={handleChange} required />
        </FormField>
        <FormField label="Location">
          <Input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Nakuru, Kenya" />
        </FormField>
        <FormField label="Size (hectares)">
          <Input type="number" step="0.1" name="size_hectares" value={form.size_hectares} onChange={handleChange} placeholder="e.g. 5.5" />
        </FormField>
        <FormField label="Assign to agent">
          <Select name="assigned_to" value={form.assigned_to} onChange={handleChange}>
            <option value="">— Unassigned —</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.field_count} fields)</option>)}
          </Select>
        </FormField>
        {error && <p style={{ color:'var(--ember)', fontSize:13 }}>{error}</p>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Field</Button>
        </div>
      </form>
    </Modal>
  );
}

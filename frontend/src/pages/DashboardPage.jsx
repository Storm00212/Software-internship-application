import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './DashboardPage.css';

const STAGE_LABELS = { planted: 'Planted', growing: 'Growing', ready: 'Ready', harvested: 'Harvested' };
const STAGE_COLORS = { planted: '#D4A96A', growing: '#40916C', ready: '#4895C2', harvested: '#8B5E3C' };
const STATUS_LABELS = { active: 'Active', at_risk: 'At Risk', completed: 'Completed' };

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate          = useNavigate();

  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, updatesRes] = await Promise.all([
          api.get('/fields/dashboard/stats'),
          isAdmin ? api.get('/updates/recent') : Promise.resolve({ data: { updates: [] } }),
        ]);
        setStats(statsRes.data);
        setRecent(updatesRes.data.updates);
      } catch (err) {
        setError('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>;
  if (error)   return <p style={{ color:'var(--ember)', padding:40 }}>{error}</p>;

  return (
    <div className="dashboard fade-up">
      <header className="page-header">
        <div>
          <h1 className="serif page-title">Dashboard</h1>
          <p className="page-sub">
            {isAdmin ? 'Overview across all fields and agents' : `Your assigned fields, ${user?.name?.split(' ')[0]}`}
          </p>
        </div>
      </header>

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <StatCard label="Total Fields"   value={stats?.total ?? 0} icon="🌾" color="var(--wheat)" />
        <StatCard label="Active"          value={stats?.statuses?.active ?? 0}    icon="✅" color="var(--sprout)" />
        <StatCard label="At Risk"         value={stats?.statuses?.at_risk ?? 0}   icon="⚠️"  color="var(--amber)" />
        <StatCard label="Completed"       value={stats?.statuses?.completed ?? 0} icon="🏁" color="var(--sky)"   />
      </div>

      <div className="dashboard-cols">
        {/* ── Stage breakdown ── */}
        <div className="card section-card">
          <h2 className="serif section-title">Stage Breakdown</h2>
          <div className="stage-bars">
            {Object.entries(STAGE_LABELS).map(([key, label]) => {
              const count = stats?.stages?.[key] ?? 0;
              const pct   = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={key} className="stage-bar-row">
                  <div className="stage-bar-label">
                    <span>{label}</span>
                    <span className="stage-bar-count">{count}</span>
                  </div>
                  <div className="stage-bar-track">
                    <div
                      className="stage-bar-fill"
                      style={{ width: `${pct}%`, background: STAGE_COLORS[key] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Admin: agent summary OR Agent: status summary ── */}
        {isAdmin && stats?.agentSummary ? (
          <div className="card section-card">
            <h2 className="serif section-title">Agent Workload</h2>
            <div className="agent-list">
              {stats.agentSummary.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No agents yet.</p>
              )}
              {stats.agentSummary.map((a) => (
                <div key={a.id} className="agent-row">
                  <div className="agent-avatar">{a.name.charAt(0).toUpperCase()}</div>
                  <div className="agent-info">
                    <span className="agent-name">{a.name}</span>
                    <span className="agent-count">{a.assigned_count} field{a.assigned_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="agent-bar-mini">
                    <div style={{ width: `${Math.min(parseInt(a.assigned_count) * 20, 100)}%`, background: 'var(--sage)', height: '100%', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card section-card">
            <h2 className="serif section-title">Status Summary</h2>
            <div className="status-summary">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className={`status-summary-chip status-${key}`}>
                  <span className="status-summary-count">{stats?.statuses?.[key] ?? 0}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Admin: recent activity feed ── */}
      {isAdmin && recent.length > 0 && (
        <div className="card section-card" style={{ marginTop: 24 }}>
          <h2 className="serif section-title">Recent Activity</h2>
          <div className="activity-list">
            {recent.slice(0, 8).map((u) => (
              <div key={u.id} className="activity-row" onClick={() => navigate(`/fields/${u.field_id}`)}>
                <div className="activity-dot" style={{ background: STAGE_COLORS[u.stage] }} />
                <div className="activity-info">
                  <span className="activity-field">{u.field_name}</span>
                  <span className="activity-detail">
                    moved to <strong>{STAGE_LABELS[u.stage]}</strong> by {u.agent_name}
                  </span>
                  {u.notes && <span className="activity-note">"{u.notes}"</span>}
                </div>
                <span className="activity-time">{formatTime(u.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ background: color + '22', color }}>{icon}</div>
      <div className="stat-value serif">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-KE', { day:'numeric', month:'short' });
}

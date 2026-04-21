import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import FormField, { Input, Select, Button } from '../components/ui/FormField';
import './UsersPage.css';

const ROLE_LABELS = { admin: 'Coordinator', agent: 'Field Agent' };

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch { setError('Could not load users'); }
    finally  { setLoading(false); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete user');
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="users-page fade-up">
      <header className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="serif page-title">Team</h1>
          <p className="page-sub">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <span>+</span> Add Member
        </Button>
      </header>

      {error && <p style={{ color: 'var(--ember)', marginBottom: 16, fontSize: 14 }}>{error}</p>}

      <div className="users-table card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.id === currentUser?.id ? 'is-me' : ''}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-full-name">
                      {u.name}
                      {u.id === currentUser?.id && <span className="you-tag">you</span>}
                    </span>
                  </div>
                </td>
                <td className="td-email">{u.email}</td>
                <td>
                  <span className={`role-badge role-${u.role}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="td-date">
                  {new Date(u.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  {u.id !== currentUser?.id && (
                    <button
                      className="delete-btn"
                      onClick={() => setDeleteTarget(u)}
                      title="Remove user"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create user modal ── */}
      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            setShowModal(false);
          }}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <Modal title="Remove Team Member" onClose={() => setDeleteTarget(null)}>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to remove <strong>{deleteTarget.name}</strong> from the system?
            Their assigned fields will become unassigned.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleDelete(deleteTarget.id)}>
              Yes, Remove
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', email: '', password: '', role: 'agent' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/users', form);
      onCreated(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Team Member" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="Full name *">
          <Input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. James Mwangi"
            required
            autoFocus
          />
        </FormField>

        <FormField label="Email address *">
          <Input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="james@example.com"
            required
          />
        </FormField>

        <FormField label="Password *">
          <Input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />
        </FormField>

        <FormField label="Role *">
          <Select name="role" value={form.role} onChange={handleChange}>
            <option value="agent">Field Agent</option>
            <option value="admin">Coordinator (Admin)</option>
          </Select>
        </FormField>

        {error && (
          <p style={{ color: 'var(--ember)', fontSize: 13 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import FormField, { Input, Button } from '../components/ui/FormField';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed, please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-illustration">
          <div className="illus-field">
            <div className="field-row r1" />
            <div className="field-row r2" />
            <div className="field-row r3" />
            <div className="field-row r4" />
            <div className="field-row r5" />
          </div>
          <p className="illus-quote serif">"Good farming begins<br/>with good observation."</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card fade-up">
          <div className="login-brand">
            <span style={{ fontSize: 32 }}>🌿</span>
            <h1 className="serif" style={{ fontSize: 28, color: 'var(--soil)' }}>SmartSeason</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              Field Monitoring System
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <FormField label="Email address">
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </FormField>

            <FormField label="Password">
              <Input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </FormField>

            {error && <p className="login-error">{error}</p>}

            <Button type="submit" loading={loading} style={{ width: '100%', marginTop: 4 }}>
              Sign in
            </Button>
          </form>

          <div className="demo-creds">
            <p className="demo-label">Demo credentials</p>
            <div className="demo-row">
              <span>Admin</span>
              <code>admin@smartseason.com / Admin@123</code>
            </div>
            <div className="demo-row">
              <span>Agent</span>
              <code>agent@smartseason.com / Agent@123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import FormField, { Input, Select, Button } from '../components/ui/FormField';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'agent' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  function toggleMode() {
    setIsSignup((prev) => !prev);
    setError('');
    setForm({ name: '', email: '', password: '', confirmPassword: '', role: 'agent' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignup) {
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.post('/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
        login(data.token, data.user);
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed, please try again');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
        login(data.token, data.user);
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.error || 'Login failed, please try again');
      } finally {
        setLoading(false);
      }
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
            <h1 className="serif" style={{ fontSize: 28, color: 'var(--soil)' }}>SmartSeason</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              Field Monitoring System
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {isSignup && (
              <FormField label="Full name">
                <Input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  autoFocus
                />
              </FormField>
            )}

            <FormField label="Email address">
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoFocus={!isSignup}
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

            {isSignup && (
              <>
                <FormField label="Confirm password">
                  <Input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </FormField>

                <FormField label="Role">
                  <Select name="role" value={form.role} onChange={handleChange}>
                    <option value="agent">Field Agent</option>
                    <option value="admin">Admin</option>
                  </Select>
                </FormField>
              </>
            )}

            {error && <p className="login-error">{error}</p>}

            <Button type="submit" loading={loading} style={{ width: '100%', marginTop: 4 }}>
              {isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="login-toggle">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="toggle-btn" onClick={toggleMode}>
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {!isSignup && (
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
          )}
        </div>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import FieldsPage     from './pages/FieldsPage';
import FieldDetailPage from './pages/FieldDetailPage';
import UsersPage      from './pages/UsersPage';
import Layout         from './components/ui/Layout';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading)            return <FullScreenLoader />;
  if (!user)              return <Navigate to="/login"     replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--cream)' }}>
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index              element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={<DashboardPage />} />
            <Route path="fields"      element={<FieldsPage />} />
            <Route path="fields/:id"  element={<FieldDetailPage />} />
            <Route path="users"       element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

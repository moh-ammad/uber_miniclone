import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import RiderDashboard from './pages/RiderDashboard';
import DriverDashboard from './pages/DriverDashboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-6 text-white">
        <div className="relative flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-white/8 px-8 py-10 shadow-2xl shadow-sky-950/30 backdrop-blur-xl">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-white/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-sky-400 border-r-sky-200" />
            <div className="absolute inset-4 rounded-full bg-white/10" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/80">Uber Clone</p>
            <p className="mt-2 text-2xl font-bold">Loading your ride experience</p>
            <p className="mt-1 text-sm text-slate-300">Checking session and restoring your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return children;
}

function DashboardSwitch() {
  const { user } = useAuth();
  return user?.role === 'DRIVER' ? <DriverDashboard /> : <RiderDashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <DashboardSwitch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider"
              element={
                <ProtectedRoute>
                  <DashboardSwitch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver"
              element={
                <ProtectedRoute>
                  <DashboardSwitch />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

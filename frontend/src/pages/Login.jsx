import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Car, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      toast.success('Login successful!');
      navigate('/app');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      if (errorMsg.includes('Invalid credentials') || errorMsg.includes('credentials') || errorMsg.includes('password')) {
        toast.error('Wrong credentials. Please check your email and password.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.2),transparent_40%),radial-gradient(circle_at_10%_90%,rgba(245,158,11,0.2),transparent_40%)]" />

      <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/60 bg-white/85 p-8 shadow-xl backdrop-blur sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-sky-500 p-3 text-white shadow-lg shadow-sky-500/30">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">UrbanGo</p>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Welcome Back</h1>
            </div>
          </div>

          <p className="mb-6 text-sm text-slate-600 sm:text-base">
            Sign in to continue bookings, track rides live, and chat with your driver in one place.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            New here?{' '}
            <Link to="/register" className="font-semibold text-sky-700 transition hover:text-sky-800">
              Create account
            </Link>
          </div>
        </section>

        <aside className="rounded-3xl bg-slate-900 p-8 text-slate-100 shadow-xl sm:p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Ride Experience</p>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">Fast booking, live tracking, and in-ride chat.</h2>
            <p className="max-w-md text-sm text-slate-300 sm:text-base">
              The app keeps rider and driver in sync with real-time updates, OTP ride security, and direct messaging.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-12">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
              <ShieldCheck className="mb-2 h-5 w-5 text-emerald-300" />
              <p className="font-semibold">OTP Ride Start</p>
              <p className="text-sm text-slate-300">Secure handoff before trip begins.</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
              <Mail className="mb-2 h-5 w-5 text-amber-300" />
              <p className="font-semibold">Instant Updates</p>
              <p className="text-sm text-slate-300">Status and messages without refresh.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

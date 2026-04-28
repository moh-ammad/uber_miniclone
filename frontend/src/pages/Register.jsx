import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, Car, Eye, EyeOff, ArrowRight, BadgeCheck, Bike, Gem, CarFront } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'RIDER',
    vehicleType: '',
    vehicleNumber: '',
    vehicleColor: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        email: formData.email.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        vehicleType: formData.vehicleType.trim(),
        vehicleNumber: formData.vehicleNumber.trim(),
        vehicleColor: formData.vehicleColor.trim()
      };

      const user = await register(payload);
      toast.success('Registration successful!');
      navigate('/app');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      if (errorMsg.includes('Email already') || errorMsg.includes('Phone already')) {
        toast.error('Email or phone already registered. Please use different credentials.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDriver = formData.role === 'DRIVER';
  const vehicleTypes = [
    { value: 'Bike', label: 'Bike', icon: Bike },
    { value: 'Auto', label: 'Auto', icon: Car },
    { value: 'Car', label: 'Car', icon: CarFront },
    { value: 'Luxury', label: 'Luxury', icon: Gem }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(14,165,233,0.22),transparent_42%),radial-gradient(circle_at_90%_90%,rgba(250,204,21,0.2),transparent_45%)]" />

      <div className="relative mx-auto w-full max-w-3xl rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur sm:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-500 p-3 text-white shadow-lg shadow-sky-500/35">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">UrbanGo</p>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Create Account</h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <BadgeCheck className="h-4 w-4" />
            OTP + Live Chat Ready
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700">Account Type</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'RIDER' })}
                className={`p-4 rounded-xl border-2 transition ${
                  !isDriver
                    ? 'border-sky-500 bg-sky-50 text-sky-800'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <p className="font-semibold">Book Rides</p>
                <p className="text-xs opacity-75">Standard rider account</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'DRIVER' })}
                className={`p-4 rounded-xl border-2 transition ${
                  isDriver
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <p className="font-semibold">Drive & Earn</p>
                <p className="text-xs opacity-75">Receive requests nearby</p>
              </button>
            </div>
          </div>

          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20"
                placeholder="Full Name"
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20"
                placeholder="Email Address"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20"
                placeholder="Phone Number"
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20"
                placeholder="Password"
                autoComplete="new-password"
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

          {isDriver && (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-amber-800">Vehicle Details</p>
              <div className="grid grid-cols-2 gap-2">
                {vehicleTypes.map((vehicle) => {
                  const Icon = vehicle.icon;
                  const active = formData.vehicleType === vehicle.value;

                  return (
                    <button
                      key={vehicle.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, vehicleType: vehicle.value })}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        active
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {vehicle.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 outline-none transition focus:ring-4 focus:ring-amber-500/20"
                placeholder="Vehicle Number"
                required
              />
              <input
                type="text"
                name="vehicleColor"
                value={formData.vehicleColor}
                onChange={handleChange}
                className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 outline-none transition focus:ring-4 focus:ring-amber-500/20"
                placeholder="Vehicle Color"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            Already have an account?{' '}
            <Link to="/" className="font-semibold text-sky-700 transition hover:text-sky-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

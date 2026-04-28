import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import {
  BadgeCheck,
  Car,
  Clock3,
  Bike,
  CarFront,
  Gem,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Power,
  Send,
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSocket } from '../lib/socket';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [17.385, 78.4867];

function MapUpdater({ center, zoom = 13 }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });

const vehicleIconLabel = (vehicleType = '') => {
  const value = vehicleType.toLowerCase();
  if (value.includes('bike')) return { label: 'Bike', tone: 'bg-emerald-50 text-emerald-700', icon: Bike };
  if (value.includes('lux') || value.includes('premium')) return { label: 'Luxury', tone: 'bg-purple-50 text-purple-700', icon: Gem };
  if (value.includes('auto')) return { label: 'Auto', tone: 'bg-amber-50 text-amber-700', icon: Car };
  return { label: 'Car', tone: 'bg-sky-50 text-sky-700', icon: CarFront };
};

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState('dashboard');
  const [isAvailable, setIsAvailable] = useState(user.isAvailable);
  const [activeRide, setActiveRide] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);

  const [location, setLocation] = useState(null);
  const [otpInput, setOtpInput] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  const mapCenter = useMemo(() => location || DEFAULT_CENTER, [location]);

  const totalEarnings = useMemo(
    () =>
      rideHistory
        .filter((ride) => ride.status === 'COMPLETED')
        .reduce((acc, ride) => acc + Number(ride.fare || 0), 0),
    [rideHistory]
  );

  const vehicleMeta = vehicleIconLabel(user.vehicleType);

  useEffect(() => {
    loadActiveRide();
    loadRideHistory();
    loadPendingRequests();
  }, []);

  useEffect(() => {
    if (!isAvailable) {
      setRideRequests([]);
      return;
    }

    if (!activeRide) {
      loadPendingRequests();
    }
  }, [isAvailable, activeRide]);

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this browser.');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const current = [position.coords.latitude, position.coords.longitude];
        setLocation(current);

        const socket = getSocket();
        if (socket && isAvailable) {
          socket.emit('location_update', {
            userId: user.id,
            lat: current[0],
            lng: current[1]
          });
        }
      },
      () => {
        toast.error('Location permission denied for driver tracking.');
      },
      { enableHighAccuracy: true, maximumAge: 4000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isAvailable, user.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onNewRideRequest = (payload) => {
      setRideRequests((prev) => {
        const exists = prev.some((item) => item.rideId === payload.rideId);
        return exists ? prev : [payload, ...prev];
      });
      toast.success('New ride request received.');
    };

    const onReceiveMessage = (payload) => {
      setMessages((prev) => [...prev, payload]);
    };

    const onRideCancelled = (payload) => {
      toast.error(`Ride cancelled by rider: ${payload.message || 'Rider cancelled the ride'}`);
      if (payload?.rideId) {
        setRideRequests((prev) => prev.filter((item) => item.rideId !== payload.rideId));
      }
      setActiveRide(null);
      setShowChat(false);
      setMessages([]);
      loadPendingRequests();
      loadRideHistory();
    };

    const onPaymentConfirmed = (payload) => {
      toast.success(`Payment received: INR ${payload.fare}`);
      loadRideHistory();
    };

    socket.on('new_ride_request', onNewRideRequest);
    socket.on('receive_message', onReceiveMessage);
    socket.on('ride_cancelled', onRideCancelled);
    socket.on('payment_confirmed', onPaymentConfirmed);

    return () => {
      socket.off('new_ride_request', onNewRideRequest);
      socket.off('receive_message', onReceiveMessage);
      socket.off('ride_cancelled', onRideCancelled);
      socket.off('payment_confirmed', onPaymentConfirmed);
    };
  }, []);

  useEffect(() => {
    if (!activeRide?.id) return;

    loadMessages();
  }, [activeRide?.id]);

  useEffect(() => {
    if (!activeRide?.id) return undefined;

    const intervalId = setInterval(() => {
      loadActiveRide();
      if (showChat) {
        loadMessages();
      }
    }, 7000);

    return () => clearInterval(intervalId);
  }, [activeRide?.id, showChat]);

  const loadPendingRequests = async () => {
    if (!isAvailable || activeRide) return;
    try {
      const { data } = await api.get('/api/rides/pending-requests');
      setRideRequests(data.requests || []);
    } catch {
      // Keep silent to avoid toast spam during polling.
    }
  };

  const loadRideHistory = async () => {
    try {
      const { data } = await api.get('/api/rides/driver-rides');
      setRideHistory(data.rides || []);
    } catch {
      toast.error('Failed to load ride history.');
    }
  };

  const loadActiveRide = async () => {
    try {
      const { data } = await api.get('/api/rides/active');
      setActiveRide(data.ride || null);
      if (!data.ride) {
        setShowChat(false);
      }
    } catch {
      toast.error('Failed to load active ride.');
    }
  };

  const loadMessages = async () => {
    if (!activeRide?.id) return;
    try {
      const { data } = await api.get(`/api/messages/${activeRide.id}`);
      setMessages(
        data.messages.map((msg) => ({
          id: msg.id,
          message: msg.message,
          senderName: msg.sender.name,
          senderRole: msg.sender.role,
          createdAt: msg.createdAt
        }))
      );
    } catch {
      toast.error('Unable to load chat history.');
    }
  };

  const toggleAvailability = async () => {
    try {
      const { data } = await api.post('/api/auth/toggle-availability');
      setIsAvailable(data.isAvailable);
      toast.success(data.isAvailable ? 'Driver is now online.' : 'Driver is now offline.');
      if (data.isAvailable) {
        loadPendingRequests();
      }
    } catch {
      toast.error('Failed to change availability.');
    }
  };

  const acceptRide = async (rideId) => {
    try {
      const { data } = await api.post('/api/rides/accept', { rideId });
      setActiveRide(data.ride);
      setRideRequests((prev) => prev.filter((item) => item.rideId !== rideId));
      setMessages([]);
      toast.success('Ride accepted.');
      loadRideHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept ride.');
    }
  };

  const markArrived = async () => {
    if (!activeRide) return;

    try {
      await api.post('/api/rides/arrived', { rideId: activeRide.id });
      toast.success('Marked as arrived.');
      loadActiveRide();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update ride status.');
    }
  };

  const startRide = async () => {
    if (!activeRide) return;

    try {
      await api.post('/api/rides/start', { rideId: activeRide.id, otp: otpInput.trim() });
      toast.success('Ride started.');
      setOtpInput('');
      loadActiveRide();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid OTP.');
    }
  };

  const completeRide = async () => {
    if (!activeRide) return;

    try {
      await api.post('/api/rides/complete', { rideId: activeRide.id });
      toast.success('Ride completed. Waiting for rider payment confirmation.');
      setActiveRide(null);
      setMessages([]);
      setShowChat(false);
      loadRideHistory();
      loadPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete ride.');
    }
  };

  const sendMessage = () => {
    const content = newMessage.trim();
    if (!content || !activeRide) return;

    const socket = getSocket();
    if (!socket) {
      toast.error('Chat connection unavailable.');
      return;
    }

    socket.emit('send_message', {
      rideId: activeRide.id,
      senderId: user.id,
      message: content
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        message: content,
        senderName: user.name,
        senderRole: user.role,
        createdAt: new Date().toISOString()
      }
    ]);

    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/85 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Driver Workspace</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Welcome, {user.name}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Full cycle: request, OTP verification, ride completion, rider payment confirmation.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleAvailability}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isAvailable
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Power className="h-4 w-4" />
                {isAvailable ? 'Online' : 'Go Online'}
              </button>
              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setTab('dashboard')}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === 'dashboard' ? 'bg-sky-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setTab('history')}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === 'history' ? 'bg-sky-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <History className="h-4 w-4" />
                History
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {tab === 'dashboard' && (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Profile</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-600">{user.phone}</p>
                  </div>
                  <div className={`rounded-2xl border border-slate-200 p-4 ${vehicleMeta.tone}`}>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <vehicleMeta.icon className="h-4 w-4" />
                      {vehicleMeta.label} service
                    </p>
                    <p className="mt-1 text-sm opacity-80">{user.vehicleColor} {user.vehicleType}</p>
                    <p className="mt-1 text-sm opacity-80">{user.vehicleNumber}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Availability</p>
                <p className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  <Power className="h-4 w-4" />
                  {isAvailable ? 'Receiving requests' : 'Offline'}
                </p>
                <p className="mt-3 text-sm text-slate-600">Ride requests will appear here and in live notifications.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completed rides</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {rideHistory.filter((ride) => ride.status === 'COMPLETED').length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total earnings</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">INR {totalEarnings.toFixed(0)}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
              <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-lg backdrop-blur">
                <div className="h-[56vh] min-h-[360px] p-3 lg:h-[calc(100vh-260px)]">
                  <div className="h-full w-full overflow-hidden rounded-2xl">
                    <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="h-full w-full">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapUpdater center={mapCenter} />
                      {location && (
                        <Marker position={location}>
                          <Popup>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold">Your Location</span>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {activeRide && (
                        <Marker position={[activeRide.pickupLat, activeRide.pickupLng]}>
                          <Popup>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-600" />
                              <span className="font-semibold">Pickup Point</span>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {location && activeRide && (
                        <Polyline positions={[location, [activeRide.pickupLat, activeRide.pickupLng]]} pathOptions={{ color: '#f97316', weight: 5 }} />
                      )}
                    </MapContainer>
                  </div>
                </div>
              </section>

              <aside className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur sm:p-5">
                {!activeRide && rideRequests.length === 0 && (
                  <div className="space-y-3 text-sm text-slate-600">
                    <h2 className="text-lg font-bold text-slate-900">No active rides</h2>
                    <p>{isAvailable ? 'Waiting for nearby ride requests.' : 'Switch online to receive requests.'}</p>
                  </div>
                )}

                {!activeRide && rideRequests.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold text-slate-900">Pending Requests</h2>
                    {rideRequests.map((request) => (
                      <div key={request.rideId} className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                        <p className="inline-flex items-center gap-1 font-semibold text-slate-900">
                          <BadgeCheck className="h-4 w-4 text-emerald-600" />
                          {request.riderName}
                        </p>
                        <p className="mt-1 inline-flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                          {request.pickupAddress}
                        </p>
                        <p className="mt-1 inline-flex items-start gap-2">
                          <Navigation className="mt-0.5 h-4 w-4 text-slate-500" />
                          {request.dropAddress}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-500" />
                          {request.distance} km | INR {request.fare}
                        </p>
                        <button
                          onClick={() => acceptRide(request.rideId)}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700"
                        >
                          <Car className="h-4 w-4" />
                          Accept Ride
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeRide && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Active Ride</p>
                      <p className="text-xl font-bold text-slate-900">{activeRide.status}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">Rider</p>
                      <p className="mt-1">{activeRide.rider?.name}</p>
                      <p className="inline-flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {activeRide.rider?.phone}
                      </p>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                      <p className="inline-flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                        {activeRide.pickupAddress}
                      </p>
                      <p className="inline-flex items-start gap-2">
                        <Navigation className="mt-0.5 h-4 w-4 text-slate-500" />
                        {activeRide.dropAddress}
                      </p>
                      <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                        <Clock3 className="h-4 w-4 text-slate-500" />
                        INR {activeRide.fare}
                      </p>
                      <p className="inline-flex items-center gap-2 text-sky-700">
                        <Navigation className="h-4 w-4" />
                        Rider pickup tracking is active
                      </p>
                    </div>

                    {activeRide.status === 'ACCEPTED' && (
                      <button
                        onClick={markArrived}
                        className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600"
                      >
                        Mark as Arrived
                      </button>
                    )}

                    {(activeRide.status === 'ARRIVED' || activeRide.status === 'ACCEPTED') && (
                      <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                          <ShieldCheck className="h-4 w-4" />
                          OTP Verification
                        </p>
                        <input
                          type="text"
                          value={otpInput}
                          onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.2em] outline-none transition focus:ring-4 focus:ring-emerald-500/20"
                          placeholder="000000"
                          maxLength={6}
                        />
                        <button
                          onClick={startRide}
                          className="w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Start Ride
                        </button>
                      </div>
                    )}

                    {activeRide.status === 'STARTED' && (
                      <button
                        onClick={completeRide}
                        className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700"
                      >
                        Complete Ride
                      </button>
                    )}

                    <button
                      onClick={() => setShowChat((prev) => !prev)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {showChat ? 'Hide Chat' : 'Chat with Customer'}
                    </button>

                    {showChat && (
                      <div className="rounded-2xl border border-slate-200 p-3">
                        <div className="mb-3 h-52 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2 text-sm">
                          {messages.length === 0 && <p className="px-1 py-2 text-slate-500">No messages yet.</p>}
                          {messages.map((msg) => (
                            <div
                              key={msg.id || `${msg.createdAt}-${msg.message}`}
                              className={`rounded-xl px-3 py-2 ${msg.senderRole === 'DRIVER' ? 'ml-8 bg-sky-100 text-slate-800' : 'mr-8 border border-slate-200 bg-white text-slate-700'}`}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{msg.senderName}</p>
                              <p>{msg.message}</p>
                              <p className="mt-1 text-[10px] text-slate-400">{formatTime(msg.createdAt)}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(event) => setNewMessage(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
                            placeholder="Type message"
                          />
                          <button
                            onClick={sendMessage}
                            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 text-white transition hover:bg-sky-700"
                            aria-label="Send message"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </>
        )}

        {tab === 'history' && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur sm:p-5">
            <h2 className="text-lg font-bold text-slate-900">Driver Ride History</h2>
            <p className="mt-1 text-sm text-slate-600">Payment comes from rider confirmation after completed rides.</p>

            <div className="mt-4 space-y-3">
              {rideHistory.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No rides found yet.</p>
              )}

              {rideHistory.map((ride) => (
                <div key={ride.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Ride #{ride.id}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{ride.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{formatDate(ride.requestedAt)}</p>
                  <p className="mt-2 text-sm text-slate-700">Driver: {user.name}</p>
                  <p className="text-sm text-slate-700">Pickup: {ride.pickupAddress}</p>
                  <p className="text-sm text-slate-700">Drop: {ride.dropAddress}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Fare: INR {ride.fare}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

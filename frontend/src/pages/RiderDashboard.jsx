import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  BadgeCheck,
  Car,
  Clock3,
  CreditCard,
  Copy,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSocket } from '../lib/socket';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DEFAULT_CENTER = [17.385, 78.4867];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

const redMarker = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenMarker = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center, zoom = 13 }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

function BookingMapClick({ onPickupSelect, onDropSelect, mode }) {
  useMapEvents({
    click(event) {
      if (mode === 'pickup') {
        onPickupSelect(event.latlng.lat, event.latlng.lng, 'Selected on map');
      }

      if (mode === 'drop') {
        onDropSelect(event.latlng.lat, event.latlng.lng, 'Selected on map');
      }
    }
  });

  return null;
}

function AddressAutocomplete({ label, placeholder, value, onChange, onSelect }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let stopped = false;

    const fetchResults = async () => {
      const query = value.trim();
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`
        );
        const list = await response.json();
        if (!stopped) {
          setResults(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!stopped) {
          setResults([]);
        }
      } finally {
        if (!stopped) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchResults, 280);
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setResults([]);
    if (results.length > 0) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [results.length]);

  return (
    <div className="relative space-y-2" onClick={(e) => e.stopPropagation()}>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-10 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
          placeholder={placeholder}
          required
        />
      </div>

      {(loading || results.length > 0) && (
        <div className="absolute left-0 right-0 top-[78px] z-20 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {loading && <p className="px-3 py-2 text-xs text-slate-500">Searching places...</p>}
          {!loading && results.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No matches found.</p>}
          {results.map((item) => (
            <button
              key={item.place_id}
              type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                  setResults([]);
                }}
              className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
            >
              {item.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

const rideProgress = {
  REQUESTED: 20,
  ACCEPTED: 45,
  ARRIVED: 65,
  STARTED: 85,
  COMPLETED: 100,
  CANCELLED: 0
};

const paymentTone = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NOT_REQUIRED: 'bg-slate-100 text-slate-600 border-slate-200'
};

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState('dashboard');
  const [activeRide, setActiveRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({ totalRides: 0, totalPaid: 0 });
  const [lastRideNotice, setLastRideNotice] = useState(null);

  const [showBooking, setShowBooking] = useState(false);
  const [submittingRide, setSubmittingRide] = useState(false);
  const [pendingPaymentRide, setPendingPaymentRide] = useState(null);
  const [paying, setPaying] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [copiedOtp, setCopiedOtp] = useState(false);

  const [bookingData, setBookingData] = useState({
    pickupAddress: '',
    pickupLat: null,
    pickupLng: null,
    dropAddress: '',
    dropLat: null,
    dropLng: null,
    mapMode: 'pickup'
  });

  const mapCenter = useMemo(() => driverLocation || userLocation || DEFAULT_CENTER, [driverLocation, userLocation]);
  const progressPercent = activeRide ? rideProgress[activeRide?.status || 'REQUESTED'] : 0;
  const bookingMapCenter = useMemo(
    () =>
      bookingData.pickupLat && bookingData.pickupLng
        ? [bookingData.pickupLat, bookingData.pickupLng]
        : userLocation || DEFAULT_CENTER,
    [bookingData.pickupLat, bookingData.pickupLng, userLocation]
  );

  const driverDistanceKm = useMemo(() => {
    if (!activeRide || !driverLocation) return null;
    const [driverLat, driverLng] = driverLocation;
    const latGap = driverLat - activeRide.pickupLat;
    const lngGap = driverLng - activeRide.pickupLng;
    return (Math.sqrt(latGap * latGap + lngGap * lngGap) * 111).toFixed(1);
  }, [activeRide, driverLocation]);

  const copyOtp = async () => {
    if (!activeRide?.otp) return;
    await navigator.clipboard.writeText(activeRide.otp);
    setCopiedOtp(true);
    toast.success('OTP copied.');
    setTimeout(() => setCopiedOtp(false), 1400);
  };

  useEffect(() => {
    refreshData();

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = [position.coords.latitude, position.coords.longitude];
        setUserLocation(current);
      },
      () => {
        toast.error('Location permission denied. Using default map position.');
      },
      { enableHighAccuracy: true, maximumAge: 8000 }
    );
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onRideAccepted = () => {
      toast.success('Driver accepted your ride.');
      loadActiveRide();
    };

    const onDriverArrived = () => {
      toast.success('Driver arrived at pickup point.');
      loadActiveRide();
    };

    const onRideStarted = () => {
      toast.success('Ride started successfully.');
      loadActiveRide();
    };

    const onRideCompleted = (data) => {
      toast.success(`Ride ended. Fare: INR ${data.fare}`);
      setPendingPaymentRide({ rideId: data.rideId, amount: data.fare });
      setActiveRide(null);
      setDriverLocation(null);
      setShowChat(false);
      setMessages([]);
      loadRideHistory();
      loadPaymentSummary();
    };

    const onDriverLocation = (data) => {
      setDriverLocation([data.lat, data.lng]);
    };

    const onMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on('ride_accepted', onRideAccepted);
    socket.on('driver_arrived', onDriverArrived);
    socket.on('ride_started', onRideStarted);
    socket.on('ride_completed', onRideCompleted);
    socket.on('driver_location', onDriverLocation);
    socket.on('receive_message', onMessage);

    return () => {
      socket.off('ride_accepted', onRideAccepted);
      socket.off('driver_arrived', onDriverArrived);
      socket.off('ride_started', onRideStarted);
      socket.off('ride_completed', onRideCompleted);
      socket.off('driver_location', onDriverLocation);
      socket.off('receive_message', onMessage);
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

  const refreshData = async () => {
    await Promise.all([loadActiveRide(), loadRideHistory(), loadPaymentSummary()]);
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

  const loadActiveRide = async () => {
    try {
      const { data } = await api.get('/api/rides/active');
      setActiveRide(data.ride || null);
      if (data.ride?.driver?.currentLat && data.ride?.driver?.currentLng) {
        setDriverLocation([data.ride.driver.currentLat, data.ride.driver.currentLng]);
      }
    } catch {
      toast.error('Failed to load active ride.');
    }
  };

  const loadRideHistory = async () => {
    try {
      const { data } = await api.get('/api/rides/my-rides');
      const rides = data.rides || [];
      setRideHistory(rides);

      if (!activeRide && rides.length > 0) {
        const latestRide = rides[0];
        setLastRideNotice(latestRide.status === 'CANCELLED' ? latestRide : null);
      }

      const unpaidRide = rides.find(
        (ride) => ride.status === 'COMPLETED' && ride.paymentStatus !== 'PAID'
      );
      if (unpaidRide) {
        setPendingPaymentRide({ rideId: unpaidRide.id, amount: unpaidRide.fare });
      }
    } catch {
      toast.error('Failed to load ride history.');
    }
  };

  const loadPaymentSummary = async () => {
    try {
      const { data } = await api.get('/api/rides/payment-summary');
      setPaymentSummary(data);
    } catch {
      toast.error('Failed to load payment summary.');
    }
  };

  const setPickupFromSelection = (lat, lng, label) => {
    setBookingData((prev) => ({
      ...prev,
      pickupAddress: label,
      pickupLat: lat,
      pickupLng: lng
    }));
  };

  const setDropFromSelection = (lat, lng, label) => {
    setBookingData((prev) => ({
      ...prev,
      dropAddress: label,
      dropLat: lat,
      dropLng: lng
    }));
  };

  const useCurrentLocation = () => {
    if (!userLocation) {
      toast.error('Current location unavailable.');
      return;
    }

    setPickupFromSelection(userLocation[0], userLocation[1], 'Current location');
  };

  const geocodeFallback = async (address) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(address)}`
    );
    const list = await response.json();
    if (!Array.isArray(list) || list.length === 0) return null;
    return {
      lat: parseFloat(list[0].lat),
      lng: parseFloat(list[0].lon)
    };
  };

  const handleBookRide = async (event) => {
    event.preventDefault();

    if (activeRide) {
      toast.error('You already have an active ride.');
      return;
    }

    const pickupAddress = bookingData.pickupAddress.trim();
    const dropAddress = bookingData.dropAddress.trim();

    if (!pickupAddress || !dropAddress) {
      toast.error('Please fill pickup and drop address.');
      return;
    }

    setSubmittingRide(true);

    try {
      let pickupLat = bookingData.pickupLat;
      let pickupLng = bookingData.pickupLng;
      let dropLat = bookingData.dropLat;
      let dropLng = bookingData.dropLng;

      if (pickupLat === null || pickupLng === null) {
        const fallbackPickup = await geocodeFallback(pickupAddress);
        if (!fallbackPickup) {
          toast.error('Unable to detect pickup location. Please choose a suggestion.');
          return;
        }
        pickupLat = fallbackPickup.lat;
        pickupLng = fallbackPickup.lng;
      }

      if (dropLat === null || dropLng === null) {
        const fallbackDrop = await geocodeFallback(dropAddress);
        if (!fallbackDrop) {
          toast.error('Unable to detect drop location. Please choose a suggestion.');
          return;
        }
        dropLat = fallbackDrop.lat;
        dropLng = fallbackDrop.lng;
      }

      const { data } = await api.post('/api/rides/request', {
        pickupAddress,
        pickupLat,
        pickupLng,
        dropAddress,
        dropLat,
        dropLng
      });

      setActiveRide(data.ride);
      setShowBooking(false);
      setMessages([]);
      toast.success('Ride requested. Waiting for driver acceptance.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to request ride.');
    } finally {
      setSubmittingRide(false);
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;

    try {
      await api.post('/api/rides/cancel', { rideId: activeRide.id });
      toast.success('Ride cancelled.');
      setLastRideNotice({ ...activeRide, status: 'CANCELLED' });
      setActiveRide(null);
      setDriverLocation(null);
      setShowChat(false);
      setMessages([]);
      loadRideHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel ride.');
    }
  };

  const confirmPayment = async () => {
    if (!pendingPaymentRide) return;

    setPaying(true);
    try {
      console.log('Confirming payment for ride:', pendingPaymentRide.rideId);
      const response = await api.post('/api/rides/confirm-payment', { rideId: pendingPaymentRide.rideId });
      console.log('Payment response:', response.data);
      toast.success('Payment confirmed. Thank you.');
      setPendingPaymentRide(null);
      loadPaymentSummary();
      loadRideHistory();
    } catch (error) {
      console.error('Payment error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Payment confirmation failed.');
    } finally {
      setPaying(false);
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Customer Workspace</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Welcome, {user.name}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Book rides without coordinates, track live, pay from customer account only.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!activeRide && (
                <button
                  onClick={() => setShowBooking(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  <Car className="h-4 w-4" />
                  Book a Ride
                </button>
              )}
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
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <UserRound className="h-4 w-4 text-slate-500" />
                      {user.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-600">{user.phone}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Navigation</p>
                    <p className="mt-1 text-sm text-slate-600">Pickup is auto-filled from your current location or address search.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ride progress</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {activeRide
                    ? 'Track request, driver acceptance, arrival, ride start, and payment.'
                    : 'No active ride yet. Book a ride to start tracking.'}
                </p>
              </div>
            </div>

            {activeRide && (
              <section className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                      <BadgeCheck className="h-4 w-4" />
                      Live notifications on
                    </p>
                    <h2 className="text-xl font-bold text-slate-900">{activeRide.status}</h2>
                    <p className="text-sm text-slate-600">Pickup: {activeRide.pickupAddress}</p>
                    <p className="text-sm text-slate-600">Drop: {activeRide.dropAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fare</p>
                    <p className="text-2xl font-bold text-slate-900">INR {activeRide.fare}</p>
                    <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentTone[activeRide.paymentStatus || 'PENDING'] || paymentTone.PENDING}`}>
                      {activeRide.paymentStatus || 'PENDING'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {!activeRide && lastRideNotice && (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      <BadgeCheck className="h-4 w-4" />
                      Last ride
                    </p>
                    <h2 className="text-xl font-bold text-slate-900">CANCELLED</h2>
                    <p className="text-sm text-slate-600">Pickup: {lastRideNotice.pickupAddress}</p>
                    <p className="text-sm text-slate-600">Drop: {lastRideNotice.dropAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fare</p>
                    <p className="text-2xl font-bold text-slate-900">INR {lastRideNotice.fare}</p>
                    <p className="mt-2 inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Cancelled
                    </p>
                  </div>
                </div>
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completed rides</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{paymentSummary.totalRides}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total paid by you</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">INR {Number(paymentSummary.totalPaid || 0).toFixed(0)}</p>
              </div>
            </div>

            {pendingPaymentRide && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 font-semibold text-emerald-800">
                    <CreditCard className="h-4 w-4" />
                    Complete rider payment: INR {pendingPaymentRide.amount}
                  </p>
                  <button
                    onClick={confirmPayment}
                    disabled={paying}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paying ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-lg backdrop-blur">
                <div className="h-[56vh] min-h-[360px] p-3 lg:h-[calc(100vh-260px)]">
                  <div className="h-full w-full overflow-hidden rounded-2xl">
                    <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="h-full w-full">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapUpdater center={mapCenter} />
                      {userLocation && (
                        <Marker position={userLocation} icon={redMarker}>
                          <Popup>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-600" />
                              <span className="font-semibold">Your Location</span>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {driverLocation && (
                        <Marker position={driverLocation} icon={greenMarker}>
                          <Popup>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-green-600" />
                              <span className="font-semibold">Driver Location</span>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {activeRide && driverLocation && (
                        <Polyline positions={[driverLocation, [activeRide.pickupLat, activeRide.pickupLng]]} pathOptions={{ color: '#ef4444', weight: 5 }} />
                      )}
                    </MapContainer>
                  </div>
                </div>
              </section>

              <aside className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/85 sm:p-5">
                {!activeRide && (
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">No active ride</h2>
                    <p>Click "Book a Ride" button at the top to start booking.</p>
                  </div>
                )}

                {activeRide && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Ride Status</p>
                      <p className="text-xl font-bold text-slate-900">{activeRide.status}</p>
                    </div>

                    {(activeRide.status === 'ACCEPTED' || activeRide.status === 'ARRIVED') && activeRide.otp && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            OTP to share with driver
                          </p>
                          <button
                            type="button"
                            onClick={copyOtp}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedOtp ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="mt-1 text-3xl font-bold tracking-[0.24em] text-emerald-700">{activeRide.otp}</p>
                      </div>
                    )}

                    <div className="space-y-2 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                      <p className="inline-flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                        <span>{activeRide.pickupAddress}</span>
                      </p>
                      <p className="inline-flex items-start gap-2">
                        <Navigation className="mt-0.5 h-4 w-4 text-slate-500" />
                        <span>{activeRide.dropAddress}</span>
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-slate-900">INR {activeRide.fare}</span>
                      </p>
                      <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${paymentTone[activeRide.paymentStatus || 'PENDING'] || paymentTone.PENDING}`}>
                        Payment {activeRide.paymentStatus || 'PENDING'}
                      </p>
                      {driverDistanceKm && (
                        <p className="inline-flex items-center gap-2 text-sky-700">
                          <Navigation className="h-4 w-4" />
                          Driver is {driverDistanceKm} km away
                        </p>
                      )}
                    </div>

                    {activeRide.driver && (
                      <div className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Driver Details</p>
                        <p className="mt-1">{activeRide.driver.name}</p>
                        <p className="inline-flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {activeRide.driver.phone}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {activeRide.driver.vehicleColor} {activeRide.driver.vehicleType} - {activeRide.driver.vehicleNumber}
                        </p>
                      </div>
                    )}

                    {(activeRide.status === 'REQUESTED' || activeRide.status === 'ACCEPTED') && (
                      <button
                        onClick={cancelRide}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Cancel Ride
                      </button>
                    )}

                    <button
                      onClick={() => setShowChat((prev) => !prev)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {showChat ? 'Hide Chat' : 'Chat with Driver'}
                    </button>

                    {showChat && (
                      <div className="rounded-2xl border border-slate-200 p-3">
                        <div className="mb-3 h-52 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2 text-sm">
                          {messages.length === 0 && <p className="px-1 py-2 text-slate-500">No messages yet.</p>}
                          {messages.map((msg) => (
                            <div
                              key={msg.id || `${msg.createdAt}-${msg.message}`}
                              className={`rounded-xl px-3 py-2 ${msg.senderRole === 'RIDER' ? 'ml-8 bg-sky-100 text-slate-800' : 'mr-8 border border-slate-200 bg-white text-slate-700'}`}
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
            <h2 className="text-lg font-bold text-slate-900">Ride History</h2>
            <p className="mt-1 text-sm text-slate-600">All payments are rider-side only. Completed ride totals are shown here.</p>

            <div className="mt-4 space-y-3">
              {rideHistory.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No rides found yet.</p>
              )}

              {rideHistory.map((ride) => {
                const effectivePaymentStatus = ride.status === 'CANCELLED'
                  ? 'NOT_REQUIRED'
                  : (ride.paymentStatus || 'PENDING');

                return (
                <div key={ride.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Ride #{ride.id}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{ride.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{formatDate(ride.requestedAt)}</p>
                  <p className="mt-2 text-sm text-slate-700">Pickup: {ride.pickupAddress}</p>
                  <p className="text-sm text-slate-700">Drop: {ride.dropAddress}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Fare: INR {ride.fare}</p>
                  <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentTone[effectivePaymentStatus] || paymentTone.PENDING}`}>
                    Payment {effectivePaymentStatus}
                  </p>
                </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {showBooking && (
        <div className="fixed inset-0 z-[1300] grid place-items-center bg-slate-900/55 p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Request Ride</p>
                <h3 className="text-2xl font-bold text-slate-900">Book without coordinates</h3>
                <p className="text-sm text-slate-600">Search address suggestions or tap on map to set pickup/drop.</p>
              </div>
              <button
                onClick={() => setShowBooking(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBookRide} className="space-y-4">
              <AddressAutocomplete
                label="Pickup address"
                placeholder="Search pickup location"
                value={bookingData.pickupAddress}
                onChange={(nextValue) =>
                  setBookingData((prev) => ({ ...prev, pickupAddress: nextValue, pickupLat: null, pickupLng: null }))
                }
                onSelect={(item) =>
                  setPickupFromSelection(parseFloat(item.lat), parseFloat(item.lon), item.display_name)
                }
              />

              <AddressAutocomplete
                label="Drop address"
                placeholder="Search drop location"
                value={bookingData.dropAddress}
                onChange={(nextValue) =>
                  setBookingData((prev) => ({ ...prev, dropAddress: nextValue, dropLat: null, dropLng: null }))
                }
                onSelect={(item) =>
                  setDropFromSelection(parseFloat(item.lat), parseFloat(item.lon), item.display_name)
                }
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Use current location for pickup
                </button>
                <button
                  type="button"
                  onClick={() => setBookingData((prev) => ({ ...prev, mapMode: 'pickup' }))}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    bookingData.mapMode === 'pickup'
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Map: set pickup
                </button>
                <button
                  type="button"
                  onClick={() => setBookingData((prev) => ({ ...prev, mapMode: 'drop' }))}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    bookingData.mapMode === 'drop'
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Map: set drop
                </button>
              </div>

              <div className="h-64 overflow-hidden rounded-2xl border border-slate-200">
                <MapContainer center={bookingMapCenter} zoom={13} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapUpdater center={bookingMapCenter} />
                  <BookingMapClick
                    mode={bookingData.mapMode}
                    onPickupSelect={setPickupFromSelection}
                    onDropSelect={setDropFromSelection}
                  />
                  {bookingData.pickupLat && bookingData.pickupLng && (
                    <Marker position={[bookingData.pickupLat, bookingData.pickupLng]}>
                      <Popup>Pickup point</Popup>
                    </Marker>
                  )}
                  {bookingData.dropLat && bookingData.dropLng && (
                    <Marker position={[bookingData.dropLat, bookingData.dropLng]}>
                      <Popup>Drop point</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowBooking(false)}
                  className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRide}
                  className="rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingRide ? 'Booking...' : 'Confirm Ride'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

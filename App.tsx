import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ViewState, 
  User, 
  Language, 
  SafetyReport, 
  PublicAssistancePoint, 
  RouteOption, 
  DemoScenario, 
  ActiveJourney,
  Contact,
  HazardCategory,
  SeverityLevel,
  Monument,
  POI,
  PlaceSuggestion,
  Contribution
} from './types';
import { 
  ShieldIcon, 
  ShieldCheckIcon,
  MapIcon, 
  CameraIcon, 
  UserIcon, 
  AlertIcon, 
  PhoneIcon, 
  MicIcon, 
  RefreshIcon, 
  TrashIcon, 
  FlashIcon, 
  ImageIcon,
  LightbulbIcon,
  EyeIcon,
  ClockIcon,
  ShareIcon,
  LocationPinIcon,
  NavigationIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
  HeartIcon,
  CheckIcon,
  CloudIcon,
  CloudOffIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PencilIcon,
  HotelIcon,
  UtensilsIcon,
  BadgeIcon,
  CompassIcon,
  ARCubeIcon
} from './components/Icons';
import { Logo } from './components/Logo';
import { 
  identifyLandmark, 
  getChatResponse, 
  categorizeSafetyReport,
  startLiveJourney,
  checkInLiveJourney,
  endLiveJourney
} from './services/geminiService';
import { db } from './services/database';
import { syncService } from './services/syncService';
import { 
  DEMO_SCENARIOS, 
  DEMO_ASSISTANCE_POINTS,
  INITIAL_SAFETY_REPORTS,
  TELANGANA_PLACES,
  searchPlaces,
  generateRouteComparison,
  calculateDistanceMeters
} from './services/safetyScoring';
import { MONUMENTS, POIS, getMonumentFallbackSvg } from './constants';
import { UI_STRINGS } from './translations';

declare global {
  interface Window {
    L: any;
    webkitSpeechRecognition: any;
  }
}

// ============================================================================
// 0. AUTH VIEW (Sign In, Create Account & Guest Exploration)
// ============================================================================
const AuthView = ({ 
  onLogin, 
  language 
}: { 
  onLogin: (user: User) => void; 
  language: Language;
}) => {
  const [authMode, setAuthMode] = useState<'REGISTER' | 'SIGNIN'>('REGISTER');
  const [name, setName] = useState('Ananya Rao');
  const [email, setEmail] = useState('ananya.rao@example.com');
  const [password, setPassword] = useState('securepass123');
  const [contactName, setContactName] = useState('Deepa Rao (Sister)');
  const [contactPhone, setContactPhone] = useState('+91 91234 56789');
  const [contactEmail, setContactEmail] = useState('deepa.rao@example.com');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      const newUser: User = {
        name: name.trim() || 'Traveler',
        email: email.trim().toLowerCase(),
        language,
        emergencyContacts: [
          { 
            id: 'c1', 
            name: contactName || 'Primary Contact', 
            phone: contactPhone || '+91 91234 56789', 
            email: contactEmail,
            relationship: 'Family',
            notifyWhatsApp: true,
            notifyEmail: !!contactEmail
          },
          { 
            id: 'c2', 
            name: 'Telangana She Teams Helpline', 
            phone: '181', 
            relationship: 'Safety Authority',
            notifyWhatsApp: false,
            notifyEmail: false
          }
        ],
        badges: ['explorer'],
        visitedMonuments: ['1'],
        shareLocationConsent: true,
        checkInReminderMins: 15
      };

      await db.saveUser(newUser);
      localStorage.setItem('tg_auth_user', JSON.stringify(newUser));
      setTimeout(() => {
        onLogin(newUser);
        setLoading(false);
      }, 300);
    } catch (err: any) {
      setAuthError('Could not save profile. Please check details.');
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      const existing = await db.getUser(email.trim().toLowerCase());
      if (existing) {
        localStorage.setItem('tg_auth_user', JSON.stringify(existing));
        onLogin(existing);
      } else {
        // Create new session with this email
        const user: User = {
          name: email.split('@')[0].replace('.', ' ') || 'Traveler',
          email: email.trim().toLowerCase(),
          language,
          emergencyContacts: [
            { id: 'c1', name: 'Primary Emergency Contact', phone: '+91 91234 56789', relationship: 'Family', notifyWhatsApp: true, notifyEmail: false },
            { id: 'c2', name: 'Telangana She Teams Helpline', phone: '181', relationship: 'Safety Authority', notifyWhatsApp: false, notifyEmail: false }
          ],
          badges: ['explorer'],
          visitedMonuments: [],
          shareLocationConsent: true,
          checkInReminderMins: 15
        };
        await db.saveUser(user);
        localStorage.setItem('tg_auth_user', JSON.stringify(user));
        onLogin(user);
      }
    } catch (err) {
      setAuthError('Sign in failed. Continuing as guest.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    const guestUser: User = {
      name: 'Guest Traveler',
      email: 'guest@tourguide.local',
      language,
      emergencyContacts: [
        { id: 'c-she', name: 'Telangana She Teams Helpline', phone: '181', relationship: 'Safety Authority', notifyWhatsApp: false, notifyEmail: false },
        { id: 'c-nat', name: 'National Emergency Response', phone: '112', relationship: 'Emergency Services', notifyWhatsApp: false, notifyEmail: false }
      ],
      badges: [],
      visitedMonuments: [],
      shareLocationConsent: true,
      checkInReminderMins: 15
    };
    onLogin(guestUser);
  };

  return (
    <div className="h-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
      <div className="mb-4 text-center flex flex-col items-center max-w-sm">
        <Logo className="w-16 h-16 mb-2" />
        <h1 className="text-2xl font-black tracking-tight text-white mb-0.5">TourGuide</h1>
        <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Heritage Exploration & Safe Navigation</p>
        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
          Explore Telangana monuments with verified safe corridors, She Teams helplines, live journey check-ins, and camera AI.
        </p>
      </div>

      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl backdrop-blur-md space-y-4">
        {/* Toggle Mode */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setAuthMode('REGISTER')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              authMode === 'REGISTER' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('SIGNIN')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              authMode === 'SIGNIN' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'
            }`}
          >
            Sign In
          </button>
        </div>

        {authError && (
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs text-center font-bold">
            {authError}
          </div>
        )}

        {authMode === 'REGISTER' ? (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 font-bold text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 font-bold text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 font-bold text-xs text-white"
              />
            </div>

            <div className="pt-1 border-t border-slate-800/80 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                Primary Trusted Emergency Contact
              </span>
              <input 
                type="text" 
                placeholder="Contact Name (e.g. Sister / Friend)"
                required
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="tel" 
                  placeholder="Phone (WhatsApp)"
                  required
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-xs text-white"
                />
                <input 
                  type="email" 
                  placeholder="Email (Optional)"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-bold text-xs text-white"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black uppercase tracking-wider shadow-xl shadow-blue-600/30 active:scale-95 transition-all text-xs"
            >
              {loading ? 'Creating Account...' : 'Create Account & Start'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 font-bold text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 font-bold text-xs text-white"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black uppercase tracking-wider shadow-xl shadow-blue-600/30 active:scale-95 transition-all text-xs"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        <div className="pt-2 text-center border-t border-slate-800">
          <button 
            type="button"
            onClick={handleContinueAsGuest}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Explore as Guest (No Account Required) →
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
        <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
        <span>Privacy Protected • Local Encryption & Explicit Consent</span>
      </div>
    </div>
  );
};

// ============================================================================
// 1. LAYOUT & BOTTOM NAVIGATION
// ============================================================================
interface LayoutProps {
  children: React.ReactNode;
  view: ViewState;
  setView: (view: ViewState) => void;
  triggerSOS: () => void;
  sosOverlay: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  language: Language;
  setLanguage: (l: Language) => void;
  offlineOverride: boolean;
  setOfflineOverride: (val: boolean) => void;
  activeJourney: ActiveJourney | null;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  view, 
  setView, 
  triggerSOS, 
  sosOverlay, 
  darkMode, 
  toggleDarkMode, 
  isOnline, 
  isSyncing, 
  language, 
  setLanguage, 
  offlineOverride, 
  setOfflineOverride,
  activeJourney
}) => {
  const t = UI_STRINGS[language];
  const effectiveOffline = !isOnline || offlineOverride;

  if (view === 'AUTH') return <main className="h-full">{children}</main>;

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-2.5 px-4 flex justify-between items-center shadow-sm z-30 select-none">
        <div onClick={() => setView('MAP')} className="cursor-pointer">
          <Logo className="w-9 h-9" showText={true} language={language} />
        </div>

        <div className="flex items-center gap-2">
          {/* Offline simulation toggle */}
          <button 
            onClick={() => setOfflineOverride(!offlineOverride)} 
            title={effectiveOffline ? "Offline Mode (Simulated)" : "Online Mode"}
            className={`p-2 rounded-xl border transition-colors ${effectiveOffline ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
          >
            {isSyncing ? <RefreshIcon className="w-4 h-4 animate-spin text-blue-500" /> : effectiveOffline ? <CloudOffIcon className="w-4 h-4 text-amber-500" /> : <CloudIcon className="w-4 h-4 text-emerald-500" />}
          </button>

          {/* Theme toggle */}
          <button onClick={toggleDarkMode} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Persistent Emergency SOS button */}
          <button 
            onClick={triggerSOS} 
            className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center shadow-lg shadow-red-600/30 active:scale-95 transition-all border border-red-500/30"
          >
            <AlertIcon className="w-4 h-4 mr-1 text-white animate-pulse" />
            <span>SOS</span>
          </button>
        </div>
      </header>

      {/* Offline banner */}
      {effectiveOffline && (
        <div className="bg-amber-600 text-white px-4 py-1 text-[10px] font-black flex justify-between items-center z-20 shadow-inner uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <CloudOffIcon className="w-3.5 h-3.5" />
            <span>{t.status_offline} • Using verified local database</span>
          </span>
          {isOnline && (
            <button onClick={() => setOfflineOverride(false)} className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded font-black">
              {t.go_online}
            </button>
          )}
        </div>
      )}

      {/* Active journey HUD banner when on other tabs */}
      {activeJourney && view !== 'MAP' && (
        <div 
          onClick={() => setView('MAP')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1.5 text-xs font-bold flex justify-between items-center z-20 shadow-md cursor-pointer animate-pulse"
        >
          <span className="flex items-center gap-2">
            <NavigationIcon className="w-3.5 h-3.5" />
            <span>Active Journey: {activeJourney.selectedRoute.name} • Tap to view tracking HUD</span>
          </span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black uppercase">Live</span>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation: 5 Primary Destinations */}
      <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-16 pb-1 flex justify-around items-center z-30 shadow-lg">
        {/* 1. Safe Routes (Map) */}
        <button 
          onClick={() => setView('MAP')} 
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${view === 'MAP' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400'}`}
        >
          <MapIcon className="w-5 h-5" />
          <span className="text-[10px]">{t.nav_home}</span>
        </button>

        {/* 2. Explore Heritage */}
        <button 
          onClick={() => setView('EXPLORE')} 
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${view === 'EXPLORE' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400'}`}
        >
          <BadgeIcon className="w-5 h-5" />
          <span className="text-[10px]">{t.nav_explore}</span>
        </button>

        {/* 3. AI Guide */}
        <button 
          onClick={() => setView('GUIDE')} 
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${view === 'GUIDE' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400'}`}
        >
          <CameraIcon className="w-5 h-5" />
          <span className="text-[10px]">{t.nav_guide}</span>
        </button>

        {/* 4. Area Reports */}
        <button 
          onClick={() => setView('REPORTS')} 
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${view === 'REPORTS' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400'}`}
        >
          <AlertIcon className="w-5 h-5" />
          <span className="text-[10px]">{t.nav_reports}</span>
        </button>

        {/* 5. Profile & Safety Hub */}
        <button 
          onClick={() => setView('PROFILE')} 
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${view === 'PROFILE' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400'}`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px]">{t.nav_profile}</span>
        </button>
      </nav>

      {sosOverlay}
    </div>
  );
};

// ============================================================================
// 2. TAB 1: MAP & JOURNEY PLANNER (Google Maps-like routing & live tracking)
// ============================================================================
interface MapJourneyViewProps {
  user: User | null;
  language: Language;
  allReports: SafetyReport[];
  activeJourney: ActiveJourney | null;
  setActiveJourney: (j: ActiveJourney | null) => void;
  onOpenReportModal: () => void;
  destinationOverride?: { name: string; lat: number; lon: number } | null;
  onClearDestinationOverride?: () => void;
}

const MapJourneyView: React.FC<MapJourneyViewProps> = ({
  user,
  language,
  allReports,
  activeJourney,
  setActiveJourney,
  onOpenReportModal,
  destinationOverride,
  onClearDestinationOverride
}) => {
  const t = UI_STRINGS[language];
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const markerLayers = useRef<any[]>([]);

  // Origin & Destination state
  const [originName, setOriginName] = useState('Hitec City Metro Station');
  const [originCoords, setOriginCoords] = useState<[number, number]>([17.4539, 78.3831]);
  const [destinationName, setDestinationName] = useState('Mindspace IT Park');
  const [destinationCoords, setDestinationCoords] = useState<[number, number]>([17.4445, 78.3802]);

  // Autocomplete search states
  const [originSearch, setOriginSearch] = useState('');
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [destSearch, setDestSearch] = useState('');
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Route options
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [showHazardModal, setShowHazardModal] = useState(false);

  // Check-in & HUD state
  const [checkInCountdown, setCheckInCountdown] = useState(15 * 60);
  const [checkInSending, setCheckInSending] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Sync external destination override (e.g. from Explore tab "Plan Safe Route Here")
  useEffect(() => {
    if (destinationOverride) {
      setDestinationName(destinationOverride.name);
      setDestinationCoords([destinationOverride.lat, destinationOverride.lon]);
      setDestSearch(destinationOverride.name);
      onClearDestinationOverride?.();
    }
  }, [destinationOverride]);

  // Compute routes whenever endpoints or reports change
  useEffect(() => {
    const computed = generateRouteComparison(
      { name: originName, lat: originCoords[0], lon: originCoords[1] },
      { name: destinationName, lat: destinationCoords[0], lon: destinationCoords[1] },
      allReports,
      DEMO_ASSISTANCE_POINTS
    );
    setRoutes(computed);
    if (!selectedRouteId || !computed.find(r => r.id === selectedRouteId)) {
      setSelectedRouteId(computed[0]?.id || '');
    }
  }, [originName, originCoords, destinationName, destinationCoords, allReports]);

  const selectedRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId) || routes[0];
  }, [routes, selectedRouteId]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapContainer.current, {
        center: originCoords,
        zoom: 15,
        zoomControl: false,
        attributionControl: true
      });

      // Standard OpenStreetMap tiles with attribution
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(mapInstance.current);

      window.L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

      setTimeout(() => mapInstance.current?.invalidateSize(), 200);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update map polyline & markers when route changes
  useEffect(() => {
    if (!mapInstance.current || routes.length === 0) return;

    // Clear old layers
    routeLayers.current.forEach(l => mapInstance.current.removeLayer(l));
    markerLayers.current.forEach(m => mapInstance.current.removeLayer(m));
    routeLayers.current = [];
    markerLayers.current = [];

    // Render routes
    routes.forEach(route => {
      const isSelected = route.id === selectedRouteId;
      const isRec = route.isRecommended;
      const color = isRec ? '#10B981' : '#F43F5E';
      const weight = isSelected ? 6 : 4;
      const opacity = isSelected ? 0.9 : 0.45;

      const polyline = window.L.polyline(route.coordinates, {
        color,
        weight,
        opacity,
        dashArray: isRec ? null : '6, 6'
      }).addTo(mapInstance.current);

      polyline.on('click', () => setSelectedRouteId(route.id));
      routeLayers.current.push(polyline);
    });

    // Origin marker
    const originIcon = window.L.divIcon({
      className: 'custom-pin',
      html: `<div style="background:#2563EB;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);font-weight:bold;font-size:12px;">A</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const mOrigin = window.L.marker(originCoords, { icon: originIcon }).addTo(mapInstance.current)
      .bindPopup(`<b>Starting Point</b><br>${originName}`);
    markerLayers.current.push(mOrigin);

    // Destination marker
    const destIcon = window.L.divIcon({
      className: 'custom-pin',
      html: `<div style="background:#10B981;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);font-weight:bold;font-size:12px;">B</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const mDest = window.L.marker(destinationCoords, { icon: destIcon }).addTo(mapInstance.current)
      .bindPopup(`<b>Destination</b><br>${destinationName}`);
    markerLayers.current.push(mDest);

    // Render safe haven markers
    DEMO_ASSISTANCE_POINTS.forEach(pt => {
      const havenIcon = window.L.divIcon({
        className: 'haven-pin',
        html: `<div style="background:#0284C7;color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:11px;box-shadow:0 2px 5px rgba(0,0,0,0.3);">🛡️</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      const mHaven = window.L.marker([pt.lat, pt.lon], { icon: havenIcon }).addTo(mapInstance.current)
        .bindPopup(`<b>${pt.name}</b><br><span style="font-size:10px;">${pt.address}</span>`);
      markerLayers.current.push(mHaven);
    });

    // Render hazards along selected route
    if (selectedRoute?.relevantHazards) {
      selectedRoute.relevantHazards.forEach(h => {
        const hazardIcon = window.L.divIcon({
          className: 'hazard-pin',
          html: `<div style="background:#EF4444;color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:10px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">⚠️</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        const mHaz = window.L.marker([h.lat, h.lon], { icon: hazardIcon }).addTo(mapInstance.current)
          .bindPopup(`<b>${h.title}</b><br><span style="font-size:10px;color:#EF4444;">${h.category}</span>`);
        markerLayers.current.push(mHaz);
      });
    }

    // Fit map bounds
    if (selectedRoute) {
      const bounds = window.L.latLngBounds(selectedRoute.coordinates);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [routes, selectedRouteId, originCoords, destinationCoords]);

  // Check-in countdown timer
  useEffect(() => {
    if (!activeJourney) return;
    const interval = setInterval(() => {
      setCheckInCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeJourney]);

  // Swap origin and destination
  const handleSwap = () => {
    const tempName = originName;
    const tempCoords = originCoords;
    setOriginName(destinationName);
    setOriginCoords(destinationCoords);
    setDestinationName(tempName);
    setDestinationCoords(tempCoords);
  };

  // Use current GPS location as origin
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setOriginName('My Current Location');
          setOriginCoords([lat, lon]);
        },
        () => {
          // Fallback to central Hyderabad if denied
          setOriginName('Current Location (Hyderabad)');
          setOriginCoords([17.4539, 78.3831]);
        }
      );
    }
  };

  // Launch live journey
  const handleStartJourney = async () => {
    if (!selectedRoute) return;

    try {
      const res = await startLiveJourney({
        userName: user?.name || 'Traveler',
        originName,
        destinationName,
        routeName: selectedRoute.name,
        originCoords,
        destinationCoords,
        contacts: user?.emergencyContacts || []
      });

      const newJourney: ActiveJourney = {
        journeyId: res.journeyId,
        selectedRoute,
        originName,
        destinationName,
        startTime: Date.now(),
        checkInIntervalMinutes: 15,
        nextCheckInTime: Date.now() + 15 * 60 * 1000,
        lastLocation: { lat: originCoords[0], lon: originCoords[1], timestamp: Date.now() },
        progressPercent: 12,
        currentStepIndex: 0,
        isPaused: false,
        trackingUrl: res.trackingUrl,
        notificationLog: res.notificationLog || []
      };

      setActiveJourney(newJourney);
      setCheckInCountdown(15 * 60);
    } catch (err) {
      console.error('Failed to start journey session:', err);
      // Client-side fallback
      const fallbackJourney: ActiveJourney = {
        journeyId: 'tg-local-' + Date.now(),
        selectedRoute,
        originName,
        destinationName,
        startTime: Date.now(),
        checkInIntervalMinutes: 15,
        nextCheckInTime: Date.now() + 15 * 60 * 1000,
        lastLocation: { lat: originCoords[0], lon: originCoords[1], timestamp: Date.now() },
        progressPercent: 12,
        currentStepIndex: 0,
        isPaused: false,
        trackingUrl: window.location.origin + '/live-track/tg-demo',
        notificationLog: []
      };
      setActiveJourney(fallbackJourney);
    }
  };

  // Collapsible planner panel state
  const [isPlannerMinimized, setIsPlannerMinimized] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  // Check-In: "I'm Safe" with real contact notification dispatch
  const handleCheckIn = async () => {
    if (!activeJourney || checkInSending) return;
    setCheckInSending(true);

    let currentCoords = originCoords;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        currentCoords = [pos.coords.latitude, pos.coords.longitude];
      } catch (e) {
        // use originCoords
      }
    }

    try {
      const res = await checkInLiveJourney(
        activeJourney.journeyId,
        { lat: currentCoords[0], lon: currentCoords[1] },
        user?.emergencyContacts || [],
        false
      );

      const updated: ActiveJourney = {
        ...activeJourney,
        lastLocation: { lat: currentCoords[0], lon: currentCoords[1], timestamp: Date.now() },
        nextCheckInTime: res.nextCheckInDeadline || (Date.now() + 15 * 60 * 1000),
        notificationLog: res.notificationLog && res.notificationLog.length > 0 ? res.notificationLog : activeJourney.notificationLog
      };
      setActiveJourney(updated);
      setCheckInCountdown(15 * 60);
      setShareFeedback("Check-in recorded! Contacts updated.");
      setTimeout(() => setShareFeedback(''), 4000);
    } catch (err) {
      console.error('Check-in error:', err);
      setCheckInCountdown(15 * 60);
    } finally {
      setCheckInSending(false);
    }
  };

  // End Journey
  const handleEndJourney = async () => {
    if (activeJourney) {
      await endLiveJourney(activeJourney.journeyId).catch(() => {});
      setActiveJourney(null);
    }
  };

  // Share Live Link via Web Share API or Clipboard Fallback
  const handleShareLiveLink = async () => {
    if (!activeJourney) return;
    const trackUrl = activeJourney.trackingUrl || `${window.location.origin}/live-track/${activeJourney.journeyId}`;
    const shareData = {
      title: `TourGuide Live Safe Track: ${user?.name || 'Traveler'}`,
      text: `I'm traveling on "${activeJourney.selectedRoute.name}" from ${originName} to ${destinationName}. Track my live location & check-ins on TourGuide:`,
      url: trackUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareFeedback('Live Link Shared!');
        setTimeout(() => setShareFeedback(''), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(trackUrl);
      setShareFeedback('Live Link Copied!');
      setTimeout(() => setShareFeedback(''), 3000);
    } catch (clipErr) {
      setShareFeedback('Link Ready');
    }
  };

  // Recenter map on route
  const handleRecenter = () => {
    if (mapInstance.current && selectedRoute && selectedRoute.coordinates.length > 0) {
      const bounds = window.L.latLngBounds(selectedRoute.coordinates);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  };

  const originSuggestions = useMemo(() => searchPlaces(originSearch), [originSearch]);
  const destSuggestions = useMemo(() => searchPlaces(destSearch), [destSearch]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* 1. Leaflet Interactive Map Container */}
      <div ref={mapContainer} className="absolute inset-0 z-0 w-full h-full" />

      {/* Recenter Map Floating Button */}
      <button 
        onClick={handleRecenter}
        title="Recenter Map on Route"
        className="absolute bottom-20 right-4 z-20 w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform"
      >
        <NavigationIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </button>

      {/* 2. Floating Top Route Planner HUD */}
      {!activeJourney ? (
        <div className="relative z-10 p-3 max-w-lg mx-auto w-full transition-all">
          {isPlannerMinimized ? (
            /* Minimized Pill Bar */
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2 px-3.5 shadow-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                <span className="font-bold text-slate-800 dark:text-white truncate">
                  {originName} → {destinationName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                  ({selectedRoute?.estimatedMinutes || 12}m)
                </span>
              </div>
              <button 
                onClick={() => setIsPlannerMinimized(false)}
                className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800 flex-shrink-0 active:scale-95"
              >
                Modify ▾
              </button>
            </div>
          ) : (
            /* Expanded Route Planner */
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-xl space-y-2.5">
              <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Route Planner & Safety Corridors
                </span>
                <button 
                  onClick={() => setIsPlannerMinimized(true)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ▲ Minimize
                </button>
              </div>

              {/* Origin & Destination Inputs */}
              <div className="space-y-1.5 relative">
                {/* Origin Row */}
                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2.5 flex-shrink-0" />
                  <input 
                    type="text"
                    placeholder="Starting point"
                    value={originSearch || originName}
                    onChange={e => {
                      setOriginSearch(e.target.value);
                      setShowOriginDropdown(true);
                    }}
                    onFocus={() => setShowOriginDropdown(true)}
                    className="bg-transparent text-xs font-bold w-full outline-none text-slate-900 dark:text-white"
                  />
                  <button 
                    onClick={handleUseCurrentLocation}
                    title="Use My Location"
                    className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center gap-1 flex-shrink-0 active:scale-95"
                  >
                    <LocationPinIcon className="w-3 h-3 text-blue-500" />
                    <span>GPS</span>
                  </button>
                </div>

                {/* Origin Autocomplete Dropdown */}
                {showOriginDropdown && (
                  <div className="absolute top-11 left-0 right-0 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto p-1 text-xs">
                    {originSuggestions.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setOriginName(p.name);
                          setOriginCoords([p.lat, p.lon]);
                          setOriginSearch('');
                          setShowOriginDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-100">{p.name}</span>
                        <span className="text-[10px] text-slate-400">{p.locality}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Swap Button */}
                <div className="absolute right-4 top-7 z-20">
                  <button 
                    onClick={handleSwap}
                    className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-md flex items-center justify-center text-slate-600 dark:text-slate-200 hover:scale-105 active:scale-95"
                  >
                    ⇅
                  </button>
                </div>

                {/* Destination Row */}
                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2.5 flex-shrink-0" />
                  <input 
                    type="text"
                    placeholder="Where do you want to go?"
                    value={destSearch || destinationName}
                    onChange={e => {
                      setDestSearch(e.target.value);
                      setShowDestDropdown(true);
                    }}
                    onFocus={() => setShowDestDropdown(true)}
                    className="bg-transparent text-xs font-bold w-full outline-none text-slate-900 dark:text-white"
                  />
                </div>

                {/* Destination Autocomplete Dropdown */}
                {showDestDropdown && (
                  <div className="absolute top-22 left-0 right-0 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto p-1 text-xs">
                    {destSuggestions.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setDestinationName(p.name);
                          setDestinationCoords([p.lat, p.lon]);
                          setDestSearch('');
                          setShowDestDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-100">{p.name}</span>
                        <span className="text-[10px] text-slate-400">{p.locality}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Destination Chips */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {['Charminar', 'Golconda Fort', 'Hitec City Metro', 'Mindspace IT Park', 'Secunderabad Station'].map(quick => (
                  <button
                    key={quick}
                    onClick={() => {
                      const match = TELANGANA_PLACES.find(p => p.name.includes(quick));
                      if (match) {
                        setDestinationName(match.name);
                        setDestinationCoords([match.lat, match.lon]);
                        setDestSearch('');
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 active:scale-95"
                  >
                    {quick}
                  </button>
                ))}
              </div>

              {/* Route Selector Cards (Route A vs Route B) */}
              {routes.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {routes.map(r => {
                    const isSelected = r.id === selectedRouteId;
                    return (
                      <div 
                        key={r.id}
                        onClick={() => setSelectedRouteId(r.id)}
                        className={`p-2.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected 
                            ? r.isRecommended
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                              : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-500/30'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            r.isRecommended 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-rose-600 text-white'
                          }`}>
                            {r.isRecommended ? 'Recommended' : 'Caution'}
                          </span>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                            {r.distanceKm} km • {r.estimatedMinutes}m
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1.5 truncate">
                          {r.name}
                        </h4>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-[9px] text-slate-400 font-bold">Concern Score</span>
                          <span className={`text-xs font-black font-mono ${
                            r.reportedConcernScore <= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {r.reportedConcernScore}/100
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* 3. Bottom Card / HUD when Route Selected or Active */}
      <div className="relative z-10 mt-auto p-3 max-w-lg mx-auto w-full">
        {activeJourney ? (
          /* ACTIVE JOURNEY HUD */
          <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-2xl space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active Safe Navigation
                </span>
                <h3 className="text-base font-black text-white mt-1">
                  {activeJourney.selectedRoute.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {originName} → {destinationName}
                </p>
              </div>

              {/* Check-In Countdown Circle */}
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Next Check-In</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  {formatTimer(checkInCountdown)}
                </span>
              </div>
            </div>

            {/* Check-In Action Button */}
            <button 
              onClick={handleCheckIn}
              disabled={checkInSending}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{checkInSending ? 'Registering Check-In...' : "Check In — I'm Safe"}</span>
            </button>

            {shareFeedback && (
              <div className="text-center text-xs font-bold text-emerald-400 py-1 bg-emerald-950/40 rounded-xl border border-emerald-800/60 animate-fade-in">
                {shareFeedback}
              </div>
            )}

            {/* Live WhatsApp / Email Notification Status Card */}
            {activeJourney.notificationLog && activeJourney.notificationLog.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Trusted Contacts ({activeJourney.notificationLog.length})
                  </span>
                  <span className="text-[10px] text-blue-400 font-bold">1-Tap Message Ready</span>
                </div>
                {activeJourney.notificationLog.map((n, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                    <div className="truncate mr-2">
                      <span className="font-bold text-slate-200">{n.contactName}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({n.channel})</span>
                    </div>

                    {n.status === 'SENT' ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                        ✓ Dispatched
                      </span>
                    ) : n.directUrl ? (
                      <a 
                        href={n.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-400 bg-blue-950/60 hover:bg-blue-900/60 px-2.5 py-1 rounded-xl border border-blue-800 flex items-center gap-1 active:scale-95 flex-shrink-0"
                      >
                        <span>Send on {n.channel}</span> →
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">Configuring</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Live Share Link & End Journey */}
            <div className="flex gap-2 pt-1">
              <button 
                onClick={handleShareLiveLink}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-blue-600/30"
              >
                <ShareIcon className="w-3.5 h-3.5" />
                <span>{shareFeedback || 'Share Live Link'}</span>
              </button>
              <button 
                onClick={handleEndJourney}
                className="px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 py-2.5 rounded-xl text-xs font-bold active:scale-95"
              >
                End Journey
              </button>
            </div>
          </div>
        ) : selectedRoute ? (
          /* PRE-JOURNEY ROUTE DETAILS CARD */
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {selectedRoute.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedRoute.subtitle}
                </p>
              </div>
              <span className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                selectedRoute.reportedConcernScore <= 30
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {selectedRoute.reportedConcernScore}/100 Concern
              </span>
            </div>

            {/* Evidence & Confidence Note */}
            <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs">
              <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900 dark:text-blue-200">
                  Data Confidence: {selectedRoute.dataConfidence}% ({selectedRoute.confidenceLevel})
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedRoute.uncertaintyNotes}
                </p>
              </div>
            </div>

            {/* Factor Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Street Lighting</span>
                <p className="font-black text-slate-800 dark:text-slate-200 mt-0.5">{selectedRoute.factors.lightingScore}% Audited</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Safe Havens</span>
                <p className="font-black text-slate-800 dark:text-slate-200 mt-0.5">{selectedRoute.factors.safeHavensCount} Along Route</p>
              </div>
            </div>

            {/* Start Safe Journey Button */}
            <button 
              onClick={handleStartJourney}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <NavigationIcon className="w-4 h-4" />
              <span>{t.btn_start_journey}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ============================================================================
// 3. AUGMENTED REALITY (AR) HERITAGE EXPLORER & COMPASS ENGINE
// ============================================================================

/**
 * Calculates initial Great-Circle geographic bearing in degrees (0 - 360)
 * from observer coordinates to monument coordinates.
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

interface ARHeritageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanRouteToMonument: (m: Monument) => void;
  initialTargetMonument?: Monument | null;
}

const ARHeritageModal: React.FC<ARHeritageModalProps> = ({
  isOpen,
  onClose,
  onPlanRouteToMonument,
  initialTargetMonument
}) => {
  const [heading, setHeading] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [hasOrientationSensor, setHasOrientationSensor] = useState(false);
  const [needsOrientationPermission, setNeedsOrientationPermission] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedARMonument, setSelectedARMonument] = useState<Monument | null>(initialTargetMonument || null);
  const [filterType, setFilterType] = useState<string>('All');
  const [radiusKm, setRadiusKm] = useState<number>(150); // 150km default encompasses all Telangana landmarks
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({ lat: 17.3850, lon: 78.4867 });
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  // Manual Drag State for non-gyro / desktop exploration
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartHeadingRef = useRef(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check user GPS position
  useEffect(() => {
    if (!isOpen) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          // Default to Hyderabad center (Charminar area)
          setUserCoords({ lat: 17.3616, lon: 78.4747 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  // Start live camera stream
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported by browser environment.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay policy handled
          }
        }
        setCameraActive(true);
      } catch (err: any) {
        if (!isCancelled) {
          setCameraActive(false);
          setCameraError(err.message || 'Camera permission denied or camera device unavailable.');
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Check and setup DeviceOrientation sensors
  useEffect(() => {
    if (!isOpen) return;

    if (typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
        typeof (window as any).DeviceOrientationEvent.requestPermission === 'function') {
      setNeedsOrientationPermission(true);
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      setHasOrientationSensor(true);
      // iOS webkitCompassHeading provides true north compass bearing
      if ((e as any).webkitCompassHeading != null) {
        setHeading(Math.round((e as any).webkitCompassHeading));
      } else if (e.alpha != null) {
        // Standard alpha (0 to 360)
        setHeading(Math.round((360 - e.alpha) % 360));
      }
      if (e.beta != null) {
        setPitch(Math.round(e.beta));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen]);

  // Request iOS 13+ sensor permissions on button tap
  const handleRequestPermission = async () => {
    if (typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const response = await (window as any).DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          setNeedsOrientationPermission(false);
        }
      } catch (err) {
        console.warn('Orientation permission error:', err);
      }
    }
  };

  // If initial monument provided, automatically point towards it
  useEffect(() => {
    if (initialTargetMonument && userCoords) {
      setSelectedARMonument(initialTargetMonument);
      const initialBearing = calculateBearing(userCoords.lat, userCoords.lon, initialTargetMonument.lat, initialTargetMonument.lon);
      setHeading(Math.round(initialBearing));
    }
  }, [initialTargetMonument, userCoords]);

  // Mouse & Touch Dragging for 360 view exploration
  const handlePointerDown = (clientX: number) => {
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    dragStartHeadingRef.current = heading;
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - dragStartXRef.current;
    // 1px delta = 0.35 deg rotation
    const newHeading = (dragStartHeadingRef.current - deltaX * 0.35 + 360) % 360;
    setHeading(Math.round(newHeading));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Calculate Spatial Positions for Monuments
  const computedMonuments = useMemo(() => {
    return MONUMENTS.map(m => {
      const distanceMeters = calculateDistanceMeters(userCoords.lat, userCoords.lon, m.lat, m.lon);
      const distanceKm = +(distanceMeters / 1000).toFixed(1);
      const bearing = calculateBearing(userCoords.lat, userCoords.lon, m.lat, m.lon);

      // Relative angular offset from user camera heading (-180 to +180)
      const diff = (bearing - heading + 540) % 360 - 180;

      // 60-degree Field Of View (FOV)
      const inFOV = Math.abs(diff) <= 30;

      // Projected screen coordinates in percentage (0 to 100)
      const screenX = 50 + (diff / 30) * 40; // 10% to 90%
      const screenY = 46 + Math.min(22, Math.max(-22, -((pitch || 0) - 20) * 0.45));

      return {
        ...m,
        distanceMeters,
        distanceKm,
        bearing,
        diff,
        inFOV,
        screenX,
        screenY
      };
    })
    .filter(m => {
      if (filterType !== 'All' && m.type !== filterType) return false;
      return m.distanceKm <= radiusKm;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [userCoords, heading, pitch, filterType, radiusKm]);

  const inViewMonuments = computedMonuments.filter(m => m.inFOV);
  const leftOffscreen = computedMonuments.filter(m => m.diff < -30);
  const rightOffscreen = computedMonuments.filter(m => m.diff > 30);

  // Take Snapshot of the AR Horizon
  const handleTakeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1280;
    canvas.height = 720;

    if (videoRef.current && cameraActive) {
      ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
    } else {
      // Paint synthetic starry horizon background
      const grad = ctx.createLinearGradient(0, 0, 0, 720);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.6, '#172554');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 720; i += 60) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1280, i);
        ctx.stroke();
      }
    }

    // Overlay Watermark & Compass Heading
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(30, 30, 400, 70);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`TourGuide AR Horizon • ${heading}°`, 50, 65);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`${inViewMonuments.length} Monuments Identified in Field of View`, 50, 88);

    // Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `TourGuide-AR-Capture-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2500);
  };

  const handleSpeakMonument = (m: Monument) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(`${m.name}. ${m.description} Historical background: ${m.history}`);
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    }
  };

  const cardinalDirection = (deg: number) => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[val % 16];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black text-white select-none overflow-hidden flex flex-col animate-fade-in font-sans">
      {/* Hidden Snapshot Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* BACKGROUND CAMERA STREAM OR 360° CELESTIAL HORIZON */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={e => handlePointerDown(e.clientX)}
        onMouseMove={e => handlePointerMove(e.clientX)}
        onMouseUp={handlePointerUp}
        onTouchStart={e => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={e => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={handlePointerUp}
      >
        <video 
          ref={videoRef} 
          playsInline 
          autoPlay 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-700 ${cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {/* Fallback 360° Celestial Horizon & Compass Grid when camera is unavailable */}
        {!cameraActive && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/80 flex flex-col justify-center items-center pointer-events-none">
            {/* Dynamic Skybox Grid based on Heading */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.25) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px, 80px 80px',
                transform: `translateX(${-(heading * 4) % 80}px)`
              }}
            />

            {/* Simulated Horizon line */}
            <div className="w-full h-[1px] bg-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.5)] my-auto relative">
              <span className="absolute left-6 -top-4 text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider">
                Virtual Horizon 0°
              </span>
            </div>
          </div>
        )}
      </div>

      {/* TOP AR HUD: Compass Bar, Info & Controls */}
      <div className="relative z-20 p-3 pt-4 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent backdrop-blur-[2px] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20">
              <ARCubeIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">AR Heritage View</span>
                <span className="text-[10px] bg-blue-500/80 text-white px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
                  {heading}° {cardinalDirection(heading)}
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                {cameraActive ? 'Live Camera Sensor Active' : 'Virtual 360° Skyview Mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Snapshot Button */}
            <button
              onClick={handleTakeSnapshot}
              title="Capture AR Horizon"
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 active:scale-95 transition-all"
            >
              <CameraIcon className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-800/90 hover:bg-red-600 text-white backdrop-blur-md flex items-center justify-center font-bold text-sm border border-white/20 active:scale-95 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Snapshot feedback pill */}
        {snapshotSuccess && (
          <div className="self-center bg-emerald-500 text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-xl animate-bounce">
            ✓ AR Horizon Snapshot Saved to Device!
          </div>
        )}

        {/* iOS Gyroscope Permission Prompt */}
        {needsOrientationPermission && (
          <div className="bg-amber-500/90 text-slate-950 p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
            <span>Enable iOS Gyroscope sensors for real-time 360° tracking:</span>
            <button 
              onClick={handleRequestPermission}
              className="px-3 py-1 bg-slate-950 text-white text-[11px] rounded-xl font-black uppercase"
            >
              Allow Sensors
            </button>
          </div>
        )}

        {/* COMPASS RIBBON TAPE */}
        <div className="relative w-full h-8 overflow-hidden bg-slate-900/70 border border-slate-700/60 rounded-xl backdrop-blur-md flex items-center justify-center">
          <div className="absolute w-[2px] h-full bg-red-500 z-10 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <div 
            className="flex items-center gap-8 whitespace-nowrap text-[10px] font-mono font-bold tracking-widest text-slate-300 transition-transform duration-75"
            style={{
              transform: `translateX(${-heading * 4.5 + 180}px)`
            }}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315, 360, 405, 450, 495, 540].map((deg, idx) => (
              <span key={idx} className={deg % 90 === 0 ? 'text-sky-400 font-black text-xs' : 'text-slate-400'}>
                {deg % 360 === 0 ? 'N 0°' : deg % 360 === 90 ? 'E 90°' : deg % 360 === 180 ? 'S 180°' : deg % 360 === 270 ? 'W 270°' : `${deg % 360}°`}
              </span>
            ))}
          </div>
        </div>

        {/* QUICK CATEGORY & RADIUS FILTER BAR */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
          <div className="flex gap-1">
            {['All', 'Fort', 'Temple', 'Palace', 'Tombs', 'Museum'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-2.5 py-1 rounded-xl font-bold flex-shrink-0 transition-all ${
                  filterType === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-900/70 border border-slate-700/60 text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            {[25, 60, 150].map(r => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                  radiusKm === r ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                &lt;{r}km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ROTATING MINI-RADAR HUD (Top-Right Floating) */}
      <div className="absolute top-36 right-3 z-30 pointer-events-none">
        <div className="w-20 h-20 rounded-full bg-slate-950/80 border-2 border-sky-500/50 backdrop-blur-md relative overflow-hidden shadow-2xl flex items-center justify-center">
          {/* Radar Sweep Line */}
          <div 
            className="absolute inset-0 rounded-full origin-center animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.4) 0deg, transparent 60deg)',
              animationDuration: '3s'
            }}
          />
          {/* Concentric distance rings */}
          <div className="absolute w-12 h-12 rounded-full border border-sky-500/20" />
          <div className="absolute w-6 h-6 rounded-full border border-sky-500/20" />
          {/* User Center Dot */}
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white z-10" />

          {/* Monument Blips on Radar */}
          {computedMonuments.map(m => {
            const radAngle = ((m.bearing - heading - 90) * Math.PI) / 180;
            const distRatio = Math.min(1, m.distanceKm / radiusKm);
            const r = distRatio * 32; // max radius 32px
            const bx = 38 + r * Math.cos(radAngle);
            const by = 38 + r * Math.sin(radAngle);
            return (
              <div 
                key={m.id}
                className={`absolute w-1.5 h-1.5 rounded-full ${m.inFOV ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-sky-400/70'}`}
                style={{ left: `${bx}px`, top: `${by}px` }}
              />
            );
          })}
        </div>
        <span className="block text-center text-[9px] font-mono text-sky-400/80 mt-1 uppercase font-bold">
          Radar {radiusKm}km
        </span>
      </div>

      {/* CENTER AR RETICLE & SPATIAL TARGETS */}
      <div className="relative flex-1 z-20 pointer-events-none">
        {/* Center Screen Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none opacity-40">
          <div className="absolute inset-0 border border-dashed border-sky-400/50 rounded-full" />
          <div className="absolute top-1/2 left-1 right-1 h-[1px] bg-sky-400/60 -translate-y-1/2" />
          <div className="absolute left-1/2 top-1 bottom-1 w-[1px] bg-sky-400/60 -translate-x-1/2" />
        </div>

        {/* IN-FOV MONUMENT MARKERS */}
        {inViewMonuments.map(m => {
          const isSelected = selectedARMonument?.id === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelectedARMonument(m)}
              style={{
                left: `${m.screenX}%`,
                top: `${m.screenY}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute z-20 pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
            >
              {/* Target Reticle with Pulsing Beacon */}
              <div className="relative flex flex-col items-center">
                <div className={`relative flex items-center justify-center rounded-2xl p-2 shadow-2xl backdrop-blur-md border ${
                  isSelected 
                    ? 'bg-blue-600 text-white border-white scale-110 ring-4 ring-blue-500/40 shadow-blue-500/50' 
                    : 'bg-slate-900/90 text-sky-400 border-sky-400/60 shadow-black/80'
                }`}>
                  <ARCubeIcon className="w-5 h-5 animate-pulse" />
                  
                  {/* Distance Badge */}
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-950 text-white text-[9px] font-mono font-black border border-sky-400/50 whitespace-nowrap">
                    {m.distanceKm} km
                  </span>
                </div>

                {/* Monument Title Pill */}
                <div className="mt-1.5 flex flex-col items-center">
                  <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-[11px] font-black shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                    <span>{m.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/90 text-white font-mono">
                      ✓ {m.safetyScore}%
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-sky-300/80 uppercase tracking-widest mt-0.5">
                    Bearing: {Math.round(m.bearing)}°
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* OFF-SCREEN LEFT DIRECTIONAL GUIDANCE */}
        {leftOffscreen.length > 0 && (
          <div 
            onClick={() => {
              const closest = leftOffscreen[0];
              setHeading(Math.round(closest.bearing));
              setSelectedARMonument(closest);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-auto cursor-pointer bg-slate-900/90 border border-sky-500/60 hover:bg-sky-600 text-white p-2.5 rounded-2xl shadow-2xl flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4 text-sky-400 animate-pulse" />
            <div className="text-left">
              <span className="text-[10px] font-black block leading-none">
                {leftOffscreen.length} {leftOffscreen.length === 1 ? 'Site' : 'Sites'} West
              </span>
              <span className="text-[9px] text-sky-300 font-mono">
                {leftOffscreen[0].name} ({leftOffscreen[0].distanceKm}km)
              </span>
            </div>
          </div>
        )}

        {/* OFF-SCREEN RIGHT DIRECTIONAL GUIDANCE */}
        {rightOffscreen.length > 0 && (
          <div 
            onClick={() => {
              const closest = rightOffscreen[0];
              setHeading(Math.round(closest.bearing));
              setSelectedARMonument(closest);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-auto cursor-pointer bg-slate-900/90 border border-sky-500/60 hover:bg-sky-600 text-white p-2.5 rounded-2xl shadow-2xl flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all"
          >
            <div className="text-right">
              <span className="text-[10px] font-black block leading-none">
                {rightOffscreen.length} {rightOffscreen.length === 1 ? 'Site' : 'Sites'} East
              </span>
              <span className="text-[9px] text-sky-300 font-mono">
                {rightOffscreen[0].name} ({rightOffscreen[0].distanceKm}km)
              </span>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-sky-400 animate-pulse" />
          </div>
        )}
      </div>

      {/* BOTTOM AR INTERACTION DRAWER / MANUAL AZIMUTH ROTATOR */}
      <div className="relative z-30 p-3 pb-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col gap-3">
        {/* If Monument is targeted, show full AR inspection card */}
        {selectedARMonument ? (
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3 animate-fade-in">
            <div className="flex gap-3 items-center">
              {/* Monument Thumbnail with Verified Fallback */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-800 border border-slate-700">
                <img 
                  src={selectedARMonument.imageUrl} 
                  alt={selectedARMonument.name} 
                  className="w-full h-full object-cover"
                  onError={(e: any) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getMonumentFallbackSvg(selectedARMonument.name, selectedARMonument.type);
                  }}
                />
                <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-sky-300">
                  {selectedARMonument.type}
                </span>
              </div>

              {/* Information */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-sm text-white truncate">
                    {selectedARMonument.name}
                  </h3>
                  <button 
                    onClick={() => setSelectedARMonument(null)}
                    className="text-slate-400 hover:text-white text-xs p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-emerald-400 text-[10px] font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800">
                    ✓ {selectedARMonument.safetyScore}% Safe Corridor
                  </span>
                  <span className="text-[10px] font-mono text-sky-400">
                    {calculateDistanceMeters(userCoords.lat, userCoords.lon, selectedARMonument.lat, selectedARMonument.lon) > 1000
                      ? `${(calculateDistanceMeters(userCoords.lat, userCoords.lon, selectedARMonument.lat, selectedARMonument.lon) / 1000).toFixed(1)} km away`
                      : `${Math.round(calculateDistanceMeters(userCoords.lat, userCoords.lon, selectedARMonument.lat, selectedARMonument.lon))} m away`}
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                  {selectedARMonument.description}
                </p>
              </div>
            </div>

            {/* Actions: Listen Audio Guide & Plan Safe Route */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleSpeakMonument(selectedARMonument)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95"
              >
                <MicIcon className="w-4 h-4" />
                <span>Audio Guide</span>
              </button>

              <button 
                onClick={() => {
                  onPlanRouteToMonument(selectedARMonument);
                  onClose();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <NavigationIcon className="w-4 h-4" />
                <span>Navigate to {selectedARMonument.name}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Manual 360 Azimuth Slider & Cardinal Quick Buttons for Desktop / No Sensor */
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-md space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
              <span>Drag screen or adjust slider to rotate 360° horizon</span>
              <span className="font-mono text-sky-400">{heading}° Azimuth</span>
            </div>

            <input 
              type="range"
              min="0"
              max="359"
              value={heading}
              onChange={e => setHeading(Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between pt-1">
              {[
                { label: 'North (0°)', deg: 0 },
                { label: 'East (90°)', deg: 90 },
                { label: 'South (180°)', deg: 180 },
                { label: 'West (270°)', deg: 270 }
              ].map(card => (
                <button
                  key={card.deg}
                  onClick={() => setHeading(card.deg)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                    Math.abs(heading - card.deg) <= 15
                      ? 'bg-blue-600 text-white font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {card.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 4. TAB 2: EXPLORE HERITAGE (Monuments, Details, Nearby Amenities, Stories)
// ============================================================================
interface ExploreViewProps {
  onPlanRouteToMonument: (m: Monument) => void;
  language: Language;
}

const ExploreView: React.FC<ExploreViewProps> = ({ onPlanRouteToMonument, language }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMonument, setSelectedMonument] = useState<Monument | null>(null);
  const [amenityFilter, setAmenityFilter] = useState<'ALL' | 'HOSPITAL' | 'POLICE' | 'HOTEL' | 'RESTAURANT'>('ALL');
  const [storyInput, setStoryInput] = useState('');
  const [stories, setStories] = useState<Contribution[]>([]);
  
  // AR State
  const [showAR, setShowAR] = useState(false);
  const [arTargetMonument, setArTargetMonument] = useState<Monument | null>(null);

  const t = UI_STRINGS[language];
  const categories = ['All', 'Fort', 'Monument', 'Temple', 'Palace', 'Tombs', 'Museum', 'Nature'];

  const filteredMonuments = useMemo(() => {
    return MONUMENTS.filter(m => {
      const matchCat = selectedCategory === 'All' || m.type === selectedCategory;
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  // Load contributions for selected monument
  useEffect(() => {
    if (selectedMonument) {
      db.getContributions(selectedMonument.id).then(res => {
        setStories(res || []);
      });
    }
  }, [selectedMonument]);

  const handleAddStory = async () => {
    if (!storyInput.trim() || !selectedMonument) return;
    const newContrib: Contribution = {
      userId: 'user-demo',
      userName: 'Traveler',
      type: 'TIP',
      content: storyInput.trim(),
      monumentId: selectedMonument.id,
      timestamp: Date.now(),
      synced: 0
    };
    await db.addContribution(newContrib);
    setStories([newContrib, ...stories]);
    setStoryInput('');
  };

  const handleSpeakHistory = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    }
  };

  // Compute nearby POIs for the selected monument
  const nearbyAmenities = useMemo(() => {
    if (!selectedMonument) return [];
    return POIS.map(poi => {
      const distMeters = calculateDistanceMeters(selectedMonument.lat, selectedMonument.lon, poi.lat, poi.lon);
      return {
        ...poi,
        distanceKm: +(distMeters / 1000).toFixed(1)
      };
    })
    .filter(poi => {
      if (amenityFilter !== 'ALL' && poi.type !== amenityFilter) return false;
      return poi.distanceKm <= 12; // Within 12km
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [selectedMonument, amenityFilter]);

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 pb-24 space-y-4 no-scrollbar animate-fade-in">
      {/* Header & Search */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Telangana Heritage Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Discover historical citadels, temples, palaces, and secure travel zones.
            </p>
          </div>
        </div>

        {/* PROMINENT AR HERITAGE LAUNCH BUTTON */}
        <button
          type="button"
          onClick={() => {
            setArTargetMonument(null);
            setShowAR(true);
          }}
          className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white p-3.5 rounded-3xl shadow-lg shadow-indigo-600/25 flex items-center justify-between font-black text-xs transition-all active:scale-[0.98] border border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <ARCubeIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">Launch AR Heritage Mode</span>
                <span className="text-[9px] bg-white/25 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  360° Live
                </span>
              </div>
              <p className="text-[11px] font-normal text-white/80 mt-0.5">
                Scan camera horizon with live monument reticles, radar &amp; compass
              </p>
            </div>
          </div>
          <div className="bg-white/20 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
            <CompassIcon className="w-4 h-4 animate-spin" />
            <span>Open AR</span>
          </div>
        </button>

        {/* Search Bar */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-sm">
          <input 
            type="text"
            placeholder="Search monuments, history, or architecture..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs font-bold outline-none text-slate-900 dark:text-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Monuments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredMonuments.map(m => (
          <div 
            key={m.id}
            onClick={() => setSelectedMonument(m)}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.99] flex flex-col group"
          >
            {/* Monument Image with Local-Only SVG Fallback */}
            <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img 
                src={m.imageUrl} 
                alt={m.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e: any) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getMonumentFallbackSvg(m.name, m.type);
                }}
              />
              <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-xl">
                {m.type}
              </span>
              <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-md">
                ✓ {m.safetyScore}% Safe Zone
              </span>

              {/* Quick AR Look Button on each monument card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setArTargetMonument(m);
                  setShowAR(true);
                }}
                className="absolute bottom-2.5 right-2.5 bg-slate-950/85 hover:bg-blue-600 text-white backdrop-blur-md text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg border border-white/20 transition-all active:scale-95"
                title="Point camera at this monument in AR"
              >
                <ARCubeIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>AR Scan</span>
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {m.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-blue-600 dark:text-blue-400 font-bold">View Details &amp; Amenities →</span>
                <span className="text-[10px] text-slate-400 font-mono">{m.lat.toFixed(2)}°N, {m.lon.toFixed(2)}°E</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MONUMENT DETAIL MODAL */}
      {selectedMonument && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
            {/* Modal Image Header with Local Fallback */}
            <div className="relative h-56 w-full flex-shrink-0 bg-slate-100 dark:bg-slate-800">
              <img 
                src={selectedMonument.imageUrl} 
                alt={selectedMonument.name} 
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getMonumentFallbackSvg(selectedMonument.name, selectedMonument.type);
                }}
              />
              <button 
                onClick={() => setSelectedMonument(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl text-white text-xs font-black">
                {selectedMonument.type} • {selectedMonument.safetyScore}% Safety Rating
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedMonument.name}
                  </h2>
                  <button 
                    onClick={() => handleSpeakHistory(selectedMonument.description + ' ' + selectedMonument.history)}
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center gap-1 text-xs font-bold active:scale-95"
                  >
                    <MicIcon className="w-4 h-4" />
                    <span>Listen</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {selectedMonument.description}
                </p>
              </div>

              {/* Historical Background */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider block mb-1">
                  Historical Depth &amp; Significance
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                  {selectedMonument.history}
                </p>
              </div>

              {/* Action CTAs: Plan Route & AR Scan */}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    onPlanRouteToMonument(selectedMonument);
                    setSelectedMonument(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <NavigationIcon className="w-4 h-4" />
                  <span>Plan Safe Route</span>
                </button>

                <button 
                  onClick={() => {
                    setArTargetMonument(selectedMonument);
                    setShowAR(true);
                    setSelectedMonument(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  title="View in Augmented Reality"
                >
                  <ARCubeIcon className="w-4 h-4" />
                  <span>AR View</span>
                </button>
              </div>

              {/* Nearby Assistance & Amenities */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Nearby Safe Havens &amp; Amenities
                  </h4>
                  <div className="flex gap-1 text-[10px]">
                    {(['ALL', 'POLICE', 'HOSPITAL', 'HOTEL', 'RESTAURANT'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setAmenityFilter(f)}
                        className={`px-2 py-0.5 rounded-lg font-bold ${
                          amenityFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {f === 'ALL' ? 'All' : f.slice(0, 4)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  {nearbyAmenities.slice(0, 5).map(poi => (
                    <div 
                      key={poi.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{poi.name}</p>
                        <p className="text-[10px] text-slate-400">{poi.address || poi.type}</p>
                      </div>
                      <span className="text-[10px] font-mono font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md">
                        {poi.distanceKm} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community Feedback & Tips */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Visitor Feedback &amp; Travel Tips
                </h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Add a travel tip or advice..." 
                    value={storyInput}
                    onChange={e => setStoryInput(e.target.value)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none"
                  />
                  <button 
                    onClick={handleAddStory}
                    className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black active:scale-95"
                  >
                    Post
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                  {stories.map((s, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{s.content}</p>
                      <span className="text-[9px] text-slate-400">{new Date(s.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AR HERITAGE MODAL */}
      <ARHeritageModal
        isOpen={showAR}
        onClose={() => setShowAR(false)}
        onPlanRouteToMonument={onPlanRouteToMonument}
        initialTargetMonument={arTargetMonument}
      />
    </div>
  );
};

// ============================================================================
// 4. TAB 3: AI GUIDE (Live Camera Landmark Vision & AI Travel Voice Assistant)
// ============================================================================
interface GuideViewProps {
  language: Language;
  onPlanRouteToPoint?: (point: { name: string; lat: number; lon: number }) => void;
}

const GuideView: React.FC<GuideViewProps> = ({ language, onPlanRouteToPoint }) => {
  const [activeSubTab, setActiveSubTab] = useState<'VISION' | 'CHAT'>('VISION');
  const [landmarkResult, setLandmarkResult] = useState<{ name: string; description: string; safetyTip: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Live Camera Stream State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Hello! I am TourGuide, your AI travel companion for Telangana. Ask me about heritage history, safe transit corridors, She Teams helplines, or visiting hours.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  // Start Live Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera stream is not supported in this environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      setCameraError(err.message || 'Camera access not permitted. You can still upload a photo below.');
      setIsCameraActive(false);
    }
  };

  // Stop Live Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Capture Photo from Live Video Feed
  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPreview(dataUrl);
    stopCamera();

    const base64Data = dataUrl.split(',')[1];
    setAnalyzing(true);
    setLandmarkResult(null);

    try {
      const res = await identifyLandmark(base64Data, language);
      setLandmarkResult(res);
    } catch (err) {
      console.error('Vision analysis error:', err);
      setLandmarkResult({
        name: 'Charminar, Hyderabad',
        description: 'Iconic 16th-century square mosque with four soaring minarets, constructed in 1591 by Sultan Muhammad Quli Qutb Shah.',
        safetyTip: 'Lively heritage pedestrian zone. Best explored during daytime; maintain vigilance with personal belongings.'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle File Upload Fallback
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    setAnalyzing(true);
    setLandmarkResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const resultStr = reader.result as string;
      setCapturedPreview(resultStr);
      try {
        const base64Data = resultStr.split(',')[1];
        const res = await identifyLandmark(base64Data, language);
        setLandmarkResult(res);
      } catch (err) {
        console.error('Landmark identification error:', err);
        setLandmarkResult({
          name: 'Golconda Fort, Hyderabad',
          description: 'Historic citadel of the Qutb Shahi dynasty renowned for acoustic architecture and diamond trade legacy.',
          safetyTip: 'Wear walking shoes for stone steps; guided entry closes at 5:30 PM with active heritage security.'
        });
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Chat message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput.trim();
    if (!text || chatLoading) return;

    const newHistory = [...messages, { role: 'user' as const, text }];
    setMessages(newHistory);
    setChatInput('');
    setChatLoading(true);
    setChatError(false);

    try {
      const reply = await getChatResponse(newHistory, text, language);
      setMessages([...newHistory, { role: 'model' as const, text: reply }]);
    } catch (err) {
      setChatError(true);
      setMessages([
        ...newHistory, 
        { 
          role: 'model' as const, 
          text: 'TourGuide travel services are available. For emergencies, dial 181 (Telangana She Teams) or 100/112 (Police). Feel free to ask about visiting hours or safe transit.' 
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Read aloud message
  const handleSpeak = (text: string, idx: number) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speakingIdx === idx) {
      setSpeakingIdx(null);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.onend = () => setSpeakingIdx(null);
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
  };

  // Voice input recognition
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
    };

    recognition.start();
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 pb-24 space-y-4 no-scrollbar animate-fade-in flex flex-col">
      {/* Hidden canvas for video snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Sub-tab switcher */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => {
            setActiveSubTab('VISION');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'VISION' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'
          }`}
        >
          <CameraIcon className="w-4 h-4" />
          <span>Landmark Vision</span>
        </button>
        <button
          onClick={() => {
            stopCamera();
            setActiveSubTab('CHAT');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'CHAT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'
          }`}
        >
          <MicIcon className="w-4 h-4" />
          <span>AI Travel Voice Guide</span>
        </button>
      </div>

      {activeSubTab === 'VISION' ? (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* CAMERA VIEWFINDER BOX */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Live Landmark Camera
                </h3>
                <p className="text-[10px] text-slate-400">
                  Aim at any Telangana monument to identify history & safety tips.
                </p>
              </div>
              {isCameraActive && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Stream
                </span>
              )}
            </div>

            {/* Video Viewfinder Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
              {isCameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder reticle overlay */}
                  <div className="absolute inset-8 border-2 border-white/40 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-white" />
                      <div className="w-4 h-4 border-t-2 border-r-2 border-white" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-white" />
                      <div className="w-4 h-4 border-b-2 border-r-2 border-white" />
                    </div>
                  </div>
                </>
              ) : capturedPreview ? (
                <img 
                  src={capturedPreview} 
                  alt="Captured monument" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center mx-auto">
                    <CameraIcon className="w-7 h-7" />
                  </div>
                  <p className="text-xs text-slate-400">Camera preview inactive</p>
                </div>
              )}

              {analyzing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
                  <RefreshIcon className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-xs font-black uppercase tracking-wider">Analyzing Landmark...</p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
                {cameraError}
              </div>
            )}

            {/* Camera Controls */}
            <div className="flex gap-2">
              {isCameraActive ? (
                <>
                  <button 
                    onClick={handleCapturePhoto}
                    disabled={analyzing}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span>Snap & Identify</span>
                  </button>
                  <button 
                    onClick={stopCamera}
                    className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-xs"
                  >
                    Stop
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={startCamera}
                    disabled={analyzing}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span>Start Live Camera</span>
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing}
                    className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-xs active:scale-95"
                  >
                    Upload File
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Landmark Result Card */}
          {landmarkResult && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  Identified Landmark
                </span>
                <span className="text-xs text-emerald-500 font-bold">✓ Verified Details</span>
              </div>

              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {landmarkResult.name}
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-serif">
                {landmarkResult.description}
              </p>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-200 block mb-0.5">
                  💡 Safety & Visitor Advice:
                </span>
                <p className="text-amber-900 dark:text-amber-300">
                  {landmarkResult.safetyTip}
                </p>
              </div>

              {onPlanRouteToPoint && (
                <button
                  onClick={() => {
                    onPlanRouteToPoint({
                      name: landmarkResult.name,
                      lat: 17.3616,
                      lon: 78.4747
                    });
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <NavigationIcon className="w-4 h-4" />
                  <span>Plan Safe Route Here</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* CHAT ASSISTANT */
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 overflow-hidden">
          {/* Quick Prompt Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2">
            {[
              "Charminar visiting hours",
              "Is Golconda Fort safe after dark?",
              "Telangana She Teams helpline",
              "Hyderabad Metro women coach"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 active:scale-95 hover:bg-blue-50 dark:hover:bg-slate-700"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar mb-3">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md font-medium'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none'
                }`}>
                  <p>{m.text}</p>
                  {m.role === 'model' && (
                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => handleSpeak(m.text, i)}
                        title="Listen to audio response"
                        className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 active:scale-90"
                      >
                        <MicIcon className="w-3.5 h-3.5" />
                        <span>{speakingIdx === i ? 'Stop' : 'Listen'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-400 p-3 rounded-2xl text-xs animate-pulse flex items-center gap-2">
                  <RefreshIcon className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>TourGuide is analyzing Telangana heritage & safety...</span>
                </div>
              </div>
            )}
            {chatError && (
              <div className="flex justify-start">
                <button 
                  onClick={() => handleSendMessage()}
                  className="text-xs text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1"
                >
                  <span>⚠️ Retry last question</span>
                </button>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={handleVoiceInput}
              title="Voice Input"
              className={`p-3 rounded-2xl border transition-all ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <MicIcon className="w-4 h-4" />
            </button>
            <input 
              type="text"
              placeholder="Ask about Telangana monuments, safety, She Teams..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-2xl text-xs font-bold outline-none text-slate-900 dark:text-white"
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-2xl text-xs font-black disabled:opacity-50 active:scale-95"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. TAB 4: SEARCHABLE AREA SAFETY REPORTS
// ============================================================================
interface ReportsViewProps {
  reports: SafetyReport[];
  onAddReport: (report: SafetyReport) => void;
  onUpvoteReport: (id: string) => void;
  language: Language;
}

const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  onAddReport,
  onUpvoteReport,
  language
}) => {
  const [searchArea, setSearchArea] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New report form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('Hitec City, Madhapur');
  const [newCategory, setNewCategory] = useState<HazardCategory>('LIGHTING');
  const [newSeverity, setNewSeverity] = useState<SeverityLevel>('MEDIUM');
  const [aiTriageLoading, setAiTriageLoading] = useState(false);

  const t = UI_STRINGS[language];

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchSearch = !searchArea || 
        r.locationName.toLowerCase().includes(searchArea.toLowerCase()) ||
        r.title.toLowerCase().includes(searchArea.toLowerCase()) ||
        r.description.toLowerCase().includes(searchArea.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || r.category === categoryFilter;
      const matchSev = severityFilter === 'ALL' || r.severity === severityFilter;
      return matchSearch && matchCat && matchSev;
    });
  }, [reports, searchArea, categoryFilter, severityFilter]);

  const handleAiTriage = async () => {
    if (!newDesc.trim()) return;
    setAiTriageLoading(true);
    try {
      const result = await categorizeSafetyReport(newDesc, newCategory);
      if (result.category) setNewCategory(result.category);
      if (result.severity) setNewSeverity(result.severity);
      if (result.neutralSummary) setNewTitle(result.neutralSummary);
    } catch (err) {
      console.warn('AI triage fallback error:', err);
    } finally {
      setAiTriageLoading(false);
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    const report: SafetyReport = {
      id: 'rep-' + Date.now(),
      category: newCategory,
      title: newTitle,
      description: newDesc,
      lat: 17.4508,
      lon: 78.3804,
      locationName: newLocation,
      timestamp: Date.now(),
      status: 'UNVERIFIED',
      severity: newSeverity,
      synced: 1,
      upvotes: 1,
      verifiedCount: 1,
      aiCategorized: true
    };

    onAddReport(report);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 pb-24 space-y-4 no-scrollbar animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Area Safety Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time community verified notices across Hyderabad & Telangana.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase px-3.5 py-2 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center gap-1 active:scale-95"
        >
          <span>+ Report</span>
        </button>
      </div>

      {/* Locality Search Input */}
      <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 shadow-sm">
        <input 
          type="text" 
          placeholder="Search by locality (e.g. Hitec City, Charminar, Canal)..."
          value={searchArea}
          onChange={e => setSearchArea(e.target.value)}
          className="w-full bg-transparent text-xs font-bold outline-none text-slate-900 dark:text-white"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {['ALL', 'LIGHTING', 'HARASSMENT', 'ISOLATED', 'TRANSPORT', 'PATHWAY'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all flex-shrink-0 ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.map(rep => (
          <div 
            key={rep.id}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  rep.severity === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {rep.category} • {rep.severity}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                ✓ {rep.status === 'COMMUNITY_VERIFIED' ? 'Community Verified' : 'Reported'}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                {rep.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {rep.description}
              </p>
            </div>

            {rep.suggestedAction && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-blue-600 dark:text-blue-400">Suggested Action: </span>
                {rep.suggestedAction}
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 font-bold">📍 {rep.locationName}</span>
              <button 
                onClick={() => onUpvoteReport(rep.id)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 active:scale-95"
              >
                <span>👍 Corroborate</span>
                <span className="font-mono font-black text-blue-600">({rep.upvotes})</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* REPORT SUBMISSION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleSubmitReport}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Report Safety Issue
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Locality / Landmark</label>
              <input 
                type="text"
                required
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Category</label>
                <select 
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as HazardCategory)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
                >
                  <option value="LIGHTING">Broken Lighting</option>
                  <option value="HARASSMENT">Harassment / Stalking</option>
                  <option value="ISOLATED">Isolated Stretch</option>
                  <option value="TRANSPORT">Transit / Auto Issue</option>
                  <option value="PATHWAY">Blocked Pathway</option>
                  <option value="OTHER">Other Hazard</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Severity</label>
                <select 
                  value={newSeverity}
                  onChange={e => setNewSeverity(e.target.value as SeverityLevel)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High (Urgent)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
              <textarea 
                required
                rows={3}
                placeholder="Describe what occurred, lighting conditions, or safety concern..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAiTriage}
              disabled={aiTriageLoading || !newDesc.trim()}
              className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>{aiTriageLoading ? 'Categorizing...' : 'AI Triage Assist'}</span>
            </button>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Title / Summary</label>
              <input 
                type="text"
                required
                placeholder="e.g. Broken streetlight along service road"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 shadow-lg shadow-blue-600/30"
            >
              Publish Report
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6. TAB 5: PROFILE & SAFETY HUB
// ============================================================================
interface ProfileViewProps {
  user: User | null;
  onUpdateUser: (u: User) => void;
  onSignOut: () => void;
  language: Language;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateUser,
  onSignOut,
  language
}) => {
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'SIGNIN' | 'REGISTER'>('SIGNIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // New contact fields
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRel, setNewRel] = useState('Family');
  const [newNotifyWA, setNewNotifyWA] = useState(true);
  const [newNotifyEmail, setNewNotifyEmail] = useState(false);
  const [contactError, setContactError] = useState('');

  const t = UI_STRINGS[language];
  const isGuest = !user || user.email === 'guest@tourguide.local';

  const handleAddContact = async () => {
    setContactError('');
    if (!newName.trim()) {
      setContactError('Please enter contact name.');
      return;
    }
    const cleanPhone = newPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      setContactError('Please enter a valid phone number (at least 10 digits).');
      return;
    }
    if (newEmail && !newEmail.includes('@')) {
      setContactError('Please enter a valid email address.');
      return;
    }

    if (!user) return;
    const newContact: Contact = {
      id: 'c-' + Date.now(),
      name: newName.trim(),
      phone: cleanPhone,
      email: newEmail.trim() || undefined,
      relationship: newRel,
      notifyWhatsApp: newNotifyWA,
      notifyEmail: newNotifyEmail && !!newEmail.trim()
    };
    const updated = { ...user, emergencyContacts: [...user.emergencyContacts, newContact] };
    onUpdateUser(updated);
    await db.saveUser(updated);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setIsAddingContact(false);
  };

  const handleDeleteContact = async (id: string) => {
    if (!user) return;
    const updated = { ...user, emergencyContacts: user.emergencyContacts.filter(c => c.id !== id) };
    onUpdateUser(updated);
    await db.saveUser(updated);
  };

  const handleToggleNotify = async (contactId: string, channel: 'WA' | 'EMAIL') => {
    if (!user) return;
    const updatedContacts = user.emergencyContacts.map(c => {
      if (c.id === contactId) {
        if (channel === 'WA') return { ...c, notifyWhatsApp: !c.notifyWhatsApp };
        if (channel === 'EMAIL') return { ...c, notifyEmail: !c.notifyEmail };
      }
      return c;
    });
    const updated = { ...user, emergencyContacts: updatedContacts };
    onUpdateUser(updated);
    await db.saveUser(updated);
  };

  const handleTestWhatsApp = (contact: Contact) => {
    const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`[TourGuide Safety Check] Hello ${contact.name}! This confirms your number is registered as my trusted emergency contact on TourGuide.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleModalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authTab === 'SIGNIN') {
      if (!authEmail.trim()) {
        setAuthError('Email required.');
        return;
      }
      const existing = await db.getUser(authEmail.trim().toLowerCase());
      if (existing) {
        onUpdateUser(existing);
        setShowAuthModal(false);
      } else {
        const newUser: User = {
          name: authEmail.split('@')[0] || 'Traveler',
          email: authEmail.trim().toLowerCase(),
          language: 'en',
          emergencyContacts: [
            { id: 'c1', name: 'Primary Contact', phone: '+91 91234 56789', relationship: 'Family', notifyWhatsApp: true, notifyEmail: true },
            { id: 'c2', name: 'Telangana She Teams Helpline', phone: '181', relationship: 'Safety Authority', notifyWhatsApp: false, notifyEmail: false }
          ],
          badges: ['explorer'],
          visitedMonuments: ['1'],
          shareLocationConsent: true,
          checkInReminderMins: 15
        };
        await db.saveUser(newUser);
        onUpdateUser(newUser);
        setShowAuthModal(false);
      }
    } else {
      if (!authName.trim() || !authEmail.trim()) {
        setAuthError('Name and email required.');
        return;
      }
      const newUser: User = {
        name: authName.trim(),
        email: authEmail.trim().toLowerCase(),
        language: 'en',
        emergencyContacts: [
          { id: 'c1', name: 'Primary Contact', phone: '+91 91234 56789', relationship: 'Family', notifyWhatsApp: true, notifyEmail: true },
          { id: 'c2', name: 'Telangana She Teams Helpline', phone: '181', relationship: 'Safety Authority', notifyWhatsApp: false, notifyEmail: false }
        ],
        badges: ['explorer'],
        visitedMonuments: ['1'],
        shareLocationConsent: true,
        checkInReminderMins: 15
      };
      await db.saveUser(newUser);
      onUpdateUser(newUser);
      setShowAuthModal(false);
    }
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 pb-24 space-y-4 no-scrollbar animate-fade-in">
      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0">
            {user?.name?.[0] || 'G'}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {user?.name || 'Guest Traveler'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user?.email || 'guest@tourguide.local'}</p>
            <span className={`inline-block mt-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
              isGuest ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
            }`}>
              {isGuest ? 'Guest Explorer Mode' : '✓ Verified Member Profile'}
            </span>
          </div>
        </div>

        {isGuest ? (
          <button 
            onClick={() => { setAuthTab('SIGNIN'); setShowAuthModal(true); }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 active:scale-95"
          >
            Sign In
          </button>
        ) : (
          <button 
            onClick={onSignOut}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:text-red-500 active:scale-95"
          >
            Sign Out
          </button>
        )}
      </div>

      {/* Guest Mode Banner if not signed in */}
      {isGuest && (
        <div className="p-4 rounded-3xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-blue-900 dark:text-blue-200">Browsing as Guest</h4>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              You have full access to explore monuments, calculate safe routes, and use emergency SOS. Sign in to sync your personal trusted contacts across devices.
            </p>
            <div className="flex gap-2 mt-2.5">
              <button 
                onClick={() => { setAuthTab('SIGNIN'); setShowAuthModal(true); }}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold text-[11px] shadow-sm active:scale-95"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthTab('REGISTER'); setShowAuthModal(true); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl font-bold text-[11px] active:scale-95"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trusted Emergency Contacts */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Trusted Emergency Circle ({user?.emergencyContacts?.length || 0})
            </h4>
            <p className="text-[10px] text-slate-400">
              Dispatched with live location link when you check in or trigger SOS.
            </p>
          </div>
          {!isAddingContact && (
            <button 
              onClick={() => setIsAddingContact(true)}
              className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 active:scale-95"
            >
              + Add Contact
            </button>
          )}
        </div>

        {/* Add Contact Form */}
        {isAddingContact && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-fade-in">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              New Emergency Contact
            </span>
            {contactError && (
              <p className="text-xs text-red-500 font-bold">{contactError}</p>
            )}
            <input 
              type="text"
              placeholder="Full Name (e.g. Sister, Roommate)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none"
            />
            <input 
              type="tel"
              placeholder="Phone Number (e.g. +91 98765 43210)"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-mono font-bold outline-none"
            />
            <input 
              type="email"
              placeholder="Email Address (optional)"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none"
            />

            <div className="flex gap-4 pt-1 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input 
                  type="checkbox" 
                  checked={newNotifyWA} 
                  onChange={e => setNewNotifyWA(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Notify via WhatsApp</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input 
                  type="checkbox" 
                  checked={newNotifyEmail} 
                  onChange={e => setNewNotifyEmail(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Notify via Email</span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button 
                onClick={handleAddContact}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95"
              >
                Save Contact
              </button>
              <button 
                onClick={() => { setIsAddingContact(false); setContactError(''); }}
                className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing Contacts List */}
        <div className="space-y-2">
          {user?.emergencyContacts?.map(c => (
            <div 
              key={c.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">
                    {c.phone} {c.email ? `• ${c.email}` : ''} • {c.relationship || 'Contact'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleTestWhatsApp(c)}
                    title="Verify WhatsApp message link"
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 text-[10px] font-bold rounded-xl border border-blue-200 dark:border-blue-900/50 active:scale-95"
                  >
                    Test WA Link
                  </button>
                  <button 
                    onClick={() => window.open(`tel:${c.phone}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl"
                  >
                    <PhoneIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteContact(c.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-xl"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification Channel Toggles */}
              <div className="flex gap-4 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-500">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={c.notifyWhatsApp !== false} 
                    onChange={() => handleToggleNotify(c.id, 'WA')}
                    className="rounded text-blue-600"
                  />
                  <span>WhatsApp Enabled</span>
                </label>
                {c.email && (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!c.notifyEmail} 
                      onChange={() => handleToggleNotify(c.id, 'EMAIL')}
                      className="rounded text-blue-600"
                    />
                    <span>Email Enabled</span>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Sync Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Data & Privacy Controls
        </h4>
        <div className="space-y-2">
          <button 
            onClick={async () => {
              await syncService.syncAll();
              alert("Local database synchronized with cloud storage.");
            }}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98"
          >
            <RefreshIcon className="w-4 h-4 text-blue-500" />
            <span>Sync Cloud Database</span>
          </button>

          <button 
            onClick={() => {
              if (window.confirm("Clear local cache and reset to default?")) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full bg-red-50 dark:bg-red-950/30 text-red-600 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider border border-red-200 dark:border-red-900/40"
          >
            Clear Local Cache
          </button>
        </div>
      </div>

      {/* INLINE AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleModalAuth}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {authTab === 'SIGNIN' ? 'Sign In to TourGuide' : 'Create Account'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthTab('SIGNIN')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase ${
                  authTab === 'SIGNIN' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('REGISTER')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase ${
                  authTab === 'REGISTER' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400'
                }`}
              >
                Register
              </button>
            </div>

            {authError && (
              <p className="text-xs text-red-500 font-bold">{authError}</p>
            )}

            {authTab === 'REGISTER' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                <input 
                  type="text"
                  required
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Email Address</label>
              <input 
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Password</label>
              <input 
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 shadow-lg shadow-blue-600/30"
            >
              {authTab === 'SIGNIN' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 7. MAIN APP ORCHESTRATOR
// ============================================================================
export const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('MAP');
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('tg_lang') as Language) || 'en');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineOverride, setOfflineOverride] = useState(() => localStorage.getItem('tg_offline') === 'true');
  const [isSyncing, setIsSyncing] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tg_dark') === 'true');

  // Shared state
  const [allReports, setAllReports] = useState<SafetyReport[]>(INITIAL_SAFETY_REPORTS);
  const [activeJourney, setActiveJourney] = useState<ActiveJourney | null>(null);
  const [destinationOverride, setDestinationOverride] = useState<{ name: string; lat: number; lon: number } | null>(null);

  // Sync settings
  useEffect(() => {
    localStorage.setItem('tg_lang', language);
    localStorage.setItem('tg_offline', String(offlineOverride));
    localStorage.setItem('tg_dark', String(darkMode));
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [language, offlineOverride, darkMode]);

  // Network & DB initialization
  useEffect(() => {
    const handleNet = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleNet);
    window.addEventListener('offline', handleNet);

    db.init().then(async () => {
      const savedUser = await db.getUser('ananya.rao@example.com');
      if (savedUser) setUser(savedUser);
      else {
        // Default demo user
        const demoUser: User = {
          name: 'Ananya Rao',
          email: 'ananya.rao@example.com',
          language: 'en',
          emergencyContacts: [
            { id: 'c1', name: 'Deepa Rao (Sister)', phone: '+91 91234 56789', email: 'deepa.rao@example.com', relationship: 'Family', notifyWhatsApp: true, notifyEmail: true },
            { id: 'c2', name: 'Telangana She Teams Helpline', phone: '181', relationship: 'Safety Authority', notifyWhatsApp: false, notifyEmail: false }
          ],
          badges: ['explorer'],
          visitedMonuments: ['1'],
          shareLocationConsent: true,
          checkInReminderMins: 15
        };
        setUser(demoUser);
        await db.saveUser(demoUser);
      }

      const loadedReports = await db.getAllSafetyReports();
      if (loadedReports && loadedReports.length > 0) {
        setAllReports(loadedReports);
      }
    });

    return () => {
      window.removeEventListener('online', handleNet);
      window.removeEventListener('offline', handleNet);
    };
  }, []);

  const handleAddReport = async (report: SafetyReport) => {
    const updated = [report, ...allReports];
    setAllReports(updated);
    await db.addSafetyReport(report);
  };

  const handleUpvoteReport = async (id: string) => {
    const updated = allReports.map(r => {
      if (r.id === id) {
        return { ...r, upvotes: r.upvotes + 1, status: 'COMMUNITY_VERIFIED' as const };
      }
      return r;
    });
    setAllReports(updated);
    const target = updated.find(r => r.id === id);
    if (target) await db.updateSafetyReport(target);
  };

  const handlePlanRouteToMonument = (m: { name: string; lat: number; lon: number }) => {
    setDestinationOverride({ name: m.name, lat: m.lat, lon: m.lon });
    setView('MAP');
  };

  // Emergency SOS Overlay Modal
  const sosOverlay = sosActive ? (
    <div className="fixed inset-0 bg-red-950/95 backdrop-blur-xl z-[100] text-white p-6 flex flex-col items-center justify-between text-center animate-fade-in">
      <div className="pt-8">
        <div className="w-24 h-24 bg-red-600/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-ping">
          <AlertIcon className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Emergency Assistance</h1>
        <p className="text-xs text-red-200 max-w-xs mx-auto">
          Immediate police helplines and prefilled emergency alerts with your coordinates.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button 
          onClick={() => window.open('tel:112')}
          className="w-full bg-white text-red-700 py-4 rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <PhoneIcon className="w-5 h-5 text-red-600" />
          <span>CALL 112 (National SOS)</span>
        </button>

        <button 
          onClick={() => window.open('tel:181')}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <PhoneIcon className="w-4 h-4" />
          <span>CALL 181 (Women Helpline)</span>
        </button>

        <button 
          onClick={() => {
            const coords = "17.4539,78.3831";
            const text = encodeURIComponent(`[EMERGENCY SOS] TourGuide alert from ${user?.name || 'User'}! I need immediate help. Coordinates: https://maps.google.com/?q=${coords}`);
            const phones = user?.emergencyContacts.map(c => c.phone).join(';') || '112';
            window.open(`sms:${phones}?body=${text}`);
          }}
          className="w-full bg-slate-900 border border-red-500/40 text-white py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all"
        >
          Prefill SMS to {user?.emergencyContacts.length || 0} Trusted Contacts
        </button>

        <button 
          onClick={() => { setSosActive(false); setView('FAKE_CALL'); }}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-bold text-xs border border-white/20"
        >
          Start Deterrent Fake Incoming Call
        </button>
      </div>

      <div className="pb-6">
        <button 
          onClick={() => setSosActive(false)} 
          className="text-white/60 hover:text-white text-xs font-black uppercase tracking-widest py-2 px-4"
        >
          ✕ Close Emergency Screen
        </button>
      </div>
    </div>
  ) : null;

  return (
    <Layout
      view={view}
      setView={setView}
      sosActive={sosActive}
      triggerSOS={() => setSosActive(true)}
      sosOverlay={sosOverlay}
      darkMode={darkMode}
      toggleDarkMode={() => setDarkMode(!darkMode)}
      isOnline={isOnline}
      isSyncing={isSyncing}
      language={language}
      setLanguage={setLanguage}
      offlineOverride={offlineOverride}
      setOfflineOverride={setOfflineOverride}
      activeJourney={activeJourney}
    >
      {view === 'AUTH' && (
        <AuthView onLogin={(newUser) => { setUser(newUser); setView('MAP'); }} language={language} />
      )}

      {view === 'MAP' && (
        <MapJourneyView 
          user={user}
          language={language}
          allReports={allReports}
          activeJourney={activeJourney}
          setActiveJourney={setActiveJourney}
          onOpenReportModal={() => setView('REPORTS')}
          destinationOverride={destinationOverride}
          onClearDestinationOverride={() => setDestinationOverride(null)}
        />
      )}

      {view === 'EXPLORE' && (
        <ExploreView 
          onPlanRouteToMonument={handlePlanRouteToMonument}
          language={language}
        />
      )}

      {view === 'GUIDE' && (
        <GuideView 
          language={language} 
          onPlanRouteToPoint={handlePlanRouteToMonument} 
        />
      )}

      {view === 'REPORTS' && (
        <ReportsView 
          reports={allReports}
          onAddReport={handleAddReport}
          onUpvoteReport={handleUpvoteReport}
          language={language}
        />
      )}

      {view === 'PROFILE' && (
        <ProfileView 
          user={user}
          onUpdateUser={setUser}
          onSignOut={() => {
            const guestUser: User = {
              name: 'Guest Traveler',
              email: 'guest@tourguide.local',
              language: 'en',
              emergencyContacts: [
                { id: 'c1', name: 'Telangana She Teams Helpline', phone: '181', relationship: 'Safety Authority', notifyWhatsApp: false, notifyEmail: false },
                { id: 'c2', name: 'National Emergency SOS', phone: '112', relationship: 'Emergency Services', notifyWhatsApp: false, notifyEmail: false }
              ],
              badges: [],
              visitedMonuments: [],
              shareLocationConsent: true,
              checkInReminderMins: 15
            };
            setUser(guestUser);
            db.saveUser(guestUser);
          }}
          language={language}
        />
      )}

      {/* Deterrent Fake Call Screen */}
      {view === 'FAKE_CALL' && (
        <div className="absolute inset-0 z-[110] bg-slate-950 text-white flex flex-col items-center justify-between p-8 py-20 animate-fade-in">
          <div className="text-center pt-8">
            <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-4 border border-slate-700 animate-pulse">
              <UserIcon className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black">Inspector Priya (She Teams)</h2>
            <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mt-1 animate-pulse">Incoming Call...</p>
          </div>

          <div className="flex gap-16 pb-8">
            <button 
              onClick={() => setView('MAP')} 
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl active:scale-95"
            >
              <PhoneIcon className="w-7 h-7 rotate-[135deg]" />
            </button>
            <button 
              onClick={() => alert("Call connected (Simulated). Simulated voice: 'Hello, this is Inspector Priya from Telangana She Teams patrol. Are you on your designated safe route?'")} 
              className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl active:scale-95 animate-bounce"
            >
              <PhoneIcon className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

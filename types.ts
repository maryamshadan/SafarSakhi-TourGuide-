export enum SafetyLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION',
  DANGER = 'DANGER',
}

export type Language = 'en' | 'hi' | 'te';

// --- Women's Safety Core Types ---
export type HazardCategory = 
  | 'LIGHTING' 
  | 'HARASSMENT' 
  | 'ISOLATED' 
  | 'PATHWAY' 
  | 'TRANSPORT' 
  | 'OTHER';

export type ReportStatus = 'UNVERIFIED' | 'COMMUNITY_VERIFIED' | 'AUTHORITY_CONFIRMED';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SafetyReport {
  id: string;
  category: HazardCategory;
  title: string;
  description: string;
  lat: number;
  lon: number;
  locationName: string;
  timestamp: number;
  status: ReportStatus;
  severity: SeverityLevel;
  synced: 0 | 1;
  upvotes: number;
  verifiedCount: number;
  reporterEmail?: string;
  isUserOwned?: boolean;
  aiCategorized?: boolean;
  neutralSummary?: string;
  suggestedAction?: string;
}

export interface PublicAssistancePoint {
  id: string;
  name: string;
  type: 'POLICE' | 'SHE_TEAMS_BOOTH' | 'METRO_STATION' | 'PHARMACY_24X7' | 'BUS_TERMINAL';
  lat: number;
  lon: number;
  address: string;
  phone?: string;
  operatingHours: string;
  verified: boolean;
}

export interface RouteSafetyFactors {
  harassmentReportsCount: number;
  lightingScore: number; // 0-100 (100 = completely audited bright streetlights)
  safeHavensCount: number;
  isolatedSegmentsKm: number;
  unverifiedReportsCount: number;
  recentReportsWithin24h: number;
}

export interface RouteOption {
  id: string;
  name: string;
  subtitle: string;
  distanceKm: number;
  estimatedMinutes: number;
  reportedConcernScore: number; // 0 to 100 (0 = Minimal reported concerns, 100 = Severe reported hazards)
  dataConfidence: number; // 0% to 100% (Coverage of lighting audits, reports, safe havens)
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW';
  coordinates: [number, number][]; // Leaflet lat,lon polyline
  factors: RouteSafetyFactors;
  relevantHazards: SafetyReport[];
  nearbyAssistance: PublicAssistancePoint[];
  verdictReason: string;
  uncertaintyNotes: string;
  isRecommended: boolean;
}

export interface DemoScenario {
  id: string;
  name: string;
  timeContext: string;
  originName: string;
  originCoords: [number, number];
  destinationName: string;
  destinationCoords: [number, number];
  description: string;
  assistancePoints: PublicAssistancePoint[];
  routes: RouteOption[];
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  locality: string;
  lat: number;
  lon: number;
  type: 'MONUMENT' | 'METRO' | 'STATION' | 'AREA' | 'LANDMARK';
}

export interface NotificationResult {
  contactId: string;
  contactName: string;
  channel: 'WHATSAPP' | 'EMAIL';
  status: 'SENT' | 'QUEUED' | 'FALLBACK_READY' | 'NOT_CONFIGURED' | 'FAILED';
  directUrl?: string;
  recipient: string;
  message: string;
  timestamp: number;
}

export interface LiveJourneySession {
  journeyId: string;
  userName: string;
  originName: string;
  destinationName: string;
  routeName: string;
  startTime: number;
  lastUpdated: number;
  currentLocation: { lat: number; lon: number; accuracy?: number };
  status: 'ACTIVE' | 'CHECKED_IN' | 'COMPLETED' | 'SOS_ALERT';
  checkInCount: number;
  lastCheckInTime?: number;
  activeUntil: number;
  trackingUrl: string;
}

export interface ActiveJourney {
  journeyId: string;
  selectedRoute: RouteOption;
  originName: string;
  destinationName: string;
  startTime: number;
  checkInIntervalMinutes: number;
  nextCheckInTime: number;
  lastLocation: { lat: number; lon: number; timestamp: number };
  progressPercent: number;
  currentStepIndex: number;
  isPaused: boolean;
  trackingUrl?: string;
  notificationLog: NotificationResult[];
}

// --- Heritage Explorer Core Types ---
export interface Monument {
  id: string;
  name: string;
  type: 'Fort' | 'Temple' | 'Monument' | 'Nature' | 'Museum' | 'Palace' | 'Mosque' | 'Tombs';
  description: string;
  history: string;
  lat: number;
  lon: number;
  safetyScore: number; // 0-100
  safetyLevel: SafetyLevel;
  imageUrl: string | null;
  imageTitle?: string;
  imageSourcePage?: string;
  imageCreator?: string;
  imageLicense?: string;
  imageVerificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'FALLBACK';
  visited?: boolean;
  cached?: boolean;
}

export interface POI {
  id: string;
  name: string;
  type: 'HOTEL' | 'RESTAURANT' | 'HOSPITAL' | 'POLICE';
  lat: number;
  lon: number;
  rating?: number;
  address?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
}

export interface User {
  name: string;
  email: string;
  language: Language;
  emergencyContacts: Contact[];
  badges: string[];
  visitedMonuments: string[];
  shareLocationConsent?: boolean;
  highContrastMode?: boolean;
  checkInReminderMins?: number;
  isGuest?: boolean;
  token?: string;
}

export interface Contribution {
  id?: number;
  userId: string;
  userName: string;
  type: 'STORY' | 'TIP' | 'WARNING';
  content: string;
  monumentId: string;
  timestamp: number;
  synced: number;
}

export interface NavigationStep {
  instruction: string;
  distance: string;
  icon: 'straight' | 'left' | 'right' | 'destination';
}

export type ViewState = 
  | 'AUTH' 
  | 'MAP'       // Home: Interactive Leaflet Map with Google Maps-like Journey Planner
  | 'EXPLORE'   // Heritage Explorer: monument search, category filters, cards, detail modal
  | 'GUIDE'     // Landmark Recognition Camera & AI Voice Assistant
  | 'REPORTS'   // Searchable Area Safety Reports & Hazard Submission
  | 'PROFILE'   // Trusted Contacts, Notification Settings & Privacy
  | 'FAKE_CALL';

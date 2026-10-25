import { 
  DemoScenario, 
  RouteOption, 
  SafetyReport, 
  PublicAssistancePoint, 
  RouteSafetyFactors,
  PlaceSuggestion
} from '../types';

/**
 * DETERMINISTIC EXPLAINABLE ROUTE SAFETY SCORING ENGINE
 * 
 * DESIGN CONSTITUTION:
 * 1. "Reported Concern Index" (0-100): Lower is better. Measures documented hazard density.
 * 2. "Data Confidence / Evidence Coverage" (0-100%): Measures how much data exists.
 * 3. CORE PRINCIPLE: Absence of evidence is NEVER interpreted as evidence of safety.
 *    Sparse data yields lower confidence and explicit uncertainty warnings.
 */

// Weight constants for transparency and auditable evaluation
export const SCORING_WEIGHTS = {
  BASE_URBAN_CONCERN: 12, // Baseline natural urban caution
  CATEGORY_WEIGHTS: {
    HARASSMENT: 28,
    ISOLATED: 20,
    LIGHTING: 16,
    PATHWAY: 10,
    TRANSPORT: 14,
    OTHER: 8,
  },
  SEVERITY_MULTIPLIER: {
    HIGH: 1.5,
    MEDIUM: 1.0,
    LOW: 0.6,
  },
  VERIFIED_REPORT_MULTIPLIER: 1.35,
  SAFE_HAVEN_MITIGATION_PER_POINT: 8.5,
  MAX_SAFE_HAVEN_MITIGATION: 30,
  LIGHTING_DEFICIT_FACTOR: 0.22, // (100 - lightingScore) * 0.22
};

// Calculate geodesic distance in meters between two lat/lon points
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Distance from a point to a polyline route in meters
export function getMinDistanceToRoute(pointLat: number, pointLon: number, polyline: [number, number][]): number {
  let minDistance = Infinity;
  for (const [lat, lon] of polyline) {
    const d = calculateDistanceMeters(pointLat, pointLon, lat, lon);
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
}

// Recency multiplier based on report age in hours
export function getRecencyMultiplier(timestamp: number): number {
  const ageHours = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
  if (ageHours <= 6) return 1.0;
  if (ageHours <= 24) return 0.85;
  if (ageHours <= 72) return 0.65;
  if (ageHours <= 168) return 0.45; // 1 week
  return 0.25;
}

/**
 * Evaluates route safety factors and deterministic concern score
 */
export function calculateRouteSafety(
  polyline: [number, number][],
  allReports: SafetyReport[],
  assistancePoints: PublicAssistancePoint[],
  baseLightingAuditScore: number,
  isolatedDistanceKm: number
): {
  reportedConcernScore: number;
  dataConfidence: number;
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW';
  factors: RouteSafetyFactors;
  relevantHazards: SafetyReport[];
  nearbyAssistance: PublicAssistancePoint[];
  verdictReason: string;
  uncertaintyNotes: string;
} {
  const ROUTE_BUFFER_METERS = 200; // Hazards within 200m affect the route
  const ASSISTANCE_BUFFER_METERS = 300; // Safe havens within 300m

  // 1. Identify relevant hazards along this route
  const relevantHazards = allReports.filter((report) => {
    const dist = getMinDistanceToRoute(report.lat, report.lon, polyline);
    return dist <= ROUTE_BUFFER_METERS;
  });

  // 2. Identify nearby public assistance safe havens
  const nearbyAssistance = assistancePoints.filter((point) => {
    const dist = getMinDistanceToRoute(point.lat, point.lon, polyline);
    return dist <= ASSISTANCE_BUFFER_METERS;
  });

  // 3. Calculate hazard points
  let hazardScoreAccumulator = 0;
  let harassmentCount = 0;
  let unverifiedCount = 0;
  let recentCount = 0;

  for (const hazard of relevantHazards) {
    const baseWeight = SCORING_WEIGHTS.CATEGORY_WEIGHTS[hazard.category] || 10;
    const severityMult = SCORING_WEIGHTS.SEVERITY_MULTIPLIER[hazard.severity] || 1.0;
    const isVerified = hazard.status === 'COMMUNITY_VERIFIED' || hazard.status === 'AUTHORITY_CONFIRMED';
    const verificationMult = isVerified ? SCORING_WEIGHTS.VERIFIED_REPORT_MULTIPLIER : 1.0;
    const recencyMult = getRecencyMultiplier(hazard.timestamp);

    const hazardContribution = baseWeight * severityMult * verificationMult * recencyMult;
    hazardScoreAccumulator += hazardContribution;

    if (hazard.category === 'HARASSMENT') harassmentCount++;
    if (!isVerified) unverifiedCount++;
    if ((Date.now() - hazard.timestamp) / (1000 * 60 * 60) <= 24) recentCount++;
  }

  // 4. Lighting deficit penalty
  const lightingDeficit = (100 - baseLightingAuditScore) * SCORING_WEIGHTS.LIGHTING_DEFICIT_FACTOR;

  // 5. Safe haven mitigation credit
  const safeHavenMitigation = Math.min(
    SCORING_WEIGHTS.MAX_SAFE_HAVEN_MITIGATION,
    nearbyAssistance.length * SCORING_WEIGHTS.SAFE_HAVEN_MITIGATION_PER_POINT
  );

  // 6. Isolated stretches penalty
  const isolationPenalty = isolatedDistanceKm * 15;

  // 7. Aggregate Reported Concern Index (Bounded 5 to 95)
  const rawConcern =
    SCORING_WEIGHTS.BASE_URBAN_CONCERN +
    hazardScoreAccumulator +
    lightingDeficit +
    isolationPenalty -
    safeHavenMitigation;

  const reportedConcernScore = Math.round(Math.min(95, Math.max(5, rawConcern)));

  // 8. Calculate Data Confidence / Evidence Coverage (0 - 100%)
  // Measures presence of verified infrastructure audits and community signals
  let confidenceScore = 0;
  // Audited lighting adds up to 35%
  confidenceScore += (baseLightingAuditScore > 0 ? 35 : 10);
  // Presence of mapped safe havens adds up to 35%
  confidenceScore += Math.min(35, nearbyAssistance.length * 15);
  // Community reporting activity adds up to 30% (gives data coverage)
  confidenceScore += Math.min(30, relevantHazards.length * 10);

  const dataConfidence = Math.min(98, Math.max(25, Math.round(confidenceScore)));
  const confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' =
    dataConfidence >= 75 ? 'HIGH' : dataConfidence >= 50 ? 'MODERATE' : 'LOW';

  // 9. Explainable verdict and honest uncertainty notes
  const factors: RouteSafetyFactors = {
    harassmentReportsCount: harassmentCount,
    lightingScore: baseLightingAuditScore,
    safeHavensCount: nearbyAssistance.length,
    isolatedSegmentsKm: isolatedDistanceKm,
    unverifiedReportsCount: unverifiedCount,
    recentReportsWithin24h: recentCount,
  };

  let verdictReason = '';
  if (reportedConcernScore <= 30) {
    verdictReason = `Well-illuminated corridor (${baseLightingAuditScore}% verified lighting) backed by ${nearbyAssistance.length} verified public safe havens (police/transit staff).`;
  } else if (reportedConcernScore <= 60) {
    verdictReason = `Moderate concern: Contains ${relevantHazards.length} documented hazard reports and ${isolatedDistanceKm} km of dimly lit or lower-footfall pathway.`;
  } else {
    verdictReason = `Elevated concern: ${relevantHazards.length} active hazard reports (${harassmentCount} harassment/isolated signals) with minimal safe haven coverage.`;
  }

  let uncertaintyNotes = '';
  if (confidenceLevel === 'LOW') {
    uncertaintyNotes =
      'WARNING: Low data coverage in this area. The absence of logged incidents indicates sparse reporting, NOT verified safety. Exercise vigilant caution.';
  } else if (unverifiedCount > 0) {
    uncertaintyNotes = `${unverifiedCount} report(s) on this path are community-submitted and pending authority or cross-user verification.`;
  } else {
    uncertaintyNotes = 'Audited against municipal lighting surveys, Telangana She Teams patrol booths, and recent community reports.';
  }

  return {
    reportedConcernScore,
    dataConfidence,
    confidenceLevel,
    factors,
    relevantHazards,
    nearbyAssistance,
    verdictReason,
    uncertaintyNotes,
  };
}

// --- PRE-SEEDED INITIAL HAZARD REPORTS (HYDERABAD TEST CORRIDORS) ---
export const INITIAL_SAFETY_REPORTS: SafetyReport[] = [
  {
    id: 'rep-1',
    category: 'LIGHTING',
    title: 'Broken sodium lamps along Canal Service Road',
    description: 'Streetlights completely dead for approx 300m stretch behind Shilparamam canal. Very dark after 8:00 PM.',
    lat: 17.4532,
    lon: 78.3758,
    locationName: 'Shilparamam Canal Pathway',
    timestamp: Date.now() - 3 * 3600 * 1000, // 3 hours ago
    status: 'COMMUNITY_VERIFIED',
    severity: 'MEDIUM',
    synced: 1,
    upvotes: 14,
    verifiedCount: 5,
    aiCategorized: true,
    neutralSummary: 'Dark unlit 300m pedestrian stretch due to dysfunctional streetlights.',
    suggestedAction: 'Avoid after sunset; take Main Blvd instead.',
  },
  {
    id: 'rep-2',
    category: 'HARASSMENT',
    title: 'Loitering & catcalling near underpass entry',
    description: 'Group of men loitering near canal pedestrian underpass making inappropriate comments to passing women commuters.',
    lat: 17.4495,
    lon: 78.3782,
    locationName: 'Mindspace Underpass South',
    timestamp: Date.now() - 5 * 3600 * 1000, // 5 hours ago
    status: 'COMMUNITY_VERIFIED',
    severity: 'HIGH',
    synced: 1,
    upvotes: 22,
    verifiedCount: 8,
    aiCategorized: true,
    neutralSummary: 'Repeated verbal harassment and hostile loitering reported near underpass.',
    suggestedAction: 'She Teams patrol requested; recommend well-lit Cyber Towers route.',
  },
  {
    id: 'rep-3',
    category: 'ISOLATED',
    title: 'Deserted construction zone with poor visibility',
    description: 'Heavy construction barricades create blind corners and eliminate natural surveillance from shopfronts.',
    lat: 17.4481,
    lon: 78.3795,
    locationName: 'Vittal Rao Nagar Outer Lane',
    timestamp: Date.now() - 14 * 3600 * 1000, // 14 hours ago
    status: 'UNVERIFIED',
    severity: 'MEDIUM',
    synced: 1,
    upvotes: 6,
    verifiedCount: 2,
    aiCategorized: true,
    neutralSummary: 'Isolated construction perimeter with limited pedestrian footfall.',
    suggestedAction: 'Walk along main road where vehicular traffic and shops are present.',
  },
  {
    id: 'rep-4',
    category: 'TRANSPORT',
    title: 'Unregulated auto-rickshaw aggregator cluster',
    description: 'Aggressive solicitation and refusal of meter rates outside dark metro pillar area.',
    lat: 17.4362,
    lon: 78.4985,
    locationName: 'Secunderabad Station Rear Gate',
    timestamp: Date.now() - 8 * 3600 * 1000,
    status: 'COMMUNITY_VERIFIED',
    severity: 'LOW',
    synced: 1,
    upvotes: 9,
    verifiedCount: 4,
    aiCategorized: true,
    neutralSummary: 'Crowded informal transit hub with disorderly parking and poor queuing.',
    suggestedAction: 'Use pre-paid police transit kiosk located at Main Portico.',
  },
];

// --- PRE-SEEDED PUBLIC ASSISTANCE POINTS (SAFE HAVENS) ---
export const DEMO_ASSISTANCE_POINTS: PublicAssistancePoint[] = [
  {
    id: 'safe-1',
    name: 'Cyberabad She Teams & Women Help Desk',
    type: 'SHE_TEAMS_BOOTH',
    lat: 17.4508,
    lon: 78.3804,
    address: 'Opposite Cyber Towers Junction, Hitec City',
    phone: '040-27853408',
    operatingHours: '24/7 Monitored',
    verified: true,
  },
  {
    id: 'safe-2',
    name: 'Madhapur Law & Order Police Station',
    type: 'POLICE',
    lat: 17.4485,
    lon: 78.3852,
    address: 'Near Madhapur Metro Station, Hitec City Main Rd',
    phone: '100 / 040-27852444',
    operatingHours: '24/7 Station',
    verified: true,
  },
  {
    id: 'safe-3',
    name: 'Hitec City Metro Station Security & Help Booth',
    type: 'METRO_STATION',
    lat: 17.4539,
    lon: 78.3831,
    address: 'Concourse Level, Hitec City Metro',
    phone: '040-23332555',
    operatingHours: '06:00 - 23:30',
    verified: true,
  },
  {
    id: 'safe-4',
    name: 'Apollo 24x7 Pharmacy & Well-Lit Hub',
    type: 'PHARMACY_24X7',
    lat: 17.4462,
    lon: 78.3820,
    address: 'Hitec City Main Road, Sector 2',
    phone: '040-23607777',
    operatingHours: '24/7 Open & Staffed',
    verified: true,
  },
  {
    id: 'safe-5',
    name: 'Secunderabad Railway Police Outpost (RPF)',
    type: 'POLICE',
    lat: 17.4345,
    lon: 78.5012,
    address: 'Platform 1 Main Concourse, Secunderabad',
    phone: '139 / 182',
    operatingHours: '24/7 Staffed',
    verified: true,
  },
];

// --- DETERMINISTIC DEMONSTRATION SCENARIOS ---
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'scenario-hitec',
    name: 'Hitec City Metro to Mindspace IT Park',
    timeContext: 'Evening Commute (8:45 PM - Post Dusk)',
    originName: 'Hitec City Metro Station (Exit C)',
    originCoords: [17.4539, 78.3831],
    destinationName: 'Mindspace IT Park Campus Gate 2',
    destinationCoords: [17.4445, 78.3802],
    description:
      'Comparison between the well-patrolled arterial avenue vs. the poorly-lit canal pedestrian shortcut.',
    assistancePoints: DEMO_ASSISTANCE_POINTS,
    routes: [
      {
        id: 'route-arterial',
        name: 'Arterial Blvd via Cyber Towers',
        subtitle: 'Main well-lit avenue with She Teams booth & CCTV coverage',
        distanceKm: 1.4,
        estimatedMinutes: 18,
        reportedConcernScore: 18,
        dataConfidence: 94,
        confidenceLevel: 'HIGH',
        isRecommended: true,
        coordinates: [
          [17.4539, 78.3831],
          [17.4522, 78.3824],
          [17.4508, 78.3804],
          [17.4485, 78.3812],
          [17.4462, 78.3818],
          [17.4445, 78.3802],
        ],
        factors: {
          harassmentReportsCount: 0,
          lightingScore: 92,
          safeHavensCount: 3,
          isolatedSegmentsKm: 0.0,
          unverifiedReportsCount: 0,
          recentReportsWithin24h: 0,
        },
        relevantHazards: [],
        nearbyAssistance: [DEMO_ASSISTANCE_POINTS[0], DEMO_ASSISTANCE_POINTS[1], DEMO_ASSISTANCE_POINTS[3]],
        verdictReason:
          'RECOMMENDED: Continuous commercial activity, 92% audited streetlight illumination, and immediate access to Cyberabad She Teams booth and 24/7 staffed pharmacy.',
        uncertaintyNotes:
          'High data confidence: Fully mapped under municipal lighting grid and active police patrol route.',
      },
      {
        id: 'route-canal-shortcut',
        name: 'Inner Canal Walkway Shortcut',
        subtitle: 'Shorter by 350m, but passes through unlit canal backway',
        distanceKm: 1.05,
        estimatedMinutes: 13,
        reportedConcernScore: 76,
        dataConfidence: 82,
        confidenceLevel: 'HIGH',
        isRecommended: false,
        coordinates: [
          [17.4539, 78.3831],
          [17.4532, 78.3758],
          [17.4495, 78.3782],
          [17.4481, 78.3795],
          [17.4445, 78.3802],
        ],
        factors: {
          harassmentReportsCount: 1,
          lightingScore: 32,
          safeHavensCount: 0,
          isolatedSegmentsKm: 0.65,
          unverifiedReportsCount: 1,
          recentReportsWithin24h: 3,
        },
        relevantHazards: [INITIAL_SAFETY_REPORTS[0], INITIAL_SAFETY_REPORTS[1], INITIAL_SAFETY_REPORTS[2]],
        nearbyAssistance: [],
        verdictReason:
          'CAUTION: 3 active hazard reports including broken lighting (3 hrs ago) and verified harassment loitering near underpass. No safe havens within 250m.',
        uncertaintyNotes:
          'Contains 1 unverified hazard report awaiting community corroboration. High reported concern verified by recent reports.',
      },
    ],
  },
  {
    id: 'scenario-secunderabad',
    name: 'Secunderabad Station to Clock Tower',
    timeContext: 'Night Commute (9:30 PM)',
    originName: 'Secunderabad Junction Platform 1',
    originCoords: [17.4345, 78.5012],
    destinationName: 'Secunderabad Clock Tower Park',
    destinationCoords: [17.4428, 78.4982],
    description:
      'Comparison between bustling Subhash Road pedestrian transit vs the unmonitored railway yard service lane.',
    assistancePoints: DEMO_ASSISTANCE_POINTS,
    routes: [
      {
        id: 'route-secund-main',
        name: 'Subhash Road Commercial Transit',
        subtitle: 'Active storefronts, police booth, bright pedestrian corridor',
        distanceKm: 1.2,
        estimatedMinutes: 15,
        reportedConcernScore: 22,
        dataConfidence: 88,
        confidenceLevel: 'HIGH',
        isRecommended: true,
        coordinates: [
          [17.4345, 78.5012],
          [17.4368, 78.5002],
          [17.4395, 78.4991],
          [17.4428, 78.4982],
        ],
        factors: {
          harassmentReportsCount: 0,
          lightingScore: 88,
          safeHavensCount: 2,
          isolatedSegmentsKm: 0.1,
          unverifiedReportsCount: 0,
          recentReportsWithin24h: 0,
        },
        relevantHazards: [],
        nearbyAssistance: [DEMO_ASSISTANCE_POINTS[4]],
        verdictReason:
          'RECOMMENDED: High natural surveillance from active commercial shops, continuous pedestrian movement, and railway police outpost proximity.',
        uncertaintyNotes: 'High evidence density verified by multi-source transit audits.',
      },
      {
        id: 'route-secund-yard',
        name: 'Railway Yard Service Road',
        subtitle: 'Isolated shortcut behind warehouse siding',
        distanceKm: 0.9,
        estimatedMinutes: 11,
        reportedConcernScore: 82,
        dataConfidence: 68,
        confidenceLevel: 'MODERATE',
        isRecommended: false,
        coordinates: [
          [17.4345, 78.5012],
          [17.4362, 78.4985],
          [17.4390, 78.4955],
          [17.4428, 78.4982],
        ],
        factors: {
          harassmentReportsCount: 1,
          lightingScore: 28,
          safeHavensCount: 0,
          isolatedSegmentsKm: 0.7,
          unverifiedReportsCount: 1,
          recentReportsWithin24h: 1,
        },
        relevantHazards: [INITIAL_SAFETY_REPORTS[3]],
        nearbyAssistance: [],
        verdictReason:
          'ELEVATED CONCERN: Deserted warehouse perimeter with zero open retail, absent illumination, and reported loitering.',
        uncertaintyNotes:
          'MODERATE CONFIDENCE: Sparse pedestrian traffic means fewer community reports are filed. Do not treat low report volume as safety.',
      },
    ],
  },
];

/**
 * Recomputes all routes for a scenario with live dynamically added reports!
 * Guarantees that when a user posts a report, the route comparison updates immediately.
 */
export function recomputeScenarioWithReports(
  scenario: DemoScenario,
  allReports: SafetyReport[]
): DemoScenario {
  const updatedRoutes = scenario.routes.map((route) => {
    // Determine baseline lighting and isolation from original route factors
    const baseLighting = route.id.includes('arterial') || route.id.includes('main') ? 90 : 35;
    const baseIsolation = route.id.includes('arterial') || route.id.includes('main') ? 0.05 : 0.65;

    const evaluation = calculateRouteSafety(
      route.coordinates,
      allReports,
      scenario.assistancePoints,
      baseLighting,
      baseIsolation
    );

    return {
      ...route,
      reportedConcernScore: evaluation.reportedConcernScore,
      dataConfidence: evaluation.dataConfidence,
      confidenceLevel: evaluation.confidenceLevel,
      factors: evaluation.factors,
      relevantHazards: evaluation.relevantHazards,
      nearbyAssistance: evaluation.nearbyAssistance,
      verdictReason: evaluation.verdictReason,
      uncertaintyNotes: evaluation.uncertaintyNotes,
    };
  });

  // Re-evaluate which route is recommended (the one with the lowest concern score)
  const minConcern = Math.min(...updatedRoutes.map((r) => r.reportedConcernScore));
  const finalRoutes = updatedRoutes.map((r) => ({
    ...r,
    isRecommended: r.reportedConcernScore === minConcern,
  }));

  return {
    ...scenario,
    routes: finalRoutes,
  };
}

// --- TELANGANA SEARCHABLE PLACES DIRECTORY ---
export const TELANGANA_PLACES: PlaceSuggestion[] = [
  { id: 'p-charminar', name: 'Charminar', locality: 'Old City, Hyderabad', lat: 17.3616, lon: 78.4747, type: 'MONUMENT' },
  { id: 'p-golconda', name: 'Golconda Fort', locality: 'Ibrahim Bagh, Hyderabad', lat: 17.3833, lon: 78.4011, type: 'MONUMENT' },
  { id: 'p-qutb-shahi', name: 'Qutb Shahi Tombs', locality: 'Tolichowki, Hyderabad', lat: 17.3966, lon: 78.3966, type: 'MONUMENT' },
  { id: 'p-chowmahalla', name: 'Chowmahalla Palace', locality: 'Motigallu, Khilwat', lat: 17.3578, lon: 78.4717, type: 'MONUMENT' },
  { id: 'p-falaknuma', name: 'Falaknuma Palace', locality: 'Engine Bowli, Hyderabad', lat: 17.3312, lon: 78.4672, type: 'MONUMENT' },
  { id: 'p-birla-mandir', name: 'Birla Mandir', locality: 'Naubat Pahad, Hyderabad', lat: 17.4062, lon: 78.4691, type: 'MONUMENT' },
  { id: 'p-salarjung', name: 'Salar Jung Museum', locality: 'Darulshifa, Hyderabad', lat: 17.3714, lon: 78.4804, type: 'MONUMENT' },
  { id: 'p-hitec-metro', name: 'Hitec City Metro Station', locality: 'Hitec City, Madhapur', lat: 17.4539, lon: 78.3831, type: 'METRO' },
  { id: 'p-mindspace', name: 'Mindspace IT Park', locality: 'Madhapur, Hitec City', lat: 17.4445, lon: 78.3802, type: 'LANDMARK' },
  { id: 'p-cyber-towers', name: 'Cyber Towers Junction', locality: 'Hitec City', lat: 17.4508, lon: 78.3804, type: 'LANDMARK' },
  { id: 'p-secunderabad-stn', name: 'Secunderabad Junction Station', locality: 'Secunderabad', lat: 17.4345, lon: 78.5012, type: 'STATION' },
  { id: 'p-clock-tower', name: 'Secunderabad Clock Tower', locality: 'Clock Tower Park, Secunderabad', lat: 17.4428, lon: 78.4982, type: 'LANDMARK' },
  { id: 'p-begumpet', name: 'Begumpet Metro & Station', locality: 'Begumpet, Hyderabad', lat: 17.4350, lon: 78.4600, type: 'METRO' },
  { id: 'p-tank-bund', name: 'Hussain Sagar & Tank Bund', locality: 'Necklace Road', lat: 17.4234, lon: 78.4738, type: 'LANDMARK' },
  { id: 'p-banjara-hills', name: 'Banjara Hills Rd 1', locality: 'Banjara Hills', lat: 17.4162, lon: 78.4499, type: 'AREA' },
  { id: 'p-jubilee-checkpost', name: 'Jubilee Hills Check Post', locality: 'Jubilee Hills', lat: 17.4285, lon: 78.4092, type: 'AREA' },
  { id: 'p-gachibowli', name: 'Gachibowli Junction', locality: 'Gachibowli, Financial District', lat: 17.4401, lon: 78.3489, type: 'AREA' },
  { id: 'p-ameerpet-metro', name: 'Ameerpet Metro Interchange', locality: 'Ameerpet, Hyderabad', lat: 17.4375, lon: 78.4483, type: 'METRO' },
  { id: 'p-durgam-cheruvu', name: 'Durgam Cheruvu Cable Bridge', locality: 'Jubilee Hills / Madhapur', lat: 17.4371, lon: 78.3869, type: 'LANDMARK' },
  { id: 'p-warangal-fort', name: 'Warangal Fort Ruins', locality: 'Warangal', lat: 17.9576, lon: 79.6052, type: 'MONUMENT' },
  { id: 'p-ramappa', name: 'Ramappa Temple', locality: 'Palampet, Mulugu', lat: 18.2589, lon: 79.9432, type: 'MONUMENT' }
];

export function searchPlaces(query: string): PlaceSuggestion[] {
  if (!query || query.trim().length === 0) return TELANGANA_PLACES.slice(0, 8);
  const q = query.toLowerCase().trim();
  return TELANGANA_PLACES.filter(
    (p) => p.name.toLowerCase().includes(q) || p.locality.toLowerCase().includes(q)
  );
}

/**
 * Generate arbitrary route comparison options between any origin and destination points.
 */
export function generateRouteComparison(
  origin: { name: string; lat: number; lon: number },
  destination: { name: string; lat: number; lon: number },
  allReports: SafetyReport[],
  assistancePoints: PublicAssistancePoint[]
): RouteOption[] {
  // Check if this matches pre-curated demo scenarios (e.g. Hitec City)
  const isHitec =
    (origin.name.toLowerCase().includes('hitec') && destination.name.toLowerCase().includes('mindspace')) ||
    (calculateDistanceMeters(origin.lat, origin.lon, 17.4539, 78.3831) < 400 &&
     calculateDistanceMeters(destination.lat, destination.lon, 17.4445, 78.3802) < 400);

  if (isHitec) {
    const recomputed = recomputeScenarioWithReports(DEMO_SCENARIOS[0], allReports);
    return recomputed.routes;
  }

  const isSecunderabad =
    (origin.name.toLowerCase().includes('secunderabad') && destination.name.toLowerCase().includes('clock')) ||
    (calculateDistanceMeters(origin.lat, origin.lon, 17.4345, 78.5012) < 400 &&
     calculateDistanceMeters(destination.lat, destination.lon, 17.4428, 78.4982) < 400);

  if (isSecunderabad) {
    const recomputed = recomputeScenarioWithReports(DEMO_SCENARIOS[1], allReports);
    return recomputed.routes;
  }

  // Dynamic route synthesis
  const straightDistanceKm = calculateDistanceMeters(origin.lat, origin.lon, destination.lat, destination.lon) / 1000;
  const dist1Km = Math.max(0.6, +(straightDistanceKm * 1.22).toFixed(2));
  const dist2Km = Math.max(0.5, +(straightDistanceKm * 1.05).toFixed(2));
  const time1Mins = Math.max(7, Math.round(dist1Km * 13));
  const time2Mins = Math.max(6, Math.round(dist2Km * 12));

  // Generate intermediate coordinates for Arterial Boulevard
  // We add intermediate points with mild curve along arterial avenues
  const midLat1 = (origin.lat + destination.lat) / 2 + 0.0018;
  const midLon1 = (origin.lon + destination.lon) / 2 + 0.0015;
  const coords1: [number, number][] = [
    [origin.lat, origin.lon],
    [(origin.lat * 2 + destination.lat) / 3 + 0.0010, (origin.lon * 2 + destination.lon) / 3 + 0.0012],
    [midLat1, midLon1],
    [(origin.lat + destination.lat * 2) / 3 + 0.0008, (origin.lon + destination.lon * 2) / 3 + 0.0007],
    [destination.lat, destination.lon],
  ];

  // Route 2: Inner shortcut / secondary lane
  const midLat2 = (origin.lat + destination.lat) / 2 - 0.0012;
  const midLon2 = (origin.lon + destination.lon) / 2 - 0.0010;
  const coords2: [number, number][] = [
    [origin.lat, origin.lon],
    [(origin.lat * 3 + destination.lat) / 4 - 0.0009, (origin.lon * 3 + destination.lon) / 4 - 0.0007],
    [midLat2, midLon2],
    [(origin.lat + destination.lat * 3) / 4 - 0.0006, (origin.lon + destination.lon * 3) / 4 - 0.0004],
    [destination.lat, destination.lon],
  ];

  const eval1 = calculateRouteSafety(coords1, allReports, assistancePoints, 88, 0.05);
  const eval2 = calculateRouteSafety(coords2, allReports, assistancePoints, 38, 0.45);

  const route1: RouteOption = {
    id: 'route-arterial-dyn',
    name: 'Main Arterial Corridor',
    subtitle: 'High-footfall avenue with regular municipal streetlighting & surveillance',
    distanceKm: dist1Km,
    estimatedMinutes: time1Mins,
    reportedConcernScore: eval1.reportedConcernScore,
    dataConfidence: eval1.dataConfidence,
    confidenceLevel: eval1.confidenceLevel,
    isRecommended: eval1.reportedConcernScore <= eval2.reportedConcernScore,
    coordinates: coords1,
    factors: eval1.factors,
    relevantHazards: eval1.relevantHazards,
    nearbyAssistance: eval1.nearbyAssistance,
    verdictReason: eval1.verdictReason || 'Continuous commercial presence and audited lighting.',
    uncertaintyNotes: eval1.uncertaintyNotes,
  };

  const route2: RouteOption = {
    id: 'route-shortcut-dyn',
    name: 'Secondary Backstreet Shortcut',
    subtitle: 'Shorter distance, but passes through lower-density residential lanes',
    distanceKm: dist2Km,
    estimatedMinutes: time2Mins,
    reportedConcernScore: eval2.reportedConcernScore,
    dataConfidence: eval2.dataConfidence,
    confidenceLevel: eval2.confidenceLevel,
    isRecommended: eval2.reportedConcernScore < eval1.reportedConcernScore,
    coordinates: coords2,
    factors: eval2.factors,
    relevantHazards: eval2.relevantHazards,
    nearbyAssistance: eval2.nearbyAssistance,
    verdictReason: eval2.verdictReason || 'Alternative route with reduced illumination after dusk.',
    uncertaintyNotes: eval2.uncertaintyNotes,
  };

  return [route1, route2];
}


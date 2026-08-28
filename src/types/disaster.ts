export type EmergencyType =
  | 'TRAPPED_COLLAPSE'
  | 'CRITICAL_MEDICAL'
  | 'RISING_FLOOD'
  | 'BLOCKED_ROAD'
  | 'FOOD_WATER_ESSENTIALS'
  | 'EVACUATION_NEEDED'
  | 'HAZMAT_FIRE';

export type PriorityLevel = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_STANDARD';

export type IncidentStatus =
  | 'UNVERIFIED'
  | 'AI_TRIAGED'
  | 'DISPATCHED'
  | 'ON_SCENE'
  | 'RESOLVED_SAVED';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface IncidentReport {
  id: string;
  rawText: string;
  author: string;
  platform: 'X / Twitter' | 'Telegram SOS' | 'WhatsApp Emergency' | 'Facebook Relief' | 'Ham Radio Relay' | 'Direct 112 / Web' | 'Direct 911 Web';
  timestamp: string;
  locationName: string;
  coordinates: Coordinates;
  emergencyType: EmergencyType;
  priorityLevel: PriorityLevel;
  severityScore: number; // 1 - 100
  peopleAffectedCount: number;
  vulnerableGroups: string[];
  requiredEquipment: string[];
  recommendedAction: string;
  urgencyReasoning: string;
  status: IncidentStatus;
  assignedTeamId?: string;
  assignedTeamName?: string;
  contactInfo?: string;
  duplicateClusterCount?: number;
  clusterId?: string;
  triageConfidence: number; // 0 - 100%
  extractedAt?: string;
}

export type RescueTeamType =
  | 'WATER_RESCUE'
  | 'URBAN_SAR'
  | 'MEDEVAC_AIR'
  | 'PARAMEDIC_GROUND'
  | 'ENGINEERING_HAZMAT';

export type RescueTeamStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'ON_SCENE'
  | 'RETURNING'
  | 'REFUELING';

export interface RescueTeam {
  id: string;
  callsign: string;
  name: string;
  type: RescueTeamType;
  status: RescueTeamStatus;
  coordinates: Coordinates;
  capacity: number;
  equipment: string[];
  currentMissionIncidentId?: string;
  baseName: string;
  etaMinutes?: number;
  rescuedCount: number;
}

export interface HazardZone {
  id: string;
  name: string;
  type: 'FLOOD_SURGE' | 'DEBRIS_FIELD' | 'STRUCTURAL_COLLAPSE_ZONE' | 'ROAD_BLOCKADE';
  coordinates: [number, number][]; // Polygon vertices [lat, lng]
  color: string;
  fillOpacity: number;
  description: string;
}

export interface SimulatedPost {
  rawText: string;
  author: string;
  platform: IncidentReport['platform'];
  scenarioId: string;
  locationHint?: string;
  pLevelExpected?: PriorityLevel;
}

export interface DisasterScenario {
  id: string;
  name: string;
  subtitle: string;
  disasterType: string;
  centerCoordinates: Coordinates;
  zoomLevel: number;
  description: string;
  hazardZones: HazardZone[];
  initialIncidents: IncidentReport[];
  initialRescueFleet: RescueTeam[];
  simulatedIncomingFeed: SimulatedPost[];
}

export interface SituationReportData {
  executiveSummary: string;
  criticalThreatAssessment: string;
  priorityDispatchDirectives: string[];
  resourceBottlenecks: string;
  estimatedCasualtyRisk: string;
  publicSafetyBroadcast: string;
  generatedAt: string;
}

export interface DispatchRecommendation {
  recommendedTeamId: string | null;
  rationale: string;
  estimatedEtaMinutes: number;
  actionChecklist: string[];
}

import { Coordinates, IncidentReport, RescueTeam, SituationReportData, DispatchRecommendation, EmergencyType, PriorityLevel } from '../types/disaster';

export async function analyzeSocialPost(
  rawText: string,
  scenarioContext?: string,
  author?: string,
  platform?: string
): Promise<{
  success: boolean;
  data: Partial<IncidentReport> & { latOffset?: number; lngOffset?: number; isDuplicateLikely?: boolean };
  source?: string;
}> {
  try {
    const res = await fetch('/api/analyze-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText,
        scenarioContext,
        author: author || 'Anonymous Reporter',
        platform: platform || 'X / Twitter',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('Backend analyze-post failed, using client heuristic fallback:', error);
    // Instant fallback
    return {
      success: true,
      data: clientFallbackAnalyze(rawText),
      source: 'client-offline-fallback',
    };
  }
}

export async function generateSituationReport(
  incidents: IncidentReport[],
  activeScenario: any,
  rescueFleet: RescueTeam[]
): Promise<SituationReportData> {
  try {
    const res = await fetch('/api/situation-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidents, activeScenario, rescueFleet }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    return {
      ...data.sitrep,
      generatedAt: new Date().toLocaleTimeString(),
    };
  } catch (error) {
    console.warn('Backend situation-report failed, returning client fallback:', error);
    const p1Count = incidents.filter((i) => i.priorityLevel === 'P1_CRITICAL').length;
    const totalLives = incidents.reduce((sum, i) => sum + (i.peopleAffectedCount || 1), 0);

    return {
      executiveSummary: `Tactical disaster intelligence operations active for ${activeScenario?.name || 'Active Zone'}. AI scanning has cataloged ${incidents.length} distress alerts with ${totalLives} confirmed civilians at risk.`,
      criticalThreatAssessment: `Identified ${p1Count} Priority 1 life-threatening incidents requiring immediate specialized watercraft or USAR extraction.`,
      priorityDispatchDirectives: [
        'Deploy marine Zodiac units to inundated residential sectors.',
        'Mobilize USAR heavy crane & shoring units for structural rubble extractions.',
        'Establish medical triage point for oxygen and insulin delivery.',
        'Clear blocked arterial routes for emergency response transport.',
      ],
      resourceBottlenecks: 'High demand for shallow-draft rescue craft and portable oxygen generators.',
      estimatedCasualtyRisk: p1Count > 2 ? 'Severe' : 'Moderate',
      publicSafetyBroadcast: 'EMERGENCY ADVISORY: Move to upper floors. Keep phone battery conserved. Rescuers are actively responding to Priority 1 distress signals.',
      generatedAt: new Date().toLocaleTimeString(),
    };
  }
}

export async function getDispatchRecommendation(
  incident: IncidentReport,
  availableTeams: RescueTeam[]
): Promise<DispatchRecommendation> {
  try {
    const res = await fetch('/api/dispatch-recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident, availableTeams }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn('Dispatch recommendation failed, choosing best team heuristically:', error);
    // Find matching team by type
    let best = availableTeams.find((t) => {
      if (incident.emergencyType === 'RISING_FLOOD' && t.type === 'WATER_RESCUE') return true;
      if (incident.emergencyType === 'TRAPPED_COLLAPSE' && t.type === 'URBAN_SAR') return true;
      if (incident.emergencyType === 'CRITICAL_MEDICAL' && (t.type === 'PARAMEDIC_GROUND' || t.type === 'MEDEVAC_AIR')) return true;
      return false;
    });

    if (!best && availableTeams.length > 0) {
      best = availableTeams[0];
    }

    return {
      recommendedTeamId: best?.id || null,
      rationale: best
        ? `Selected ${best.name} based on emergency type matching and tactical equipment suitability.`
        : 'No units currently available at station.',
      estimatedEtaMinutes: 10,
      actionChecklist: ['Deploy from staging zone', 'Establish radio comms', 'Extract and triage casualties'],
    };
  }
}

function clientFallbackAnalyze(text: string) {
  const lower = text.toLowerCase();
  let priorityLevel: PriorityLevel = 'P3_STANDARD';
  let emergencyType: EmergencyType = 'EVACUATION_NEEDED';
  let severityScore = 45;
  const vulnerableGroups: string[] = [];
  const requiredEquipment: string[] = ['Standard SAR Kit'];

  if (
    lower.includes('child') ||
    lower.includes('kid') ||
    lower.includes('baby') ||
    lower.includes('infant') ||
    lower.includes('oxygen') ||
    lower.includes('collapsed') ||
    lower.includes('rubble') ||
    lower.includes('trapped') ||
    lower.includes('drowning') ||
    lower.includes('bleeding')
  ) {
    priorityLevel = 'P1_CRITICAL';
    severityScore = 96;
    if (lower.includes('oxygen') || lower.includes('bleeding')) {
      emergencyType = 'CRITICAL_MEDICAL';
      requiredEquipment.push('Oxygen Cylinders', 'Paramedic Kit');
    } else if (lower.includes('collapsed') || lower.includes('rubble')) {
      emergencyType = 'TRAPPED_COLLAPSE';
      requiredEquipment.push('Hydraulic Spreaders', 'K9 Search Dogs');
    } else {
      emergencyType = 'RISING_FLOOD';
      requiredEquipment.push('Zodiac Rescue Boat', 'Swiftwater Drysuits');
    }

    if (lower.includes('child') || lower.includes('kid') || lower.includes('baby')) {
      vulnerableGroups.push('Children / Minors');
    }
  } else if (
    lower.includes('elderly') ||
    lower.includes('grandma') ||
    lower.includes('senior') ||
    lower.includes('pregnant') ||
    lower.includes('no food') ||
    lower.includes('no water')
  ) {
    priorityLevel = 'P2_HIGH';
    severityScore = 75;
    emergencyType = lower.includes('food') || lower.includes('water') ? 'FOOD_WATER_ESSENTIALS' : 'RISING_FLOOD';
    if (lower.includes('elderly') || lower.includes('senior')) vulnerableGroups.push('Elderly Seniors');
    if (lower.includes('pregnant')) vulnerableGroups.push('Pregnant Mother');
    requiredEquipment.push('Amphibious Vehicle', 'Potable Water Packs');
  } else if (lower.includes('road') || lower.includes('bridge') || lower.includes('tree')) {
    priorityLevel = 'P3_STANDARD';
    severityScore = 40;
    emergencyType = 'BLOCKED_ROAD';
    requiredEquipment.push('Heavy Bulldozer', 'Chainsaws');
  }

  return {
    locationName: 'Disaster Grid Point',
    latOffset: (Math.random() - 0.5) * 0.04,
    lngOffset: (Math.random() - 0.5) * 0.04,
    emergencyType,
    priorityLevel,
    severityScore,
    peopleAffectedCount: 2,
    vulnerableGroups: vulnerableGroups.length > 0 ? vulnerableGroups : ['Displaced Citizens'],
    requiredEquipment,
    recommendedAction: `Rapid dispatch of ${requiredEquipment[0]} to reported coordinates.`,
    urgencyReasoning: `Keywords identified trigger ${priorityLevel} triage priority.`,
    contactPhoneOrHandle: 'Social Relay',
    isDuplicateLikely: false,
  };
}

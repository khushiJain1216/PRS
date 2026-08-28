import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Initialize Google GenAI client (lazy / server-side)
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Single Social Media Post AI Analysis & Extraction
app.post("/api/analyze-post", async (req, res) => {
  try {
    const { rawText, scenarioContext, author, platform, timestamp } = req.body;

    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "rawText string is required" });
    }

    const ai = getGenAI();
    if (!ai) {
      // Fallback deterministic extractor if API key is not yet configured
      return res.json({
        success: true,
        data: fallbackAnalyze(rawText, scenarioContext),
        source: "heuristic-fallback",
      });
    }

    const prompt = `You are a specialized Disaster Social Media Intelligence & Search & Rescue Triage AI for Indian Emergency Disaster Response Authorities (NDRF, SDRF, Municipal Corporation Disaster Management Cells like Pune PMC / Mumbai MCGM, and 108 Emergency Medical Services).
Analyze the following raw disaster distress post/message (which may include Indian locations, landmarks, Hinglish/Marathi/Hindi mixed terms like 'ekta nagri', 'nullah', 'chawl', 'wada', 'cusecs', 'dam release', 'ghat') and extract structured emergency intelligence:

RAW POST:
"""
${rawText}
"""

SCENARIO CONTEXT: ${scenarioContext || "Active Indian Disaster Sector (Pune Mula-Mutha Flood / Mumbai Cloudburst / Western Ghats Landslide)"}

PRIORITY CATEGORIZATION RULES (NDMA & Tactical SAR Standard):
- 🚨 PRIORITY 1 (CRITICAL / Code Red - Severity 90-100):
  * Children, infants, or pregnant women trapped or in immediate danger in submerged or collapsing structures
  * Active medical emergency (oxygen cylinder failure, ventilator power failure, dialysis cut off, severe bleeding, unconscious)
  * Structural / Wada / Building collapse with victims trapped under debris or tapping
  * Rapidly rising floodwaters from dam discharges (e.g. Khadakwasla / Mula-Mutha) with ground floors submerged and no upper retreat
  * Persons or vehicles swept into raging river / nullah currents
- 🟠 PRIORITY 2 (HIGH / Code Orange - Severity 60-89):
  * Senior citizens or vulnerable patients stranded on upper floors with depleting insulin, food, or clean drinking water (>24h)
  * Flooded homes with families currently safe on terrace but isolated by 4+ feet of water
  * Non-life-threatening injuries (fractures, hypothermia, lacerations)
- 🟢 PRIORITY 3 (STANDARD / Code Green - Severity 1-59):
  * General shelter transport requests, safe inside municipal relief camps or community halls
  * Arterial road blockages, fallen trees, submerged underpasses / subways needing clearance (no active casualties)
  * Waterlogging updates or traffic diversions

Extract all fields strictly adhering to the JSON schema. Estimate latitude and longitude offsets around the scenario center if specific streets or landmarks are mentioned.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            locationName: {
              type: Type.STRING,
              description: "Specific landmark, street address, building or neighborhood mentioned in the post",
            },
            latOffset: {
              type: Type.NUMBER,
              description: "Relative latitude offset from -0.08 to +0.08 relative to disaster ground zero",
            },
            lngOffset: {
              type: Type.NUMBER,
              description: "Relative longitude offset from -0.08 to +0.08 relative to disaster ground zero",
            },
            emergencyType: {
              type: Type.STRING,
              description: "Must be one of: TRAPPED_COLLAPSE, CRITICAL_MEDICAL, RISING_FLOOD, BLOCKED_ROAD, FOOD_WATER_ESSENTIALS, EVACUATION_NEEDED, HAZMAT_FIRE",
            },
            priorityLevel: {
              type: Type.STRING,
              description: "Must be one of: P1_CRITICAL, P2_HIGH, P3_STANDARD",
            },
            severityScore: {
              type: Type.INTEGER,
              description: "Integer from 1 to 100 representing life-threat urgency",
            },
            peopleAffectedCount: {
              type: Type.INTEGER,
              description: "Estimated number of individuals affected or trapped (default to 1 if unspecified)",
            },
            vulnerableGroups: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific vulnerable persons like '2 children', '85yo grandmother with asthma', '1 infant', 'oxygen dependent patient'",
            },
            requiredEquipment: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key rescue equipment needed, e.g. 'Inflatable Zodiac Boat', 'Portable Oxygen Tank', 'Hydraulic Spreader/Cutter', 'Helicopter Winch', 'Thermal Scanner', 'First Aid Trauma Kit'",
            },
            recommendedAction: {
              type: Type.STRING,
              description: "Concise actionable command for rescue dispatchers (max 15 words)",
            },
            urgencyReasoning: {
              type: Type.STRING,
              description: "Brief rationale explaining why this priority level and severity score were assigned",
            },
            contactPhoneOrHandle: {
              type: Type.STRING,
              description: "Any phone number, radio channel, or social handle mentioned, or 'Unknown'",
            },
            isDuplicateLikely: {
              type: Type.BOOLEAN,
              description: "Whether this post seems like a duplicate or retweet of a common known incident",
            },
          },
          required: [
            "locationName",
            "emergencyType",
            "priorityLevel",
            "severityScore",
            "peopleAffectedCount",
            "vulnerableGroups",
            "requiredEquipment",
            "recommendedAction",
            "urgencyReasoning",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      data: parsed,
      source: "gemini-3.7-flash",
    });
  } catch (err: any) {
    console.error("Error in /api/analyze-post:", err);
    // Return fallback so user never gets a broken experience
    const fallback = fallbackAnalyze(req.body.rawText || "", req.body.scenarioContext);
    return res.json({
      success: true,
      data: fallback,
      source: "fallback-on-error",
      errorMessage: err?.message,
    });
  }
});

// AI Incident Commander Situation Report Generator
app.post("/api/situation-report", async (req, res) => {
  try {
    const { incidents, activeScenario, rescueFleet } = req.body;

    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        sitrep: generateFallbackSitRep(incidents, activeScenario, rescueFleet),
      });
    }

    const p1Count = incidents.filter((i: any) => i.priorityLevel === "P1_CRITICAL").length;
    const p2Count = incidents.filter((i: any) => i.priorityLevel === "P2_HIGH").length;
    const p3Count = incidents.filter((i: any) => i.priorityLevel === "P3_STANDARD").length;
    const totalLives = incidents.reduce((sum: number, i: any) => sum + (i.peopleAffectedCount || 1), 0);

    const prompt = `You are the Lead Disaster Incident Commander and Search & Rescue AI Operations Strategist for the District Disaster Management Authority (DDMA / NDRF / State SDRF).
Generate a concise, high-impact tactical Situation Report (SitRep) based on real-time social media and emergency channel intelligence:

Active Scenario: ${activeScenario?.name || "Pune Mula-Mutha Flood & Khadakwasla Dam Release"}
Total Reported Incidents: ${incidents.length}
- 🚨 Priority 1 (Life-Threatening / Critical): ${p1Count} incidents
- 🟠 Priority 2 (High Urgency / Vulnerable): ${p2Count} incidents
- 🟢 Priority 3 (Standard / Evacuation / Blockades): ${p3Count} incidents
Total Estimated Persons at Risk: ${totalLives}
Available Indian Rescue Units (NDRF / PMC / SDRF / 108 EMS / Army): ${JSON.stringify(rescueFleet?.map((f: any) => ({ name: f.name, type: f.type, status: f.status, base: f.baseName })))}

Key high-priority incident excerpts:
${incidents.slice(0, 8).map((inc: any, idx: number) => `[#${idx + 1}] [${inc.priorityLevel}] ${inc.locationName}: ${inc.rawText.slice(0, 100)} (Affecting: ${inc.peopleAffectedCount} pax)`).join("\n")}

Respond with a structured JSON containing:
1. "executiveSummary": High-level strategic overview (2 sentences)
2. "criticalThreatAssessment": Key life-threat vectors (e.g. Khadakwasla discharge surge, Sinhagad Road inundation, wada structural collapses, hospital power/oxygen backup)
3. "priorityDispatchDirectives": 3-4 bulleted imperative action commands for NDRF, SDRF, and Municipal Fire Brigade field teams
4. "resourceBottlenecks": Any equipment or team deficits (e.g. need additional Gemini OBM boats, high-capacity dewatering pumps, IAF winch helicopters)
5. "estimatedCasualtyRisk": Low, Moderate, Severe, or Extreme
6. "publicSafetyBroadcast": A 1-sentence urgent broadcast advisory for citizens in the affected city/region`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            criticalThreatAssessment: { type: Type.STRING },
            priorityDispatchDirectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            resourceBottlenecks: { type: Type.STRING },
            estimatedCasualtyRisk: { type: Type.STRING },
            publicSafetyBroadcast: { type: Type.STRING },
          },
          required: [
            "executiveSummary",
            "criticalThreatAssessment",
            "priorityDispatchDirectives",
            "resourceBottlenecks",
            "estimatedCasualtyRisk",
            "publicSafetyBroadcast",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      sitrep: parsed,
    });
  } catch (err: any) {
    console.error("Error in /api/situation-report:", err);
    return res.json({
      success: true,
      sitrep: generateFallbackSitRep(req.body.incidents, req.body.activeScenario, req.body.rescueFleet),
    });
  }
});

// AI Dispatch Optimization: Matches rescue units to P1/P2 incidents
app.post("/api/dispatch-recommendation", async (req, res) => {
  try {
    const { incident, availableTeams } = req.body;

    const ai = getGenAI();
    if (!ai || !availableTeams || availableTeams.length === 0) {
      // Find best team heuristically
      const best = availableTeams?.[0] || null;
      return res.json({
        success: true,
        recommendedTeamId: best?.id || null,
        rationale: "Matched to primary available first response unit based on priority queue.",
        estimatedEtaMinutes: 12,
        actionChecklist: ["Establish radio contact", "Deploy perimeter containment", "Initiate extraction"],
      });
    }

    const prompt = `Recommend the optimal rescue team to dispatch for the following disaster incident:
Incident:
- Location: ${incident.locationName}
- Type: ${incident.emergencyType}
- Priority: ${incident.priorityLevel} (Severity: ${incident.severityScore}/100)
- People at risk: ${incident.peopleAffectedCount} (${(incident.vulnerableGroups || []).join(", ")})
- Required Equipment: ${(incident.requiredEquipment || []).join(", ")}
- Details: "${incident.rawText}"

Available Rescue Fleet:
${JSON.stringify(availableTeams.map((t: any) => ({ id: t.id, name: t.name, type: t.type, equipment: t.equipment, currentBase: t.baseName })))}

Select the best team and provide tactical instructions.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedTeamId: { type: Type.STRING },
            rationale: { type: Type.STRING },
            estimatedEtaMinutes: { type: Type.INTEGER },
            actionChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["recommendedTeamId", "rationale", "estimatedEtaMinutes", "actionChecklist"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      ...parsed,
    });
  } catch (err: any) {
    console.error("Error in /api/dispatch-recommendation:", err);
    return res.json({
      success: true,
      recommendedTeamId: req.body.availableTeams?.[0]?.id || null,
      rationale: "Automated direct assignment to nearest ready SAR unit.",
      estimatedEtaMinutes: 15,
      actionChecklist: ["Rapid response deployment", "Assess scene safety", "Execute casualty extraction"],
    });
  }
});

// Heuristic fallback analyzer for instant offline resilience
function fallbackAnalyze(text: string, context?: string) {
  const lower = text.toLowerCase();

  let emergencyType = "EVACUATION_NEEDED";
  let priorityLevel = "P3_STANDARD";
  let severityScore = 45;
  const vulnerableGroups: string[] = [];
  const requiredEquipment: string[] = ["Standard First Aid", "Evacuation Transport"];

  // Priority 1 triggers
  if (
    lower.includes("child") ||
    lower.includes("kid") ||
    lower.includes("baby") ||
    lower.includes("infant") ||
    lower.includes("oxygen") ||
    lower.includes("collapsed") ||
    lower.includes("rubble") ||
    lower.includes("under debris") ||
    lower.includes("trapped") ||
    lower.includes("drowning") ||
    lower.includes("bleeding") ||
    lower.includes("heart") ||
    lower.includes("dialysis") ||
    lower.includes("icu") ||
    lower.includes("urgent") ||
    lower.includes("dying") ||
    lower.includes("bachhe") ||
    lower.includes("madad") ||
    lower.includes("submerged") ||
    lower.includes("ekta nagri") ||
    lower.includes("dam release") ||
    lower.includes("cusecs") ||
    lower.includes("wada collapse")
  ) {
    priorityLevel = "P1_CRITICAL";
    severityScore = 96;

    if (lower.includes("oxygen") || lower.includes("dialysis") || lower.includes("bleeding") || lower.includes("heart") || lower.includes("icu") || lower.includes("sassoon")) {
      emergencyType = "CRITICAL_MEDICAL";
      requiredEquipment.push("Portable Oxygen Cylinders", "ALS Trauma Ambulance", "108 Paramedic Team");
    } else if (lower.includes("collapsed") || lower.includes("rubble") || lower.includes("debris") || lower.includes("wada") || lower.includes("timber")) {
      emergencyType = "TRAPPED_COLLAPSE";
      requiredEquipment.push("Hydraulic Cutters", "Search Dogs", "Acoustic Listeners", "PMC USAR Squad");
    } else if (lower.includes("water") || lower.includes("roof") || lower.includes("flood") || lower.includes("drowning") || lower.includes("sinhagad") || lower.includes("river") || lower.includes("nullah") || lower.includes("bhide")) {
      emergencyType = "RISING_FLOOD";
      requiredEquipment.push("NDRF Inflatable Gemini Boat", "Swiftwater Life Vests", "Deep Divers Gear");
    } else {
      emergencyType = "TRAPPED_COLLAPSE";
    }

    if (lower.includes("child") || lower.includes("kid") || lower.includes("baby") || lower.includes("infant") || lower.includes("bachhe") || lower.includes("toddler")) {
      vulnerableGroups.push("Children / Toddlers in flooded structure");
    }
    if (lower.includes("elderly") || lower.includes("bedridden") || lower.includes("senior") || lower.includes("aaji")) {
      vulnerableGroups.push("Bedridden Seniors / Elderly");
    }
  }
  // Priority 2 triggers
  else if (
    lower.includes("elderly") ||
    lower.includes("grandma") ||
    lower.includes("grandpa") ||
    lower.includes("senior") ||
    lower.includes("pregnant") ||
    lower.includes("no food") ||
    lower.includes("no water") ||
    lower.includes("starving") ||
    lower.includes("insulin") ||
    lower.includes("flood") ||
    lower.includes("terrace") ||
    lower.includes("slum") ||
    lower.includes("chawl")
  ) {
    priorityLevel = "P2_HIGH";
    severityScore = 78;
    emergencyType = lower.includes("food") || lower.includes("water") || lower.includes("ration") ? "FOOD_WATER_ESSENTIALS" : (lower.includes("pregnant") ? "CRITICAL_MEDICAL" : "RISING_FLOOD");
    if (lower.includes("elderly") || lower.includes("grandma") || lower.includes("senior") || lower.includes("aaji")) {
      vulnerableGroups.push("Elderly individuals / Chronic patients");
    }
    if (lower.includes("pregnant") || lower.includes("bhabhi") || lower.includes("labor")) {
      vulnerableGroups.push("Pregnant mother in labor");
    }
    requiredEquipment.push("Amphibious Rescue Craft", "Dry Food Rations & Potable Water", "Insulin Kits");
  }
  // Priority 3
  else if (lower.includes("road") || lower.includes("bridge") || lower.includes("tree") || lower.includes("blocked") || lower.includes("flyover") || lower.includes("subway") || lower.includes("pole") || lower.includes("traffic")) {
    priorityLevel = "P3_STANDARD";
    severityScore = 42;
    emergencyType = "BLOCKED_ROAD";
    requiredEquipment.push("Industrial Chainsaws", "JCB Earthmover / Crane", "MSEDCL Electrical Squad");
  }

  // Extract location heuristics
  let locationName = "Pune Disaster Sector";
  const locationMatches = text.match(/(?:near|at|on|in|around|beside|across)\s+([A-Z0-9][A-Za-z0-9\s,\.]{3,35})/);
  if (locationMatches && locationMatches[1]) {
    locationName = locationMatches[1].trim();
  }

  // Extract affected count
  let count = 1;
  const numMatch = text.match(/(\d+)\s*(?:people|persons|kids|children|elders|patients|souls|families|bachhe|residents)/i);
  if (numMatch && numMatch[1]) {
    count = parseInt(numMatch[1], 10);
  }

  return {
    locationName,
    latOffset: (Math.random() - 0.5) * 0.05,
    lngOffset: (Math.random() - 0.5) * 0.05,
    emergencyType,
    priorityLevel,
    severityScore,
    peopleAffectedCount: Math.max(1, count),
    vulnerableGroups: vulnerableGroups.length > 0 ? vulnerableGroups : ["General Public"],
    requiredEquipment,
    recommendedAction: `Deploy ${requiredEquipment[0] || "NDRF/PMC response squad"} to ${locationName}.`,
    urgencyReasoning: `Distress signals extracted with ${priorityLevel} severity classification in active sector.`,
    contactPhoneOrHandle: "112 / WhatsApp SOS Relay",
    isDuplicateLikely: false,
  };
}

function generateFallbackSitRep(incidents: any[] = [], activeScenario: any, rescueFleet: any[] = []) {
  const p1 = incidents.filter((i) => i.priorityLevel === "P1_CRITICAL").length;
  const total = incidents.reduce((acc, i) => acc + (i.peopleAffectedCount || 1), 0);

  return {
    executiveSummary: `District Disaster Management Authority (DDMA) SitRep active for ${activeScenario?.name || "Pune Mula-Mutha Flood & Khadakwasla Surge"}. Real-time AI social ingestion has triaged ${incidents.length} distress posts tracking ${total} individuals at risk across flooded low-lying basins.`,
    criticalThreatAssessment: `Active Khadakwasla Dam release (45,000+ cusecs) and Mutha river surge have triggered ${p1} Priority 1 life-threatening emergencies concentrated in Sinhagad Road (Ekta Nagri / Vitthalwadi), Deccan Gymkhana, and old city Wada structures.`,
    priorityDispatchDirectives: [
      "Prioritize NDRF 5th Battalion Gemini motorboats for ground-floor residential extractions in Ekta Nagri and Dwarka Complex.",
      "Deploy PMC Fire Brigade USAR Heavy squad with hydraulic cutters to structural/wada collapses in Kasba Peth.",
      "Position 108 Emergency Medical high-clearance ambulances at Sassoon Hospital and Deccan perimeter nodes with portable O2 banks.",
      "Task Bombay Sappers (Corps of Engineers) with heavy JCB clearing of arterial tree falls along Sancheti Hospital corridor.",
    ],
    resourceBottlenecks: "High demand for shallow-draft motorized inflatable boats (Gemini OBMs) and mobile 50kVA generators for dialysis/ICU power backup.",
    estimatedCasualtyRisk: p1 > 3 ? "Severe" : "Moderate",
    publicSafetyBroadcast: "PMC & POLICE URGENT ADVISORY: Evacuate ground floor residences along Sinhagad Road and Mula-Mutha riverbanks immediately. Avoid Baba Bhide Bridge and low-lying causeways. Call 112 or PMC Control Room 020-25501000 for emergency rescue boats.",
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Disaster Intelligence SAR Server running on http://localhost:${PORT}`);
  });
}

startServer();

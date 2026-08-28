import React, { useState, useEffect, useRef } from 'react';
import {
  DisasterScenario,
  IncidentReport,
  RescueTeam,
  SituationReportData,
} from './types/disaster';
import { DISASTER_SCENARIOS } from './data/mockDisasterScenarios';
import {
  analyzeSocialPost,
  generateSituationReport,
  getDispatchRecommendation,
} from './services/api';
import { Navbar } from './components/Navbar';
import { DisasterMap } from './components/DisasterMap';
import { LiveFeedScanner } from './components/LiveFeedScanner';
import { PriorityQueue } from './components/PriorityQueue';
import { RescueFleetManager } from './components/RescueFleetManager';
import { CommanderSitrep } from './components/CommanderSitrep';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { playTacticalChime } from './utils/audio';
import {
  Sparkles,
  AlertTriangle,
  Flame,
  Radio,
  Shield,
  LifeBuoy,
  X,
  Send,
  RefreshCw,
  PlusCircle,
  Activity,
  Layers,
} from 'lucide-react';

export default function App() {
  const [activeScenario, setActiveScenario] = useState<DisasterScenario>(
    DISASTER_SCENARIOS[0]
  );
  const [incidents, setIncidents] = useState<IncidentReport[]>(
    DISASTER_SCENARIOS[0].initialIncidents
  );
  const [rescueFleet, setRescueFleet] = useState<RescueTeam[]>(
    DISASTER_SCENARIOS[0].initialRescueFleet
  );
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'map' | 'queue' | 'fleet' | 'sitrep'>('dashboard');

  // SitRep State
  const [sitrep, setSitrep] = useState<SituationReportData | null>(null);
  const [isSitrepLoading, setIsSitrepLoading] = useState(false);
  const [isSitrepModalOpen, setIsSitrepModalOpen] = useState(false);

  // Sound & Simulation State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  // Manual Ingest Form in Modal State
  const [modalPostText, setModalPostText] = useState('');
  const [modalPlatform, setModalPlatform] = useState<IncidentReport['platform']>('WhatsApp Emergency');
  const [modalAuthor, setModalAuthor] = useState('');
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  // Simulation Feed Index Ref
  const feedIndexRef = useRef(0);

  // Initialize SitRep on load or scenario switch
  useEffect(() => {
    async function loadInitialSitrep() {
      setIsSitrepLoading(true);
      try {
        const report = await generateSituationReport(
          activeScenario.initialIncidents,
          activeScenario,
          activeScenario.initialRescueFleet
        );
        setSitrep(report);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSitrepLoading(false);
      }
    }
    loadInitialSitrep();
  }, [activeScenario.id]);

  // Simulated real-time incoming distress feed ticker
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(async () => {
      const feed = activeScenario.simulatedIncomingFeed;
      if (!feed || feed.length === 0) return;

      const nextPost = feed[feedIndexRef.current % feed.length];
      feedIndexRef.current += 1;

      // Extract via AI
      try {
        const analysis = await analyzeSocialPost(
          nextPost.rawText,
          activeScenario.name,
          nextPost.author,
          nextPost.platform
        );

        const extracted = analysis.data;
        const newInc: IncidentReport = {
          id: `sim-inc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          rawText: nextPost.rawText,
          author: nextPost.author,
          platform: nextPost.platform,
          timestamp: 'Just now',
          locationName: extracted.locationName || nextPost.locationHint || 'Disaster Sector',
          coordinates: {
            lat: activeScenario.centerCoordinates.lat + (extracted.latOffset ?? (Math.random() - 0.5) * 0.05),
            lng: activeScenario.centerCoordinates.lng + (extracted.lngOffset ?? (Math.random() - 0.5) * 0.05),
          },
          emergencyType: (extracted.emergencyType as any) || 'RISING_FLOOD',
          priorityLevel: (extracted.priorityLevel as any) || nextPost.pLevelExpected || 'P1_CRITICAL',
          severityScore: extracted.severityScore || 90,
          peopleAffectedCount: extracted.peopleAffectedCount || 2,
          vulnerableGroups: extracted.vulnerableGroups || ['Stranded civilians'],
          requiredEquipment: extracted.requiredEquipment || ['Rescue Boat', 'First Aid'],
          recommendedAction: extracted.recommendedAction || 'Immediate tactical extraction.',
          urgencyReasoning: extracted.urgencyReasoning || 'Incoming urgent distress report.',
          status: 'AI_TRIAGED',
          duplicateClusterCount: 1,
          triageConfidence: 96,
        };

        setIncidents((prev) => [newInc, ...prev]);

        if (soundEnabled) {
          if (newInc.priorityLevel === 'P1_CRITICAL') {
            playTacticalChime('P1_ALERT');
          } else {
            playTacticalChime('INGEST');
          }
        }
      } catch (err) {
        console.error('Simulated feed error:', err);
      }
    }, 15000); // Trigger a new simulated post every 15s

    return () => clearInterval(interval);
  }, [isSimulating, activeScenario, soundEnabled]);

  // Scenario Switcher
  const handleSelectScenario = (scenario: DisasterScenario) => {
    setActiveScenario(scenario);
    setIncidents(scenario.initialIncidents);
    setRescueFleet(scenario.initialRescueFleet);
    setSelectedIncident(null);
    feedIndexRef.current = 0;
  };

  // Reset Scenario Data
  const handleResetScenario = () => {
    setIncidents(activeScenario.initialIncidents);
    setRescueFleet(activeScenario.initialRescueFleet);
    setSelectedIncident(null);
    feedIndexRef.current = 0;
    if (soundEnabled) playTacticalChime('INGEST');
  };

  // Manual Ingest Handler
  const handleManualIngest = async (
    rawText: string,
    author: string = '@citizen_sos_reporter',
    platform: IncidentReport['platform'] = 'WhatsApp Emergency'
  ) => {
    const analysis = await analyzeSocialPost(
      rawText,
      activeScenario.name,
      author,
      platform
    );

    const extracted = analysis.data;
    const newInc: IncidentReport = {
      id: `manual-inc-${Date.now()}`,
      rawText,
      author,
      platform,
      timestamp: 'Just now',
      locationName: extracted.locationName || 'Reported Address',
      coordinates: {
        lat: activeScenario.centerCoordinates.lat + (extracted.latOffset ?? (Math.random() - 0.5) * 0.04),
        lng: activeScenario.centerCoordinates.lng + (extracted.lngOffset ?? (Math.random() - 0.5) * 0.04),
      },
      emergencyType: (extracted.emergencyType as any) || 'RISING_FLOOD',
      priorityLevel: (extracted.priorityLevel as any) || 'P1_CRITICAL',
      severityScore: extracted.severityScore || 92,
      peopleAffectedCount: extracted.peopleAffectedCount || 2,
      vulnerableGroups: extracted.vulnerableGroups || ['Extracted victim'],
      requiredEquipment: extracted.requiredEquipment || ['Rescue unit', 'Medical supplies'],
      recommendedAction: extracted.recommendedAction || 'Immediate first response deployment.',
      urgencyReasoning: extracted.urgencyReasoning || 'Social media SOS alert prioritized by AI.',
      status: 'AI_TRIAGED',
      duplicateClusterCount: 1,
      triageConfidence: 94,
    };

    setIncidents((prev) => [newInc, ...prev]);

    if (soundEnabled) {
      if (newInc.priorityLevel === 'P1_CRITICAL') {
        playTacticalChime('P1_ALERT');
      } else {
        playTacticalChime('INGEST');
      }
    }
  };

  // 1-Click Quick Dispatch Handler
  const handleQuickDispatch = (incident: IncidentReport) => {
    const availableTeams = rescueFleet.filter((f) => f.status === 'AVAILABLE');
    if (availableTeams.length === 0) return;

    const assignedTeam = availableTeams[0];

    // Update Fleet
    setRescueFleet((prev) =>
      prev.map((team) => {
        if (team.id === assignedTeam.id) {
          return {
            ...team,
            status: 'DISPATCHED',
            currentMissionIncidentId: incident.id,
            etaMinutes: Math.floor(Math.random() * 8) + 4,
          };
        }
        return team;
      })
    );

    // Update Incident
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incident.id) {
          return {
            ...inc,
            status: 'DISPATCHED',
            assignedTeamId: assignedTeam.id,
            assignedTeamName: `${assignedTeam.name} (${assignedTeam.callsign})`,
          };
        }
        return inc;
      })
    );

    if (soundEnabled) playTacticalChime('DISPATCH');
  };

  // Team Dispatch with specific Team ID
  const handleDispatchTeam = (incidentId: string, teamId: string) => {
    const targetTeam = rescueFleet.find((t) => t.id === teamId);
    if (!targetTeam) return;

    setRescueFleet((prev) =>
      prev.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            status: 'DISPATCHED',
            currentMissionIncidentId: incidentId,
            etaMinutes: Math.floor(Math.random() * 7) + 5,
          };
        }
        return team;
      })
    );

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            status: 'DISPATCHED',
            assignedTeamId: teamId,
            assignedTeamName: `${targetTeam.name} (${targetTeam.callsign})`,
          };
        }
        return inc;
      })
    );

    if (soundEnabled) playTacticalChime('DISPATCH');
  };

  // Mark Incident Resolved & Saved
  const handleResolveIncident = (incidentId: string) => {
    const targetInc = incidents.find((i) => i.id === incidentId);
    const count = targetInc?.peopleAffectedCount || 1;

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            status: 'RESOLVED_SAVED',
          };
        }
        return inc;
      })
    );

    // Release team if assigned
    setRescueFleet((prev) =>
      prev.map((team) => {
        if (team.currentMissionIncidentId === incidentId) {
          return {
            ...team,
            status: 'AVAILABLE',
            currentMissionIncidentId: undefined,
            rescuedCount: team.rescuedCount + count,
          };
        }
        return team;
      })
    );

    if (soundEnabled) playTacticalChime('RESCUED');
  };

  // 1-Click Auto Dispatch for all P1s
  const handleBatchAutoDispatchAllP1 = () => {
    const p1s = incidents.filter(
      (i) => i.priorityLevel === 'P1_CRITICAL' && (i.status === 'AI_TRIAGED' || i.status === 'UNVERIFIED')
    );
    let availableTeams = rescueFleet.filter((f) => f.status === 'AVAILABLE');

    if (p1s.length === 0 || availableTeams.length === 0) return;

    const assignedIncidentIds = new Set<string>();
    const fleetUpdates = [...rescueFleet];

    p1s.forEach((inc) => {
      if (availableTeams.length > 0) {
        const team = availableTeams[0];
        availableTeams = availableTeams.slice(1);
        assignedIncidentIds.add(inc.id);

        const teamIdx = fleetUpdates.findIndex((t) => t.id === team.id);
        if (teamIdx !== -1) {
          fleetUpdates[teamIdx] = {
            ...fleetUpdates[teamIdx],
            status: 'DISPATCHED',
            currentMissionIncidentId: inc.id,
            etaMinutes: Math.floor(Math.random() * 8) + 4,
          };
        }
      }
    });

    setRescueFleet(fleetUpdates);
    setIncidents((prev) =>
      prev.map((inc) => {
        if (assignedIncidentIds.has(inc.id)) {
          const assignedT = fleetUpdates.find((t) => t.currentMissionIncidentId === inc.id);
          return {
            ...inc,
            status: 'DISPATCHED',
            assignedTeamId: assignedT?.id,
            assignedTeamName: assignedT ? `${assignedT.name} (${assignedT.callsign})` : undefined,
          };
        }
        return inc;
      })
    );

    if (soundEnabled) playTacticalChime('DISPATCH');
  };

  // Refresh SitRep
  const handleRefreshSitrep = async () => {
    setIsSitrepLoading(true);
    try {
      const report = await generateSituationReport(incidents, activeScenario, rescueFleet);
      setSitrep(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSitrepLoading(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPostText.trim() || isModalProcessing) return;

    setIsModalProcessing(true);
    try {
      await handleManualIngest(
        modalPostText.trim(),
        modalAuthor.trim() || '@sos_reporter',
        modalPlatform
      );
      setModalPostText('');
      setIsNewPostModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsModalProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Tactical Navbar */}
      <Navbar
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        incidents={incidents}
        rescueFleet={rescueFleet}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating(!isSimulating)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenNewPostModal={() => setIsNewPostModalOpen(true)}
        onOpenSitrepModal={() => setIsSitrepModalOpen(true)}
        onResetScenario={handleResetScenario}
        activeView={activeView}
        onSelectView={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto flex flex-col gap-4">
        {/* Scenario Header Info Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2 font-sans">
                <span>{activeScenario.name}</span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {activeScenario.disasterType}
                </span>
              </div>
              <p className="text-slate-500 text-xs line-clamp-1 font-mono mt-0.5">
                {activeScenario.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Hazard Zones:</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold">
                {activeScenario.hazardZones.length} Active
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Sector Coordinates:</span>
              <span className="text-slate-900 font-semibold">
                {activeScenario.centerCoordinates.lat.toFixed(3)}°N, {Math.abs(activeScenario.centerCoordinates.lng).toFixed(3)}°E
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic View Content */}
        {activeView === 'dashboard' && (
          <div className="flex flex-col gap-4">
            {/* Split Top Row: Tactical Interactive Map + Live Feed Scanner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
              {/* Tactical Leaflet Map (7 cols) */}
              <div className="lg:col-span-7 h-[460px] lg:h-full">
                <DisasterMap
                  scenario={activeScenario}
                  incidents={incidents}
                  rescueFleet={rescueFleet}
                  selectedIncident={selectedIncident}
                  onSelectIncident={setSelectedIncident}
                  onQuickDispatch={handleQuickDispatch}
                />
              </div>

              {/* Real-time AI Social Scanner (5 cols) */}
              <div className="lg:col-span-5 flex flex-col">
                <LiveFeedScanner
                  incidents={incidents}
                  isScanning={isSimulating}
                  onManualIngest={handleManualIngest}
                  onSelectIncident={setSelectedIncident}
                />
              </div>
            </div>

            {/* Bottom Row: SAR Priority Queue */}
            <PriorityQueue
              incidents={incidents}
              rescueFleet={rescueFleet}
              onSelectIncident={setSelectedIncident}
              onQuickDispatch={handleQuickDispatch}
              onResolveIncident={handleResolveIncident}
              onBatchAutoDispatchAllP1={handleBatchAutoDispatchAllP1}
            />

            {/* Rescue Fleet Command Section */}
            <RescueFleetManager
              rescueFleet={rescueFleet}
              incidents={incidents}
              onAutoDispatchAll={handleBatchAutoDispatchAllP1}
              onResetFleet={handleResetScenario}
              onSelectIncident={setSelectedIncident}
            />
          </div>
        )}

        {activeView === 'map' && (
          <div className="h-[750px] w-full">
            <DisasterMap
              scenario={activeScenario}
              incidents={incidents}
              rescueFleet={rescueFleet}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
              onQuickDispatch={handleQuickDispatch}
            />
          </div>
        )}

        {activeView === 'queue' && (
          <PriorityQueue
            incidents={incidents}
            rescueFleet={rescueFleet}
            onSelectIncident={setSelectedIncident}
            onQuickDispatch={handleQuickDispatch}
            onResolveIncident={handleResolveIncident}
            onBatchAutoDispatchAllP1={handleBatchAutoDispatchAllP1}
          />
        )}

        {activeView === 'fleet' && (
          <RescueFleetManager
            rescueFleet={rescueFleet}
            incidents={incidents}
            onAutoDispatchAll={handleBatchAutoDispatchAllP1}
            onResetFleet={handleResetScenario}
            onSelectIncident={setSelectedIncident}
          />
        )}

        {activeView === 'sitrep' && (
          <CommanderSitrep
            sitrep={sitrep}
            isLoading={isSitrepLoading}
            incidents={incidents}
            rescueFleet={rescueFleet}
            onRefreshSitrep={handleRefreshSitrep}
          />
        )}
      </main>

      {/* SitRep Full Modal */}
      {isSitrepModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <CommanderSitrep
            sitrep={sitrep}
            isLoading={isSitrepLoading}
            incidents={incidents}
            rescueFleet={rescueFleet}
            onRefreshSitrep={handleRefreshSitrep}
            onClose={() => setIsSitrepModalOpen(false)}
          />
        </div>
      )}

      {/* Incident Detail Tactical Inspector Drawer / Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          scenario={activeScenario}
          rescueFleet={rescueFleet}
          onClose={() => setSelectedIncident(null)}
          onDispatchTeam={handleDispatchTeam}
          onResolveIncident={handleResolveIncident}
        />
      )}

      {/* Manual Ingest SOS Modal */}
      {isNewPostModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-sans text-sm text-slate-900 uppercase tracking-wider">
                    Manual SOS Ingestion
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Extract location, severity (P1/P2/P3) and trapped count via Gemini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPostModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-700 font-mono mb-1 text-[11px] uppercase tracking-wider">
                    Reporter Handle / Phone
                  </label>
                  <input
                    type="text"
                    value={modalAuthor}
                    onChange={(e) => setModalAuthor(e.target.value)}
                    placeholder="@citizen_sos_reporter"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono mb-1 text-[11px] uppercase tracking-wider">
                    Platform Source
                  </label>
                  <select
                    value={modalPlatform}
                    onChange={(e) => setModalPlatform(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="WhatsApp Emergency">WhatsApp Emergency</option>
                    <option value="X / Twitter">X / Twitter</option>
                    <option value="Direct 112 / Web">Direct 112 / Web</option>
                    <option value="Telegram SOS">Telegram SOS</option>
                    <option value="Ham Radio Relay">Ham Radio Relay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] uppercase tracking-wider mb-1">
                  Raw Distress Post Text
                </label>
                <textarea
                  value={modalPostText}
                  onChange={(e) => setModalPostText(e.target.value)}
                  placeholder={`e.g.: "URGENT SOS! Ground floor flooded near Sinhagad Road Ekta Nagri! 4 elderly people trapped with chest-deep water. Call 9822012345"`}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-700 border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalPostText.trim() || isModalProcessing}
                  className={`px-4 py-1.5 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 text-white ${
                    !modalPostText.trim() || isModalProcessing
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  }`}
                >
                  {isModalProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Extract & Queue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 px-4 text-xs font-mono text-slate-500 text-center">
        Crisis Triage AI • Tactical Emergency Command & Social Distress Dispatch
      </footer>
    </div>
  );
}

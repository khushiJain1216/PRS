import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { IncidentReport, RescueTeam, DispatchRecommendation, DisasterScenario } from '../types/disaster';
import { getDispatchRecommendation } from '../services/api';
import {
  X,
  MapPin,
  Clock,
  Radio,
  Users,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  LifeBuoy,
  Phone,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Compass,
  AlertOctagon,
  FileText,
} from 'lucide-react';

interface IncidentDetailModalProps {
  incident: IncidentReport;
  scenario: DisasterScenario;
  rescueFleet: RescueTeam[];
  onClose: () => void;
  onDispatchTeam: (incidentId: string, teamId: string) => void;
  onResolveIncident: (incidentId: string) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  scenario,
  rescueFleet,
  onClose,
  onDispatchTeam,
  onResolveIncident,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [recommendation, setRecommendation] = useState<DispatchRecommendation | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState<boolean>(false);

  // Contained Local Map Ref
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);

  const isP1 = incident.priorityLevel === 'P1_CRITICAL';
  const isP2 = incident.priorityLevel === 'P2_HIGH';
  const isDispatched = incident.status === 'DISPATCHED' || incident.status === 'ON_SCENE';
  const isResolved = incident.status === 'RESOLVED_SAVED';

  const availableTeams = rescueFleet.filter((f) => f.status === 'AVAILABLE');
  const assignedTeam = rescueFleet.find(
    (f) => f.id === incident.assignedTeamId || f.name === incident.assignedTeamName
  );

  // Fetch AI dispatch recommendation on mount
  useEffect(() => {
    let isMounted = true;
    async function loadRecommendation() {
      setIsLoadingRec(true);
      try {
        const rec = await getDispatchRecommendation(incident, availableTeams);
        if (isMounted) {
          setRecommendation(rec);
          if (rec.recommendedTeamId) {
            setSelectedTeamId(rec.recommendedTeamId);
          } else if (availableTeams.length > 0) {
            setSelectedTeamId(availableTeams[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoadingRec(false);
      }
    }

    if (!isResolved && !isDispatched) {
      loadRecommendation();
    }
    return () => {
      isMounted = false;
    };
  }, [incident.id]);

  // Initialize and contain the localized Tactical Sector Mini-Map
  useEffect(() => {
    if (!miniMapContainerRef.current) return;

    if (!miniMapInstanceRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        center: [incident.coordinates.lat, incident.coordinates.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Carto Voyager tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom zoom control
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Render Hazard polygons if within vicinity
      scenario.hazardZones.forEach((zone) => {
        L.polygon(zone.coordinates, {
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: zone.fillOpacity * 0.7,
          weight: 1.5,
          dashArray: zone.type === 'ROAD_BLOCKADE' ? '4, 4' : undefined,
        }).addTo(map);
      });

      // Casualty radius circle
      const circleColor = isP1 ? '#ef4444' : isP2 ? '#f59e0b' : '#10b981';
      L.circle([incident.coordinates.lat, incident.coordinates.lng], {
        radius: isP1 ? 220 : 120,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.18,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);

      // Main Incident Pin
      const pinColor = isResolved
        ? 'bg-slate-500 border-slate-300'
        : isP1
        ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-200'
        : isP2
        ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-200'
        : 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-200';

      const iconHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
          ${
            isP1 && !isResolved
              ? '<span class="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping"></span>'
              : ''
          }
          <div class="w-8 h-8 rounded-full ${pinColor} border-2 shadow-md flex items-center justify-center text-white text-xs font-bold font-mono">
            ${isResolved ? '✓' : isP1 ? 'P1' : isP2 ? 'P2' : 'P3'}
          </div>
        </div>
      `;

      const incidentIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-incident-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([incident.coordinates.lat, incident.coordinates.lng], {
        icon: incidentIcon,
      }).addTo(map);

      // If team assigned, render tactical line connecting them
      rescueFleet.forEach((team) => {
        if (
          team.currentMissionIncidentId === incident.id ||
          incident.assignedTeamName === team.name
        ) {
          const teamIcon = L.divIcon({
            html: `
              <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white text-[10px] flex items-center justify-center shadow-md -translate-x-1/2 -translate-y-1/2 font-bold text-white">
                🚤
              </div>
            `,
            className: 'team-pin',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          L.marker([team.coordinates.lat, team.coordinates.lng], {
            icon: teamIcon,
          }).addTo(map);

          L.polyline(
            [
              [team.coordinates.lat, team.coordinates.lng],
              [incident.coordinates.lat, incident.coordinates.lng],
            ],
            {
              color: '#0284c7',
              weight: 2.5,
              dashArray: '5, 6',
            }
          ).addTo(map);
        }
      });

      miniMapInstanceRef.current = map;
    } else {
      miniMapInstanceRef.current.setView(
        [incident.coordinates.lat, incident.coordinates.lng],
        15
      );
    }

    // Invalidate size to ensure proper rendering inside modal container
    const timer = setTimeout(() => {
      miniMapInstanceRef.current?.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [incident.id, scenario.id]);

  const handleConfirmDispatch = () => {
    if (selectedTeamId) {
      onDispatchTeam(incident.id, selectedTeamId);
    }
  };

  const handleRecenterMiniMap = () => {
    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.setView(
        [incident.coordinates.lat, incident.coordinates.lng],
        15,
        { animate: true }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 font-mono overflow-y-auto">
      <div
        id="incident-detail-modal"
        className="bg-white border border-slate-200 rounded-xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                isResolved
                  ? 'bg-slate-200 text-slate-700'
                  : isP1
                  ? 'bg-red-600 text-white'
                  : isP2
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isResolved ? '✓ Saved' : isP1 ? 'P1 Critical' : isP2 ? 'P2 High' : 'P3 Standard'}
            </span>

            <span className="text-xs text-slate-700 font-bold px-2.5 py-1 rounded bg-white border border-slate-200 shadow-2xs">
              Severity Score: {incident.severityScore}/100
            </span>

            <span className="hidden sm:inline-block text-xs text-slate-500 px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">
              ID: {incident.id.toUpperCase()}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            title="Close Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Responsive 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 p-4 sm:p-6 overflow-y-auto flex-1 text-slate-900 bg-white">
          {/* Left Column: Contained Tactical Sector Map & Signal Source Box */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            {/* Contained Tactical Map */}
            <div className="relative w-full h-64 sm:h-72 lg:h-[320px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-inner flex flex-col shrink-0">
              <div className="absolute top-2 left-2 z-[400] bg-white/95 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 font-mono flex items-center gap-1.5 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>GPS: {incident.coordinates.lat.toFixed(3)}°N, {Math.abs(incident.coordinates.lng).toFixed(3)}°E</span>
              </div>

              <button
                onClick={handleRecenterMiniMap}
                className="absolute top-2 right-2 z-[400] p-1.5 rounded bg-white/95 border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-sm"
                title="Re-center on incident location"
              >
                <Compass className="w-4 h-4" />
              </button>

              <div ref={miniMapContainerRef} className="w-full h-full flex-1" />

              <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 text-xs text-slate-700 flex items-center justify-between font-mono">
                <span>Impact Zone: {isP1 ? '220m Critical Radius' : '120m Standard Radius'}</span>
                <span className="text-blue-700 font-bold">{assignedTeam ? `Assigned: ${assignedTeam.callsign}` : 'Status: Unassigned'}</span>
              </div>
            </div>

            {/* Raw Social Media Ingestion Card */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-blue-700 flex items-center gap-1.5 font-bold">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <span>Citizen Distress Signal Origin</span>
                </div>
                <span className="text-xs text-slate-500">{incident.timestamp}</span>
              </div>

              {/* Source Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-600">Reporter: <strong className="text-slate-900">{incident.author}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">Platform: <strong className="text-slate-900">{incident.platform}</strong></span>
              </div>

              {/* Phone / Direct Contact Banner */}
              {incident.contactInfo && (
                <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-mono font-semibold">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Emergency Contact: <strong>{incident.contactInfo}</strong></span>
                  </div>
                  <a
                    href={`tel:${incident.contactInfo}`}
                    className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs transition-colors"
                  >
                    Call
                  </a>
                </div>
              )}

              {/* Distress Post Text */}
              <div className="p-3 rounded-md bg-white border border-slate-200 shadow-2xs">
                <p className="text-xs text-slate-800 italic leading-relaxed font-sans">
                  "{incident.rawText}"
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Full Intelligence Dossier Card */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            {/* Header Title & Location */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Target Location & Sector
                </span>
                <span className="text-xs text-slate-500 font-mono">SAR Sector: {scenario.name}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 font-sans">
                <MapPin className="w-5 h-5 text-red-500 shrink-0" />
                <span>{incident.locationName}</span>
              </h2>
            </div>

            {/* People & Vulnerability Breakdown */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-3 shadow-2xs">
              <div className="text-xs uppercase tracking-wider text-blue-700 font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Civilians at Risk & Vulnerability Profiles</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-white border border-slate-200 font-mono shadow-2xs">
                  <div className="text-xs text-slate-500">Total Trapped / At Risk:</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">{incident.peopleAffectedCount} Civilians</div>
                </div>
                <div className="p-3 rounded bg-white border border-slate-200 font-mono shadow-2xs">
                  <div className="text-xs text-slate-500">Emergency Classification:</div>
                  <div className="text-sm font-bold text-amber-700 mt-0.5">{incident.emergencyType}</div>
                </div>
              </div>

              {/* Vulnerable Groups */}
              <div>
                <div className="text-xs text-slate-500 mb-1 font-mono">Identified Vulnerable Demographics:</div>
                <div className="flex flex-wrap gap-1.5">
                  {incident.vulnerableGroups.map((vg, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
                    >
                      ⚠️ {vg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Required Equipment */}
              <div>
                <div className="text-xs text-slate-500 mb-1 font-mono">Required Extraction Equipment:</div>
                <div className="flex flex-wrap gap-1.5">
                  {incident.requiredEquipment.map((eq, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono"
                    >
                      🛠️ {eq}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Urgency Analysis & Directives */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-blue-700 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>AI Risk Assessment & Directives</span>
                </div>
                <span className="text-xs text-emerald-700 font-mono font-bold">
                  Confidence: {incident.triageConfidence}%
                </span>
              </div>
              <p className="text-xs text-slate-800 font-sans leading-relaxed">
                <strong>Reasoning:</strong> {incident.urgencyReasoning}
              </p>
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-sans">
                <strong className="font-mono text-amber-800 uppercase text-xs block mb-1">
                  Tactical Action Directive:
                </strong>
                {incident.recommendedAction}
              </div>
            </div>

            {/* Search & Rescue Fleet Dispatch Station */}
            {!isResolved && (
              <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Tactical SAR Dispatch Station</span>
                  </div>
                  {incident.assignedTeamName && (
                    <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-xs font-bold">
                      Assigned: {incident.assignedTeamName}
                    </span>
                  )}
                </div>

                {/* AI Recommendation Match */}
                {recommendation && !isDispatched && (
                  <div className="p-3 rounded-md bg-white border border-blue-200 text-xs flex flex-col gap-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Recommended Unit (ETA: ~{recommendation.estimatedEtaMinutes} min)</span>
                    </div>
                    <p className="text-slate-700 text-xs font-sans leading-relaxed">{recommendation.rationale}</p>
                  </div>
                )}

                {/* Unit Selector & Action Buttons */}
                {!isDispatched ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
                    >
                      <option value="">-- Select Available Rescue Unit --</option>
                      {availableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.callsign}) • {team.baseName}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleConfirmDispatch}
                      disabled={!selectedTeamId}
                      className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider font-mono shadow-sm ${
                        !selectedTeamId
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Dispatch Unit</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-blue-700 font-bold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                      <span>Rescue unit en route to ground zero (~8 min ETA)</span>
                    </span>

                    <button
                      onClick={() => onResolveIncident(incident.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors uppercase tracking-wider font-mono shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Mission Completed (Saved)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {isResolved && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <span>Rescue mission completed successfully. All trapped civilians safely evacuated to emergency staging shelter.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono shrink-0">
          <span>Crisis Vector SAR Incident Dossier</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors border border-slate-300 shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

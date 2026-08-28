import React, { useState } from 'react';
import { IncidentReport, PriorityLevel, RescueTeam } from '../types/disaster';
import {
  AlertTriangle,
  Flame,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  Filter,
  CheckCircle,
  Users,
  Search,
  ArrowUpDown,
  LifeBuoy,
  Layers,
  HeartPulse,
} from 'lucide-react';

interface PriorityQueueProps {
  incidents: IncidentReport[];
  rescueFleet: RescueTeam[];
  onSelectIncident: (incident: IncidentReport) => void;
  onQuickDispatch: (incident: IncidentReport) => void;
  onResolveIncident: (incidentId: string) => void;
  onBatchAutoDispatchAllP1: () => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  incidents,
  rescueFleet,
  onSelectIncident,
  onQuickDispatch,
  onResolveIncident,
  onBatchAutoDispatchAllP1,
}) => {
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'P1' | 'P2' | 'P3' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'severity' | 'casualties' | 'recent'>('severity');

  const p1Incidents = incidents.filter((i) => i.priorityLevel === 'P1_CRITICAL' && i.status !== 'RESOLVED_SAVED');
  const p2Incidents = incidents.filter((i) => i.priorityLevel === 'P2_HIGH' && i.status !== 'RESOLVED_SAVED');
  const p3Incidents = incidents.filter((i) => i.priorityLevel === 'P3_STANDARD' && i.status !== 'RESOLVED_SAVED');
  const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED_SAVED');

  const availableFleetCount = rescueFleet.filter((f) => f.status === 'AVAILABLE').length;

  const filterList = (list: IncidentReport[]) => {
    return list
      .filter((inc) => {
        if (typeFilter !== 'ALL' && inc.emergencyType !== typeFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            inc.locationName.toLowerCase().includes(q) ||
            inc.rawText.toLowerCase().includes(q) ||
            inc.vulnerableGroups.some((v) => v.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'severity') return b.severityScore - a.severityScore;
        if (sortBy === 'casualties') return b.peopleAffectedCount - a.peopleAffectedCount;
        return 0;
      });
  };

  const activeFilteredList =
    selectedTab === 'P1'
      ? filterList(p1Incidents)
      : selectedTab === 'P2'
      ? filterList(p2Incidents)
      : selectedTab === 'P3'
      ? filterList(p3Incidents)
      : selectedTab === 'RESOLVED'
      ? filterList(resolvedIncidents)
      : filterList(incidents.filter((i) => i.status !== 'RESOLVED_SAVED'));

  return (
    <div id="priority-queue-board" className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
      {/* Header with Title & Auto-Dispatch Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-slate-900 uppercase tracking-wide font-sans">
                Search & Rescue Priority Triage Queue
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-100 border border-red-200 text-red-700 font-extrabold uppercase">
                {p1Incidents.length} Critical
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Algorithmic triage prioritizing life-threat severity & vulnerable groups
            </p>
          </div>
        </div>

        {/* 1-Click Batch Dispatch Button */}
        {p1Incidents.length > 0 && availableFleetCount > 0 && (
          <button
            id="btn-batch-dispatch-p1"
            onClick={onBatchAutoDispatchAllP1}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-colors uppercase tracking-wider shadow-sm"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Auto-Dispatch All P1 Critical ({p1Incidents.length})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            id="tab-all-queue"
            onClick={() => setSelectedTab('ALL')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              selectedTab === 'ALL'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            All Active ({incidents.filter((i) => i.status !== 'RESOLVED_SAVED').length})
          </button>

          <button
            id="tab-p1-queue"
            onClick={() => setSelectedTab('P1')}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
              selectedTab === 'P1'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-red-700 hover:bg-red-100/70'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>P1 Critical ({p1Incidents.length})</span>
          </button>

          <button
            id="tab-p2-queue"
            onClick={() => setSelectedTab('P2')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              selectedTab === 'P2'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 hover:bg-amber-100/70'
            }`}
          >
            P2 High ({p2Incidents.length})
          </button>

          <button
            id="tab-p3-queue"
            onClick={() => setSelectedTab('P3')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              selectedTab === 'P3'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:bg-emerald-100/70'
            }`}
          >
            P3 Standard ({p3Incidents.length})
          </button>

          <button
            id="tab-resolved-queue"
            onClick={() => setSelectedTab('RESOLVED')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              selectedTab === 'RESOLVED'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Resolved ({resolvedIncidents.length})
          </button>
        </div>

        {/* Search & Sorter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location, text, tags..."
              className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-300 text-slate-700 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="severity">Sort: Severity</option>
            <option value="casualties">Sort: Casualties</option>
          </select>
        </div>
      </div>

      {/* Incident Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[620px] overflow-y-auto pr-1">
        {activeFilteredList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <span>No pending distress incidents in this filter category.</span>
          </div>
        ) : (
          activeFilteredList.map((incident) => {
            const isP1 = incident.priorityLevel === 'P1_CRITICAL';
            const isP2 = incident.priorityLevel === 'P2_HIGH';
            const isDispatched = incident.status === 'DISPATCHED' || incident.status === 'ON_SCENE';
            const isResolved = incident.status === 'RESOLVED_SAVED';

            return (
              <div
                key={incident.id}
                className={`p-4 rounded-lg border flex flex-col justify-between gap-3 transition-all relative shadow-2xs ${
                  isResolved
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : isP1
                    ? 'bg-red-50/30 border-red-200 hover:border-red-400 hover:bg-red-50/60 shadow-xs'
                    : isP2
                    ? 'bg-amber-50/30 border-amber-200 hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Badges & Case ID */}
                  <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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

                      <span className="text-[10px] text-slate-700 font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        Score: {incident.severityScore}/100
                      </span>
                    </div>

                    <span className="text-[9px] text-slate-400 font-mono">
                      ID: {incident.id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  {/* Location & Title */}
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-1 font-sans">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="truncate">{incident.locationName}</span>
                  </h3>

                  {/* Raw distress excerpt */}
                  <p className="text-xs text-slate-700 line-clamp-2 italic mb-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200 font-sans">
                    "{incident.rawText}"
                  </p>

                  {/* Vulnerability Badges & Count */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] flex items-center gap-1 font-bold">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      {incident.peopleAffectedCount} Civilians
                    </span>

                    {incident.vulnerableGroups.map((vg, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-[9px] font-semibold"
                      >
                        {vg}
                      </span>
                    ))}
                  </div>

                  {/* Recommended Action / Directive */}
                  <div className="text-xs text-slate-800 bg-slate-50 p-2 rounded-md border border-slate-200">
                    <div className="text-[10px] text-blue-700 font-mono font-bold uppercase tracking-wider">
                      Recommended Action:
                    </div>
                    <div className="font-mono text-[11px] mt-0.5 text-slate-700">{incident.recommendedAction}</div>
                  </div>
                </div>

                {/* Dispatch Status & Action Buttons */}
                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2 font-mono">
                  <div>
                    {isResolved ? (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Civilians Rescued
                      </span>
                    ) : isDispatched ? (
                      <span className="text-xs text-blue-700 font-bold flex items-center gap-1">
                        <LifeBuoy className="w-4 h-4 text-blue-600 animate-spin" /> En Route ({incident.assignedTeamName || 'Rescue Squad'})
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 font-semibold">
                        Dispatch Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectIncident(incident)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold transition-colors"
                    >
                      Inspect
                    </button>

                    {!isResolved && !isDispatched && (
                      <button
                        onClick={() => onQuickDispatch(incident)}
                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>Dispatch</span>
                      </button>
                    )}

                    {!isResolved && isDispatched && (
                      <button
                        onClick={() => onResolveIncident(incident.id)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                        title="Mark rescue mission completed"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Saved</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

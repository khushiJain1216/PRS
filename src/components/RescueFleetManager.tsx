import React from 'react';
import { RescueTeam, IncidentReport } from '../types/disaster';
import {
  Shield,
  LifeBuoy,
  Zap,
  Activity,
  CheckCircle2,
  Navigation,
  RotateCcw,
  Users,
  Compass,
  MapPin,
  Clock,
} from 'lucide-react';

interface RescueFleetManagerProps {
  rescueFleet: RescueTeam[];
  incidents: IncidentReport[];
  onAutoDispatchAll: () => void;
  onResetFleet: () => void;
  onSelectIncident: (incident: IncidentReport) => void;
}

export const RescueFleetManager: React.FC<RescueFleetManagerProps> = ({
  rescueFleet,
  incidents,
  onAutoDispatchAll,
  onResetFleet,
  onSelectIncident,
}) => {
  const availableCount = rescueFleet.filter((f) => f.status === 'AVAILABLE').length;
  const activeDispatchedCount = rescueFleet.filter(
    (f) => f.status === 'DISPATCHED' || f.status === 'ON_SCENE'
  ).length;
  const totalRescued = rescueFleet.reduce((sum, f) => sum + f.rescuedCount, 0);

  const pendingP1s = incidents.filter(
    (i) => i.priorityLevel === 'P1_CRITICAL' && (i.status === 'AI_TRIAGED' || i.status === 'UNVERIFIED')
  ).length;

  return (
    <div id="rescue-fleet-manager" className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
      {/* Header & Optimizer Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-slate-900 uppercase tracking-wide font-sans">
                Search & Rescue Fleet Operations
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 border border-blue-200 text-blue-700 font-extrabold uppercase">
                {availableCount} / {rescueFleet.length} Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Coordinated deployment across NDRF marine units, USAR teams, and Medevac air wings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {availableCount > 0 && (
            <button
              id="btn-fleet-auto-dispatch"
              onClick={onAutoDispatchAll}
              className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-colors uppercase tracking-wider shadow-sm"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>AI Auto-Dispatch Optimizer</span>
            </button>
          )}

          <button
            onClick={onResetFleet}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 transition-colors shadow-2xs"
            title="Recall all units to staging base"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fleet Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Available Units</div>
          <div className="text-base font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {availableCount} Ready
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Active Missions</div>
          <div className="text-base font-bold text-blue-700 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            {activeDispatchedCount} En Route
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Rescued</div>
          <div className="text-base font-bold text-slate-900 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {totalRescued} Civilians
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pending P1 Targets</div>
          <div className="text-base font-bold text-red-600 mt-0.5">
            {pendingP1s} Incidents
          </div>
        </div>
      </div>

      {/* Rescue Teams Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {rescueFleet.map((team) => {
          const isDispatched = team.status === 'DISPATCHED' || team.status === 'ON_SCENE';
          const assignedIncident = incidents.find((i) => i.id === team.currentMissionIncidentId);
          const typeIcon =
            team.type === 'WATER_RESCUE'
              ? '🚤'
              : team.type === 'MEDEVAC_AIR'
              ? '🚁'
              : team.type === 'URBAN_SAR'
              ? '🚜'
              : '🚑';

          return (
            <div
              key={team.id}
              className={`p-4 rounded-lg border flex flex-col justify-between gap-3 transition-all ${
                isDispatched
                  ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeIcon}</span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 font-sans">{team.name}</h3>
                      <span className="text-[10px] font-mono text-blue-700 font-semibold">{team.callsign}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase tracking-wider ${
                      isDispatched
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-emerald-600 text-white shadow-2xs'
                    }`}
                  >
                    {isDispatched ? 'DISPATCHED' : 'READY'}
                  </span>
                </div>

                {/* Staging Base & Rescues */}
                <div className="flex items-center justify-between text-xs text-slate-700 font-mono py-2 border-y border-slate-200 my-2">
                  <span>Base: {team.baseName}</span>
                  <span className="text-emerald-700 font-bold">Rescued: {team.rescuedCount}</span>
                </div>

                {/* Equipment */}
                <div className="flex flex-wrap gap-1 my-2">
                  {team.equipment.slice(0, 3).map((eq, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-mono"
                    >
                      {eq}
                    </span>
                  ))}
                  {team.equipment.length > 3 && (
                    <span className="text-[10px] text-slate-500 font-mono self-center px-1">
                      +{team.equipment.length - 3}
                    </span>
                  )}
                </div>

                {/* Mission Assignment */}
                {isDispatched && assignedIncident ? (
                  <div
                    onClick={() => onSelectIncident(assignedIncident)}
                    className="p-2.5 rounded-md bg-white border border-blue-300 text-xs text-slate-800 cursor-pointer hover:border-blue-500 transition-colors font-mono shadow-2xs"
                  >
                    <div className="text-[10px] text-blue-700 font-bold uppercase flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Active Mission (ETA: ~{team.etaMinutes || 8} min)</span>
                    </div>
                    <div className="font-bold text-slate-900 truncate mt-1">
                      📍 {assignedIncident.locationName}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate mt-0.5">
                      {assignedIncident.recommendedAction}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono text-center">
                    Standing by at Base Depot
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

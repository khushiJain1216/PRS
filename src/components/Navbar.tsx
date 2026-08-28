import React from 'react';
import {
  AlertTriangle,
  Flame,
  Radio,
  RotateCcw,
  Volume2,
  VolumeX,
  PlusCircle,
  FileText,
  Activity,
  Layers,
  MapPin,
  ShieldCheck,
  Shield,
  LifeBuoy,
  Users,
  Compass,
  Sparkles,
} from 'lucide-react';
import { DisasterScenario, IncidentReport, RescueTeam } from '../types/disaster';
import { DISASTER_SCENARIOS } from '../data/mockDisasterScenarios';

interface NavbarProps {
  activeScenario: DisasterScenario;
  onSelectScenario: (scenario: DisasterScenario) => void;
  incidents: IncidentReport[];
  rescueFleet: RescueTeam[];
  isSimulating: boolean;
  onToggleSimulation: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenNewPostModal: () => void;
  onOpenSitrepModal: () => void;
  onResetScenario: () => void;
  activeView: 'dashboard' | 'map' | 'queue' | 'fleet' | 'sitrep';
  onSelectView: (view: 'dashboard' | 'map' | 'queue' | 'fleet' | 'sitrep') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeScenario,
  onSelectScenario,
  incidents,
  rescueFleet,
  isSimulating,
  onToggleSimulation,
  soundEnabled,
  onToggleSound,
  onOpenNewPostModal,
  onOpenSitrepModal,
  onResetScenario,
  activeView,
  onSelectView,
}) => {
  const p1Count = incidents.filter((i) => i.priorityLevel === 'P1_CRITICAL' && i.status !== 'RESOLVED_SAVED').length;
  const p2Count = incidents.filter((i) => i.priorityLevel === 'P2_HIGH' && i.status !== 'RESOLVED_SAVED').length;
  const p3Count = incidents.filter((i) => i.priorityLevel === 'P3_STANDARD' && i.status !== 'RESOLVED_SAVED').length;
  const totalLivesAtRisk = incidents
    .filter((i) => i.status !== 'RESOLVED_SAVED')
    .reduce((sum, i) => sum + (i.peopleAffectedCount || 1), 0);
  const totalRescued = rescueFleet.reduce((sum, t) => sum + t.rescuedCount, 0);

  return (
    <header id="main-tactical-header" className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-40 shadow-sm">
      {/* Top Tactical Command Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & System Identity */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-sm flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-red-600 uppercase">
                CRISIS VECTOR AI
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 border border-blue-200 text-blue-700 font-bold uppercase tracking-wider">
                SAR COMMAND
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 uppercase font-sans leading-tight">
              Real-Time Disaster Triage & Response Coordinator
            </h1>
            <p className="text-xs text-slate-500 font-mono hidden sm:block">
              AI-Powered Social SOS Intelligence • GIS Tactical Map • Rapid Fleet Dispatch
            </p>
          </div>
        </div>

        {/* Right Controls: Scenario Switcher & Global Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Disaster Scenario Selector */}
          <div className="flex flex-col items-end">
            <label htmlFor="scenario-selector" className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-500" />
              <span>Active Scenario</span>
            </label>
            <select
              id="scenario-selector"
              value={activeScenario.id}
              onChange={(e) => {
                const found = DISASTER_SCENARIOS.find((s) => s.id === e.target.value);
                if (found) onSelectScenario(found);
              }}
              className="bg-slate-50 border border-slate-300 hover:border-slate-400 rounded px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {DISASTER_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Toggles */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
            <button
              id="btn-toggle-feed-sim"
              onClick={onToggleSimulation}
              className={`px-2.5 py-1 rounded border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                isSimulating
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title="Toggle Live Distress Feed Simulation"
            >
              <Activity className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{isSimulating ? 'LIVE FEED: ON' : 'FEED: PAUSED'}</span>
            </button>

            <button
              id="btn-toggle-sound"
              onClick={onToggleSound}
              className="p-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
              title={soundEnabled ? 'Mute Alert Chimes' : 'Unmute Alert Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            <button
              id="btn-reset-scenario"
              onClick={onResetScenario}
              className="p-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
              title="Reset Scenario State"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Triage KPI Bar & Primary Actions */}
      <div className="bg-slate-50 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        {/* Triage Count Badges */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto">
          {/* P1 Critical */}
          <div className="px-3 py-1 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2.5 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-red-700 tracking-wider uppercase font-mono">
                P1 CRITICAL
              </p>
              <p className="text-[9px] text-red-500 uppercase tracking-wider hidden sm:block">Life-Threatening</p>
            </div>
            <span className="text-base sm:text-lg font-black font-mono text-red-700 px-2 py-0.5 bg-red-100 rounded">
              {p1Count}
            </span>
          </div>

          {/* P2 High */}
          <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2.5 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-amber-700 tracking-wider uppercase font-mono">
                P2 HIGH
              </p>
              <p className="text-[9px] text-amber-600 uppercase tracking-wider hidden sm:block">Urgent Rescue</p>
            </div>
            <span className="text-base sm:text-lg font-black font-mono text-amber-700 px-2 py-0.5 bg-amber-100 rounded">
              {p2Count}
            </span>
          </div>

          {/* P3 Standard */}
          <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2.5 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase font-mono">
                P3 STANDARD
              </p>
              <p className="text-[9px] text-emerald-600 uppercase tracking-wider hidden sm:block">Relief & Support</p>
            </div>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded">
              {p3Count}
            </span>
          </div>

          {/* Lives At Risk & Rescued */}
          <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-200 text-xs font-mono">
            <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-md shadow-sm">
              <span className="text-slate-500">AT RISK: </span>
              <strong className="text-amber-700">{totalLivesAtRisk} Civilians</strong>
            </div>
            <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-md shadow-sm">
              <span className="text-slate-500">RESCUED: </span>
              <strong className="text-emerald-700">{totalRescued} Saved</strong>
            </div>
          </div>
        </div>

        {/* Ingest SOS & SitRep Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-new-post"
            onClick={onOpenNewPostModal}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm uppercase tracking-wider"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Ingest Citizen SOS</span>
          </button>

          <button
            id="btn-open-sitrep"
            onClick={onOpenSitrepModal}
            className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Commander SitRep</span>
          </button>
        </div>
      </div>

      {/* Main View Tabs */}
      <nav className="bg-white px-4 sm:px-6 flex items-center gap-1 overflow-x-auto text-xs font-mono border-b border-slate-200">
        <button
          onClick={() => onSelectView('dashboard')}
          className={`px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
            activeView === 'dashboard'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          Integrated Dashboard
        </button>

        <button
          onClick={() => onSelectView('map')}
          className={`px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
            activeView === 'map'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          Tactical GIS Map
        </button>

        <button
          onClick={() => onSelectView('queue')}
          className={`px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
            activeView === 'queue'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          SAR Priority Queue ({incidents.filter((i) => i.status !== 'RESOLVED_SAVED').length})
        </button>

        <button
          onClick={() => onSelectView('fleet')}
          className={`px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
            activeView === 'fleet'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          Rescue Fleet ({rescueFleet.filter((f) => f.status === 'AVAILABLE').length} Ready)
        </button>

        <button
          onClick={() => onSelectView('sitrep')}
          className={`px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
            activeView === 'sitrep'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          Situation Report (SitRep)
        </button>
      </nav>
    </header>
  );
};

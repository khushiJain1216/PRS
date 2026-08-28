import React, { useState } from 'react';
import { SituationReportData, IncidentReport, RescueTeam } from '../types/disaster';
import {
  FileText,
  RefreshCw,
  Sparkles,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Printer,
  Megaphone,
  X,
  Layers,
  Award,
} from 'lucide-react';

interface CommanderSitrepProps {
  sitrep: SituationReportData | null;
  isLoading: boolean;
  incidents: IncidentReport[];
  rescueFleet: RescueTeam[];
  onRefreshSitrep: () => void;
  onClose?: () => void;
}

export const CommanderSitrep: React.FC<CommanderSitrepProps> = ({
  sitrep,
  isLoading,
  incidents,
  rescueFleet,
  onRefreshSitrep,
  onClose,
}) => {
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  const p1Count = incidents.filter((i) => i.priorityLevel === 'P1_CRITICAL').length;
  const p2Count = incidents.filter((i) => i.priorityLevel === 'P2_HIGH').length;
  const p3Count = incidents.filter((i) => i.priorityLevel === 'P3_STANDARD').length;
  const totalLives = incidents.reduce((sum, i) => sum + (i.peopleAffectedCount || 1), 0);
  const totalRescued = rescueFleet.reduce((sum, f) => sum + f.rescuedCount, 0);

  const handleCopyBroadcast = () => {
    if (sitrep?.publicSafetyBroadcast) {
      navigator.clipboard.writeText(sitrep.publicSafetyBroadcast);
      setCopiedBroadcast(true);
      setTimeout(() => setCopiedBroadcast(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="commander-sitrep-modal"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 text-slate-900 max-w-4xl w-full mx-auto font-sans"
    >
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-bold font-mono text-blue-700 uppercase tracking-wider">
                  AI Tactical Briefing
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Updated: {sitrep?.generatedAt || new Date().toLocaleTimeString()}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight mt-0.5">
                Commander's Situation Report (SitRep)
              </h2>
              <p className="text-xs text-slate-500">
                Automated multi-source emergency synthesis powered by Gemini 3.7 Flash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition-colors shadow-2xs"
              title="Print SitRep Dossier"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onRefreshSitrep}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors uppercase tracking-wider shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Synthesizing...' : 'Regenerate'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Triage Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-center">
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 shadow-2xs">
          <div className="text-[10px] text-red-600 font-bold uppercase tracking-wider">P1 Critical</div>
          <div className="text-lg font-black text-red-700">{p1Count} Cases</div>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 shadow-2xs">
          <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">P2 High</div>
          <div className="text-lg font-black text-amber-700">{p2Count} Cases</div>
        </div>

        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 shadow-2xs">
          <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">P3 Standard</div>
          <div className="text-lg font-black text-emerald-700">{p3Count} Cases</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Lives At Risk</div>
          <div className="text-lg font-bold text-slate-900">{totalLives} Civilians</div>
        </div>

        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 col-span-2 sm:col-span-1 shadow-2xs">
          <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Rescued</div>
          <div className="text-lg font-black text-emerald-700">{totalRescued} Saved</div>
        </div>
      </div>

      {/* Main Content Body */}
      {sitrep ? (
        <div className="space-y-4">
          {/* Executive Summary */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="text-xs font-bold text-blue-800 font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Executive Command Summary</span>
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">{sitrep.executiveSummary}</p>
          </div>

          {/* Critical Threat Vector */}
          <div className="p-3.5 rounded-lg bg-red-50/70 border border-red-200">
            <h3 className="text-xs font-bold text-red-700 font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
              <span>2. Critical Threat Assessment & Immediate Life Hazards</span>
            </h3>
            <p className="text-xs text-red-900 leading-relaxed font-sans">{sitrep.criticalThreatAssessment}</p>
          </div>

          {/* Directives */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="text-xs font-bold text-emerald-800 font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Priority SAR Dispatch Directives</span>
            </h3>
            <ul className="space-y-1.5">
              {sitrep.priorityDispatchDirectives?.map((directive, idx) => (
                <li key={idx} className="flex items-start text-xs text-slate-800 font-mono">
                  <span className="text-blue-700 font-bold mr-2">[{idx + 1}]</span>
                  <span>{directive}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottlenecks & Risk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="text-[11px] font-bold text-amber-800 font-mono uppercase tracking-wider mb-1">
                4. Resource Bottlenecks & Logistics Constraints
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-mono">
                {sitrep.resourceBottlenecks || 'All tactical assets operational.'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-800 font-mono uppercase tracking-wider mb-1">
                5. Casualty Risk Rating
              </h4>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${
                    sitrep.estimatedCasualtyRisk === 'Extreme' || sitrep.estimatedCasualtyRisk === 'Severe'
                      ? 'bg-red-600 text-white'
                      : sitrep.estimatedCasualtyRisk === 'Moderate'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {sitrep.estimatedCasualtyRisk || 'Severe'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Calculated based on water influx, structural collapses & triage queue
                </span>
              </div>
            </div>
          </div>

          {/* Citizen Broadcast Box */}
          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 font-mono font-bold text-xs uppercase tracking-wider">
                <Megaphone className="w-4 h-4 text-amber-700" />
                <span>6. Public Emergency Advisory Broadcast</span>
              </div>

              <button
                onClick={handleCopyBroadcast}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-mono font-bold flex items-center gap-1 transition-colors shadow-2xs"
              >
                <Share2 className="w-3 h-3" />
                <span>{copiedBroadcast ? 'Copied to Clipboard!' : 'Copy Advisory'}</span>
              </button>
            </div>

            <p className="text-xs text-amber-950 font-mono bg-white p-2.5 rounded border border-amber-200 shadow-2xs">
              "{sitrep.publicSafetyBroadcast}"
            </p>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 font-mono">
          Generating tactical situation report, please wait...
        </div>
      )}
    </div>
  );
};

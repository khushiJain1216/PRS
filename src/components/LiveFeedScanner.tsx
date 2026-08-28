import React, { useState } from 'react';
import { IncidentReport } from '../types/disaster';
import {
  Radio,
  Sparkles,
  Send,
  RefreshCw,
  Clock,
  MapPin,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Cpu,
  CornerDownRight,
  Flame,
  Users,
} from 'lucide-react';

interface LiveFeedScannerProps {
  incidents: IncidentReport[];
  isScanning: boolean;
  onManualIngest: (rawText: string, author?: string, platform?: IncidentReport['platform']) => Promise<void>;
  onSelectIncident: (incident: IncidentReport) => void;
}

const SAMPLE_PROMPTS = [
  {
    label: '🚨 P1 Flooding (Sinhagad Rd)',
    text: 'URGENT SOS!! Dwarka Sankul, Ekta Nagri, Sinhagad Road Pune! 5 elderly citizens and 2 infants trapped on ground floor! Khadakwasla dam discharge water is chest-high! Send NDRF inflatable boats immediately!!',
  },
  {
    label: '🚨 P1 Hospital ICU Power Cut',
    text: 'CRITICAL MEDICAL EMERGENCY: Substation flooding near Sassoon Hospital. ICU backup generator failing in 15 mins for 3 renal dialysis patients on ventilators. Need emergency 108 EMS O2 cylinder and fuel!',
  },
  {
    label: '🚨 P1 Structural Rubble Collapse',
    text: 'Old 3-storey building structure wall collapsed near Kasba Peth Tambat Ali! 3 people trapped under wooden beams! We hear tapping on pipes! Need heavy USAR shoring and hydraulic cutters ASAP!',
  },
  {
    label: '🟠 P2 Terrace Stranded Group',
    text: '14 civilians stranded on rooftop near Yerawada Shanti Nagar nullah overflow. Ground floor is 5ft submerged. Diabetics have run out of insulin and clean drinking water.',
  },
  {
    label: '🟢 P3 Arterial Road Blockage',
    text: 'Large fallen 60yr Gulmohar tree and power pole blocking arterial flyover descent near Sancheti Hospital Chowk. Ambulances stuck in gridlock. Need JCB crane and tree cutters to clear.',
  },
];

export const LiveFeedScanner: React.FC<LiveFeedScannerProps> = ({
  incidents,
  isScanning,
  onManualIngest,
  onSelectIncident,
}) => {
  const [inputText, setInputText] = useState('');
  const [inputAuthor, setInputAuthor] = useState('');
  const [inputPlatform, setInputPlatform] = useState<IncidentReport['platform']>('WhatsApp Emergency');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await onManualIngest(
        inputText.trim(),
        inputAuthor.trim() || '@citizen_sos_reporter',
        inputPlatform
      );
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySample = (sample: string) => {
    setInputText(sample);
  };

  return (
    <div id="live-feed-scanner" className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-4 h-full">
      {/* Header & Live Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-slate-900 uppercase tracking-wide font-sans">
                Social SOS Intelligence & NLP Ingestion
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center gap-1 font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Ingestion
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Real-time unstructured post extraction via Gemini 3.7 Flash
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500">
          Scanned: <strong className="text-slate-800">{incidents.length} Signals</strong>
        </div>
      </div>

      {/* Quick Test Distress Post Presets */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Quick Ingestion Presets:</span>
          <span className="text-[10px] text-blue-600 font-semibold">Click to load into AI parser</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySample(sample.text)}
              className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs font-mono text-slate-700 transition-colors text-left shadow-2xs"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Distress Post AI Ingestion Form */}
      <form onSubmit={handleIngestSubmit} className="flex flex-col gap-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between gap-2 text-xs font-mono">
          <label htmlFor="raw-post-input" className="text-slate-800 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Raw Distress Social Post or 112 Dispatch Text:</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={inputPlatform}
              onChange={(e) => setInputPlatform(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="WhatsApp Emergency">WhatsApp Emergency</option>
              <option value="X / Twitter">X / Twitter</option>
              <option value="Telegram SOS">Telegram SOS</option>
              <option value="Direct 112 / Web">Direct 112 / Web</option>
              <option value="Ham Radio Relay">Ham Radio Relay</option>
            </select>
          </div>
        </div>

        <textarea
          id="raw-post-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste raw social media post, citizen tweet, or emergency call transcript here..."
          rows={3}
          className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono resize-none shadow-2xs"
        />

        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={inputAuthor}
            onChange={(e) => setInputAuthor(e.target.value)}
            placeholder="Reporter handle / Phone (e.g. @citizen_sos)"
            className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
          />

          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-mono font-bold text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI Parsing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Extract & Triage</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Stream of Extracted Distress Feed */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-1 border-b border-slate-200">
          <span>Processed Emergency Stream</span>
          <span className="font-semibold text-slate-700">{incidents.length} Cataloged</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
          {incidents.map((incident) => {
            const isP1 = incident.priorityLevel === 'P1_CRITICAL';
            const isP2 = incident.priorityLevel === 'P2_HIGH';
            const isResolved = incident.status === 'RESOLVED_SAVED';

            return (
              <div
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className={`p-3 rounded-lg border transition-all cursor-pointer text-xs font-mono flex flex-col gap-1.5 ${
                  isResolved
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : isP1
                    ? 'bg-red-50/70 border-red-200 hover:border-red-400 hover:bg-red-50'
                    : isP2
                    ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        isP1
                          ? 'bg-red-600 text-white'
                          : isP2
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isP1 ? 'P1 CRITICAL' : isP2 ? 'P2 HIGH' : 'P3 STANDARD'}
                    </span>
                    <span className="text-slate-500 text-[11px] font-medium">{incident.platform}</span>
                  </div>

                  <span className="text-[10px] text-slate-400">{incident.timestamp}</span>
                </div>

                {/* Raw Snippet */}
                <p className="text-slate-800 text-xs line-clamp-2 leading-relaxed font-sans">
                  {incident.rawText}
                </p>

                {/* AI Extracted Meta Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 text-slate-700 font-medium">
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span>{incident.locationName}</span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-700 font-medium">
                    <Users className="w-3 h-3 text-amber-600" />
                    <span>{incident.peopleAffectedCount} Civilians</span>
                  </div>

                  <div className="ml-auto text-[10px] text-emerald-700 font-semibold">
                    AI Confidence: {incident.triageConfidence}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

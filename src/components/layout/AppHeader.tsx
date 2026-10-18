import React from 'react';
import { RotateCcw, FastForward, ShieldCheck, Cpu } from 'lucide-react';
import { DEFAULT_TEAMS } from '@/lib/eventEngine/generator';

interface AppHeaderProps {
  currentMinute: number;
  currentIntervalLabel: string;
  isContradictoryPhase: boolean;
  onAdvance: () => void;
  onReset: () => void;
  isSimulating: boolean;
  canAdvance: boolean;
  isUsingMicrosoftFoundry?: boolean;
  foundryModelName?: string;
  foundryError?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentMinute,
  currentIntervalLabel,
  isContradictoryPhase,
  onAdvance,
  onReset,
  isSimulating,
  canAdvance,
  isUsingMicrosoftFoundry = false,
  foundryModelName = 'gpt-4o',
  foundryError,
}) => {
  return (
    <header className="sticky top-0 z-30 flex flex-col md:flex-row items-stretch md:items-center justify-between bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs gap-3">
      {/* Match Brand & Live Scoreboard */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-emerald-800 flex items-center justify-center text-white font-bold text-sm tracking-wider">
            PFC
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">PROOFLINE FC</h1>
            <p className="text-[11px] text-slate-500 font-medium">Every claim. Backed by evidence.</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Live Match Board */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-slate-900">{DEFAULT_TEAMS.home.shortName}</span>
            <span className="tabular-nums font-bold text-sm text-slate-900">1</span>
          </div>
          <span className="text-slate-400 text-xs font-bold">-</span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-bold text-sm text-slate-900">1</span>
            <span className="font-semibold text-xs text-slate-900">{DEFAULT_TEAMS.away.shortName}</span>
          </div>

          <div className="ml-2 pl-2 border-l border-slate-200 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-xs font-bold text-emerald-800 tabular-nums">{currentMinute}&apos;</span>
            <span className="text-[11px] text-slate-500 font-medium">({currentIntervalLabel})</span>
          </div>
        </div>

        {isContradictoryPhase && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            Phase 3: Contradictory Evidence Active
          </span>
        )}
      </div>

      {/* Integration Status & Simulation Controls */}
      <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
        {/* Microsoft Foundry Integration Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs"
          title={
            isUsingMicrosoftFoundry
              ? `Azure AI Foundry live model inference active (${foundryModelName}). Authenticated request verified.`
              : foundryError
              ? `Azure AI Foundry rules fallback active. Notice: ${foundryError}`
              : 'Azure AI Foundry configuration mode. Falls back to verified local deterministic rules when live API keys are absent.'
          }
        >
          <Cpu className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-medium text-[11px]">Foundry Mode:</span>
          {isUsingMicrosoftFoundry ? (
            <span className="font-semibold text-[11px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live ({foundryModelName})
            </span>
          ) : (
            <span className="font-semibold text-[11px] text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
              Rules Fallback (Active)
            </span>
          )}
        </div>

        {/* Verification Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
          <span>6-Point Evidence Gate: Enforced</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Reset Match Simulation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onAdvance}
            disabled={!canAdvance || isSimulating}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-all cursor-pointer ${
              !canAdvance || isSimulating
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-800 hover:bg-emerald-900 active:scale-98 shadow-xs'
            }`}
            title="Advance to next tactical interval"
          >
            {isSimulating ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <FastForward className="h-3.5 w-3.5" />
                <span>Advance Interval</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

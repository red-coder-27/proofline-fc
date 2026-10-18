import React from 'react';
import { TurningPoint } from '@/types/stats';
import { TrendingDown, TrendingUp, Zap } from 'lucide-react';

interface TurningPointsListProps {
  turningPoints: TurningPoint[];
  selectedTurningPointId?: string;
  onSelectTurningPoint: (tp: TurningPoint) => void;
}

export const TurningPointsList: React.FC<TurningPointsListProps> = ({
  turningPoints,
  selectedTurningPointId,
  onSelectTurningPoint,
}) => {
  if (turningPoints.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
          Detected Turning Points
        </h3>
        <p className="text-xs text-slate-500 italic">
          No statistical threshold crossings detected in this interval. Play is tactically balanced.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Detected Turning Points ({turningPoints.length})
          </h3>
          <p className="text-[11px] text-slate-500">
            Identified by deterministic statistical delta thresholds
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {turningPoints.map((tp) => {
          const isSelected = selectedTurningPointId === tp.id;
          const isRecovery = tp.id.includes('resistance');
          const isDecay = tp.id.includes('decay');

          return (
            <div
              key={tp.id}
              onClick={() => onSelectTurningPoint(tp)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  {isRecovery ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : isDecay ? (
                    <TrendingDown className="h-4 w-4 text-red-600 shrink-0" />
                  ) : (
                    <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  <span className="font-bold text-xs text-slate-900">{tp.title}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase ${
                      tp.severity === 'decisive'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tp.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tp.severity}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{tp.interval.label}</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 font-medium mb-2">{tp.summary}</p>

              {/* Statistical facts and thresholds */}
              <div className="bg-white border border-slate-200/80 rounded-md p-2 text-[11px] space-y-1">
                <div className="text-slate-600 font-mono text-[10px]">
                  {tp.observedFact}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>
                    Baseline: <b className="text-slate-700">{tp.baselineValue}</b> → Current:{' '}
                    <b className="text-slate-700">{tp.currentValue}</b> (Delta: {tp.observedDelta > 0 ? `+${tp.observedDelta}` : tp.observedDelta})
                  </span>
                  <span className="text-emerald-700 font-medium">
                    {tp.supportingEventIds.length} source events verified
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

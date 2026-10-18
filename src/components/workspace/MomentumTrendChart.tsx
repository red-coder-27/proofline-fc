import React from 'react';
import { MatchIntervalSnapshot } from '@/types/stats';

interface MomentumTrendChartProps {
  snapshots: MatchIntervalSnapshot[];
  selectedIntervalIndex: number;
  onSelectInterval: (index: number) => void;
}

export const MomentumTrendChart: React.FC<MomentumTrendChartProps> = ({
  snapshots,
  selectedIntervalIndex,
  onSelectInterval,
}) => {
  if (snapshots.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center text-xs text-slate-500">
        No interval snapshots calculated yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Tactical Momentum & Passing Delta Trend
          </h3>
          <p className="text-[11px] text-slate-500">
            Interval-by-interval comparison across verified match phases
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-700" />
            <span className="text-[11px] text-slate-600 font-medium">Titans Passing %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            <span className="text-[11px] text-slate-600 font-medium">Munich Press/min</span>
          </div>
        </div>
      </div>

      {/* Interval Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {snapshots.map((snap, idx) => {
          const isSelected = selectedIntervalIndex === idx;
          const homePass = snap.home.passingSuccessRate;
          const awayPress = snap.away.pressureFrequencyPerMin;
          const momentum = snap.momentumDelta; // -100 to +100

          return (
            <div
              key={snap.interval.label}
              onClick={() => onSelectInterval(idx)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-900">{snap.interval.label}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    snap.dominantTeam === 'home'
                      ? 'bg-blue-100 text-blue-800'
                      : snap.dominantTeam === 'away'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {snap.dominantTeam === 'home'
                    ? 'Titans Control'
                    : snap.dominantTeam === 'away'
                    ? 'Munich Pressing'
                    : 'Balanced Phase'}
                </span>
              </div>

              {/* Home Passing Rate Bar */}
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">Home Pass Accuracy</span>
                  <span className="font-bold tabular-nums text-slate-900">{homePass}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      homePass >= 80 ? 'bg-emerald-600' : homePass < 65 ? 'bg-amber-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, homePass))}%` }}
                  />
                </div>
              </div>

              {/* Away Pressure Rate Bar */}
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">Opponent Press Frequency</span>
                  <span className="font-bold tabular-nums text-slate-900">{awayPress} /min</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      awayPress >= 2.0 ? 'bg-red-600' : 'bg-slate-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, awayPress * 33))}%` }}
                  />
                </div>
              </div>

              {/* Momentum Balance Gauge */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Momentum:</span>
                <span
                  className={`font-semibold tabular-nums ${
                    momentum > 0 ? 'text-blue-700' : momentum < 0 ? 'text-red-700' : 'text-slate-700'
                  }`}
                >
                  {momentum > 0 ? `+${momentum} (Home)` : momentum < 0 ? `${momentum} (Away)` : '0.0 (Neutral)'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

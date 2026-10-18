import React, { useState } from 'react';
import { MatchEvent } from '@/types/events';
import { MatchIntervalSnapshot, TurningPoint } from '@/types/stats';
import { TruthlineRecord } from '@/types/claims';
import { PitchVisualization } from './PitchVisualization';
import { MomentumTrendChart } from './MomentumTrendChart';
import { TurningPointsList } from './TurningPointsList';
import { ContextualEvidenceDrawer } from './ContextualEvidenceDrawer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Sparkles, ArrowRight, Tv } from 'lucide-react';

interface MatchIntelligenceWorkspaceProps {
  events: MatchEvent[];
  snapshots: MatchIntervalSnapshot[];
  turningPoints: TurningPoint[];
  activeClaims: TruthlineRecord[];
  onNavigateToBroadcast: () => void;
}

export const MatchIntelligenceWorkspace: React.FC<MatchIntelligenceWorkspaceProps> = ({
  events,
  snapshots,
  turningPoints,
  activeClaims,
  onNavigateToBroadcast,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [selectedIntervalIndex, setSelectedIntervalIndex] = useState<number>(
    Math.max(0, snapshots.length - 1)
  );

  const selectedClaim = activeClaims[0] || null;

  const highlightedEventIds = selectedClaim ? selectedClaim.audit.referencedEventIds : [];

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Verified Tactical Insight */}
      {selectedClaim && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <Sparkles className="h-3 w-3" /> Active Tactical Insight
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Interval: <b className="text-slate-800">{selectedClaim.interval.label}</b>
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Category: <b className="text-slate-800">{selectedClaim.category.replace('_', ' ')}</b>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={selectedClaim.status} />
              <button
                onClick={onNavigateToBroadcast}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-md transition-colors cursor-pointer"
              >
                <Tv className="h-3.5 w-3.5" />
                <span>Preview On-Air Chyron</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <h2 className="text-base font-bold text-slate-900 leading-snug">
              {selectedClaim.claimText}
            </h2>
            {selectedClaim.broadcastDecision?.audienceDrafts?.casualFan && (
              <p className="mt-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <b className="text-slate-900 font-semibold">Broadcast Summary:</b>{' '}
                {selectedClaim.broadcastDecision.audienceDrafts.casualFan}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Pitch & Trends on Left, Evidence & Turning Points on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Pitch + Momentum Trend */}
        <div className="lg:col-span-7 space-y-6">
          <PitchVisualization
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={(id) => setSelectedEventId(id)}
            highlightedEventIds={highlightedEventIds}
          />

          <MomentumTrendChart
            snapshots={snapshots}
            selectedIntervalIndex={selectedIntervalIndex}
            onSelectInterval={(idx) => setSelectedIntervalIndex(idx)}
          />
        </div>

        {/* Right Column (5 cols): Contextual Evidence Drawer + Turning Points */}
        <div className="lg:col-span-5 space-y-6">
          <ContextualEvidenceDrawer
            claim={selectedClaim}
            onSelectEventId={(id) => setSelectedEventId(id)}
          />

          <TurningPointsList
            turningPoints={turningPoints}
            onSelectTurningPoint={(tp) => {
              if (tp.supportingEventIds.length > 0) {
                setSelectedEventId(tp.supportingEventIds[0]);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

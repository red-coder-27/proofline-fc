import React, { useState } from 'react';
import { TruthlineRecord } from '@/types/claims';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Filter,
  History,
  GitBranch,
  ChevronDown,
  ChevronUp,
  FileCheck2,
} from 'lucide-react';
import { deduplicateTruthlineRecords } from '@/lib/claims/claimsDeduplicator';

interface TruthlineLedgerProps {
  claims: TruthlineRecord[];
}

export const TruthlineLedger: React.FC<TruthlineLedgerProps> = ({ claims }) => {
  const dedupedClaims = deduplicateTruthlineRecords(claims);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(dedupedClaims[0]?.claimId || null);

  const filteredClaims = dedupedClaims.filter((claim) => {
    if (filterStatus === 'all') return true;
    return claim.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck2 className="h-5 w-5 text-emerald-800" />
              <h2 className="text-base font-bold text-slate-900">Truthline Evidence Ledger</h2>
            </div>
            <p className="text-xs text-slate-600">
              The immutable audit trail of all candidate claims, recalculation results, epistemic revisions, and supersession links.
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs overflow-x-auto">
            <Filter className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
            {[
              { id: 'all', label: `All (${claims.length})` },
              { id: 'verified', label: 'Verified' },
              { id: 'uncertain', label: 'Uncertain' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'superseded', label: 'Superseded' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-3">
        {filteredClaims.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No claims match the selected filter.
          </div>
        ) : (
          filteredClaims.map((claim) => {
            const isExpanded = expandedClaimId === claim.claimId;
            const isSuperseded = claim.status === 'superseded';
            const isRejected = claim.status === 'rejected';

            return (
              <div
                key={claim.claimId}
                className={`bg-white rounded-xl border transition-all ${
                  isSuperseded
                    ? 'border-slate-300 bg-slate-50/50 opacity-90'
                    : isRejected
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Summary Header */}
                <div
                  onClick={() => setExpandedClaimId(isExpanded ? null : claim.claimId)}
                  className="p-4 flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {claim.claimId}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        v{claim.version}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600">
                        Interval: <b>{claim.interval.label}</b>
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {claim.epistemicType}
                      </span>
                      {claim.revisions.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <History className="h-3 w-3" />
                          {claim.revisions.length} revision(s)
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-bold ${
                        isSuperseded ? 'text-slate-600 line-through' : 'text-slate-900'
                      }`}
                    >
                      {claim.claimText}
                    </h3>

                    {/* Superseded Notice */}
                    {isSuperseded && claim.supersededByClaimId && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                        <GitBranch className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        <span>
                          Superseded by <b>{claim.supersededByClaimId}</b> in later interval: New match evidence invalidated the earlier explanation.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={claim.status} />
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Detailed Audit Breakdown */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100 mt-2 space-y-4 text-xs">
                    {/* Verification Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Event Verification</div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {claim.audit.validEventCount} of {claim.audit.referencedEventIds.length} Verified
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Uncertainty Calibration</div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {(claim.audit.uncertaintyScore * 100).toFixed(0)}% Uncertainty
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Broadcast Gateway</div>
                        <div className="font-bold text-slate-900 mt-0.5 capitalize">
                          {claim.broadcastDecision?.decision.replace('_', ' ') || 'Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Numeric recalculation table */}
                    {claim.audit.numericAssertions.length > 0 && (
                      <div>
                        <div className="font-semibold text-slate-800 mb-1.5">Recalculated Numerical Proof:</div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                          {claim.audit.numericAssertions.map((a) => (
                            <div key={`${claim.claimId}_num_${a.metricName}`} className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-slate-700">{a.metricName}</span>
                              <span className="font-mono text-slate-900">
                                Claimed: {a.claimedValue}{a.unit} | Verified: <b>{a.recalculatedValue}{a.unit}</b>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Revision History */}
                    {claim.revisions.length > 0 && (
                      <div>
                        <div className="font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-amber-700" />
                          <span>Revision History:</span>
                        </div>
                        <div className="space-y-2 border-l-2 border-amber-300 pl-3">
                          {claim.revisions.map((rev) => (
                            <div key={`${claim.claimId}_rev_${rev.revisionIndex}`} className="text-[11px] space-y-0.5">
                              <div className="font-semibold text-slate-800">
                                Revision #{rev.revisionIndex} ({rev.revisingAgent})
                              </div>
                              <div className="text-slate-500 italic">
                                Directive: {rev.revisionReason}
                              </div>
                              <div className="text-slate-700 font-mono text-[10px] bg-slate-100 p-1.5 rounded">
                                Previous: &ldquo;{rev.previousClaimText}&rdquo;
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Producer Decision Rationale */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div className="font-semibold text-slate-800 text-xs mb-1">
                        Broadcast Producer Decision Rationale:
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        {claim.broadcastDecision?.rationale}
                      </p>
                    </div>

                    {/* Provenance */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>Proposed by: {claim.provenance.proposedByAgent}</span>
                      <span>Audited by: {claim.provenance.auditedByAgent}</span>
                      <span>Produced by: {claim.provenance.producedByAgent}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

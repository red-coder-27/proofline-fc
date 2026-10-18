import React from 'react';
import { TruthlineRecord } from '@/types/claims';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CheckCircle2, XCircle, AlertTriangle, Shield, ArrowUpRight } from 'lucide-react';

interface ContextualEvidenceDrawerProps {
  claim: TruthlineRecord | null;
  onSelectEventId?: (id: string) => void;
}

export const ContextualEvidenceDrawer: React.FC<ContextualEvidenceDrawerProps> = ({
  claim,
  onSelectEventId,
}) => {
  if (!claim) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs text-center text-slate-500 text-xs">
        Select a claim or turning point to inspect supporting evidence and validation rules.
      </div>
    );
  }

  const { audit } = claim;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs font-bold text-slate-500">{claim.claimId}</span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              v{claim.version}
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {claim.epistemicType}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug">{claim.claimText}</h3>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {/* Verification Rule Checklist */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-700" />
          10-Point Verification Checklist
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200">
            {audit.ruleChecks.referencedEventsExist ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span className="text-slate-800">
              Event IDs Valid ({audit.validEventCount} verified)
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200">
            {audit.ruleChecks.intervalBoundariesValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span className="text-slate-800">Interval Bounds Valid ({claim.interval.label})</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200">
            {audit.ruleChecks.numericClaimsVerified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span className="text-slate-800">Numeric Recalculation Passed</span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200">
            {audit.ruleChecks.causalGuardrailPassed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span className="text-slate-800">
              {audit.ruleChecks.causalGuardrailPassed
                ? 'Causal Guardrail Passed'
                : 'Causal Assertion Qualified'}
            </span>
          </div>
        </div>
      </div>

      {/* Recalculated Numeric Assertions */}
      {audit.numericAssertions.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Deterministic Recalculation
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-md">
              <thead className="bg-slate-50 text-[11px] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2">Metric</th>
                  <th className="p-2">Claimed</th>
                  <th className="p-2">Recalculated</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audit.numericAssertions.map((assertion) => (
                  <tr key={assertion.metricName} className="hover:bg-slate-50/50">
                    <td className="p-2 font-medium text-slate-800">{assertion.metricName}</td>
                    <td className="p-2 tabular-nums text-slate-700">
                      {assertion.claimedValue}
                      {assertion.unit}
                    </td>
                    <td className="p-2 tabular-nums font-bold text-slate-900">
                      {assertion.recalculatedValue}
                      {assertion.unit}
                    </td>
                    <td className="p-2">
                      {assertion.matches ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Match (±{assertion.tolerance}
                          {assertion.unit})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
                          <XCircle className="h-3.5 w-3.5" /> Discrepancy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Counter-Evidence Scan */}
      {audit.counterEvidence.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>Counter-Evidence Detected ({audit.counterEvidence.length})</span>
          </div>
          <div className="space-y-1.5">
            {audit.counterEvidence.map((item) => (
              <div
                key={item.eventId}
                className="text-[11px] text-amber-950 bg-white/80 p-2 rounded border border-amber-200/60"
              >
                <span className="font-mono font-semibold text-amber-800 mr-2">{item.eventId} ({item.minute}&apos;):</span>
                {item.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referenced Event IDs */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Source Event References ({audit.referencedEventIds.length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set(audit.referencedEventIds)).map((id) => (
            <button
              key={id}
              onClick={() => onSelectEventId && onSelectEventId(id)}
              className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{id}</span>
              <ArrowUpRight className="h-3 w-3 text-slate-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Auditor Decision Explanation */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
        <div className="font-semibold text-slate-900 mb-0.5">Auditor Decision Rationale:</div>
        <p className="text-slate-700 text-[11px] leading-relaxed">{audit.decisionReason}</p>
        {audit.uncertaintyReason && (
          <p className="mt-1 text-[11px] text-amber-800 font-medium bg-amber-50 p-1.5 rounded border border-amber-200">
            Uncertainty Note: {audit.uncertaintyReason}
          </p>
        )}
      </div>

      {/* Superseded Link if applicable */}
      {claim.status === 'superseded' && (
        <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <span>Superseded by {claim.supersededByClaimId}</span>
          </div>
          <p className="text-slate-600 text-[11px] mt-1">{claim.supersessionReason}</p>
        </div>
      )}
    </div>
  );
};

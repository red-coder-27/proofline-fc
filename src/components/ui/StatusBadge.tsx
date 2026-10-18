import React from 'react';
import { ClaimStatus, VerificationOutcome } from '@/types/claims';

interface StatusBadgeProps {
  status: ClaimStatus | VerificationOutcome;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  switch (status) {
    case 'verified':
    case 'accepted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Verified
        </span>
      );

    case 'proposed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-blue-50 text-blue-800 border border-blue-200 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          Proposed
        </span>
      );

    case 'uncertain':
    case 'accepted_with_uncertainty':
    case 'insufficient_evidence':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          {status === 'insufficient_evidence' ? 'Insufficient Evidence' : 'Uncertain / Qualified'}
        </span>
      );

    case 'rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-red-50 text-red-800 border border-red-200 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          Rejected
        </span>
      );

    case 'superseded':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          Superseded
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-gray-100 text-gray-800 border border-gray-200 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
};

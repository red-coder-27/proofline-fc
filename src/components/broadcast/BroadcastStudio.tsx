import React, { useState, useMemo, useCallback } from 'react';
import { TruthlineRecord } from '@/types/claims';
import { MatchEvent } from '@/types/events';
import { MatchIntervalSnapshot } from '@/types/stats';
import { DEFAULT_TEAMS } from '@/lib/eventEngine/generator';
import { deduplicateTruthlineRecords } from '@/lib/claims/claimsDeduplicator';
import {
  Tv,
  Users,
  UserCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';

export interface BroadcastStudioProps {
  claims: TruthlineRecord[];
  events?: MatchEvent[];
  snapshots?: MatchIntervalSnapshot[];
}

export interface LabelPlacement {
  eventId: string;
  markerX: number;
  markerY: number;
  labelX: number;
  labelY: number;
  text: string;
}

/**
 * Computes deterministic, collision-avoided placements for cited event labels
 * using leader lines so no two labels or pitch boundaries ever overlap.
 */
export function computeCitedLabelPlacements(
  events: MatchEvent[],
  supportingIds: Set<string>
): LabelPlacement[] {
  const cited = events
    .filter((e) => supportingIds.has(e.id))
    .map((e) => ({
      id: e.id,
      mx: 5 + (e.x / 100) * 95,
      my: 4 + (e.y / 100) * 60,
    }))
    .sort((a, b) => a.mx - b.mx);

  const placements: LabelPlacement[] = [];
  const occupiedBoxes: { x1: number; x2: number; y1: number; y2: number }[] = [];

  const labelW = 9.5;
  const labelH = 3.8;

  for (let i = 0; i < cited.length; i++) {
    const { id, mx, my } = cited[i];

    // Attempt 1: above marker
    let targetY = my - 4.8;
    let targetX = mx;
    let collides = targetY < 8;

    if (!collides) {
      for (const box of occupiedBoxes) {
        if (
          Math.abs(targetX - (box.x1 + box.x2) / 2) < labelW &&
          Math.abs(targetY - (box.y1 + box.y2) / 2) < labelH
        ) {
          collides = true;
          break;
        }
      }
    }

    // Attempt 2: below marker
    if (collides) {
      targetY = my + 5.2;
      targetX = mx;
      collides = targetY > 60;

      if (!collides) {
        for (const box of occupiedBoxes) {
          if (
            Math.abs(targetX - (box.x1 + box.x2) / 2) < labelW &&
            Math.abs(targetY - (box.y1 + box.y2) / 2) < labelH
          ) {
            collides = true;
            break;
          }
        }
      }
    }

    // Attempt 3: offset horizontally with leader line
    if (collides) {
      targetX = i % 2 === 0 ? mx - 5.5 : mx + 5.5;
      targetY = my > 34 ? my - 4.5 : my + 4.5;
    }

    // Clamp inside visible pitch canvas
    targetX = Math.max(9.5, Math.min(95.5, targetX));
    targetY = Math.max(8, Math.min(60, targetY));

    occupiedBoxes.push({
      x1: targetX - labelW / 2,
      x2: targetX + labelW / 2,
      y1: targetY - labelH / 2,
      y2: targetY + labelH / 2,
    });

    placements.push({
      eventId: id,
      markerX: mx,
      markerY: my,
      labelX: targetX,
      labelY: targetY,
      text: id,
    });
  }

  return placements;
}

interface BroadcastPitchMarkerProps {
  event: MatchEvent;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/**
 * Memoized marker for background telemetry events (passes, incomplete passes, pressures, turnovers).
 * Features stable coordinates, stationary geometry (no CSS scale flicker), transparent hit target,
 * and prominent revealed ID badge on hover or selection without obstructing pitch lines.
 */
export const BroadcastPitchMarker: React.FC<BroadcastPitchMarkerProps> = React.memo(
  function BroadcastPitchMarker({
    event,
    isHovered,
    isSelected,
    onHover,
    onSelect,
  }) {
    const px = 5 + (event.x / 100) * 95;
    const py = 4 + (event.y / 100) * 60;
    const isActive = isHovered || isSelected;

    return (
      <g
        className="cursor-pointer"
        onPointerEnter={() => onHover(event.id)}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(event.id);
        }}
      >
        {/* Transparent hit target circle to prevent boundary edge chatter */}
        <circle cx={px} cy={py} r="2.8" fill="transparent" stroke="none" />

        {/* Stable event shape rendering by type with high contrast */}
        {event.type === 'pass' && (
          <circle
            cx={px}
            cy={py}
            r="1.2"
            fill="#38bdf8"
            stroke={isSelected ? '#ffffff' : '#0369a1'}
            strokeWidth={isSelected ? 0.5 : 0.3}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {event.type === 'pass_failed' && (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={px - 1.1}
              y1={py - 1.1}
              x2={px + 1.1}
              y2={py + 1.1}
              stroke={isSelected ? '#ffffff' : '#f43f5e'}
              strokeWidth={isSelected ? 0.7 : 0.5}
            />
            <line
              x1={px - 1.1}
              y1={py + 1.1}
              x2={px + 1.1}
              y2={py - 1.1}
              stroke={isSelected ? '#ffffff' : '#f43f5e'}
              strokeWidth={isSelected ? 0.7 : 0.5}
            />
          </g>
        )}

        {event.type === 'pressure' && (
          <polygon
            points={`${px},${py - 1.3} ${px + 1.3},${py} ${px},${py + 1.3} ${px - 1.3},${py}`}
            fill="#c084fc"
            stroke={isSelected ? '#ffffff' : '#7e22ce'}
            strokeWidth={isSelected ? 0.5 : 0.3}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {(event.type === 'turnover' || event.type === 'possession_change') && (
          <circle
            cx={px}
            cy={py}
            r="1.3"
            fill="#fbbf24"
            stroke={isSelected ? '#ffffff' : '#b45309'}
            strokeWidth={isSelected ? 0.5 : 0.3}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {event.type !== 'pass' &&
          event.type !== 'pass_failed' &&
          event.type !== 'pressure' &&
          event.type !== 'turnover' &&
          event.type !== 'possession_change' && (
            <circle
              cx={px}
              cy={py}
              r="0.9"
              fill="#e2e8f0"
              opacity={0.7}
              style={{ pointerEvents: 'none' }}
            />
          )}

        {/* Stationary Highlight Ring on Hover / Selection (No CSS scale animation) */}
        {isActive && (
          <circle
            cx={px}
            cy={py}
            r="2.5"
            fill="none"
            stroke={isSelected ? '#38bdf8' : '#ffffff'}
            strokeWidth={0.45}
            strokeDasharray={isSelected ? 'none' : '0.8, 0.5'}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Prominently revealed Event ID Badge on Hover or Selection */}
        {isActive && (
          <g
            className="pointer-events-none select-none"
            style={{ pointerEvents: 'none' }}
          >
            <rect
              x={px - 4.5}
              y={py > 12 ? py - 5.0 : py + 2.5}
              width="9"
              height="3.2"
              rx="1"
              fill="#020617"
              stroke={isSelected ? '#38bdf8' : '#94a3b8'}
              strokeWidth={0.4}
              fillOpacity={0.95}
              style={{ pointerEvents: 'none' }}
            />
            <text
              x={px}
              y={py > 12 ? py - 2.9 : py + 4.6}
              fill={isSelected ? '#38bdf8' : '#f8fafc'}
              fontSize="1.7"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
              style={{ pointerEvents: 'none' }}
            >
              {event.id}
            </text>
          </g>
        )}
      </g>
    );
  }
);

interface CitedEvidenceMarkerProps {
  event: MatchEvent;
  placement?: LabelPlacement;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/**
 * Memoized marker for Cited Evidence events.
 * Renders the marker, invisible hit corridor, visible leader line, and collision-avoided
 * ID pill in a single unified SVG group. Moving the pointer between the marker and its label
 * never resets hover.
 */
export const CitedEvidenceMarker: React.FC<CitedEvidenceMarkerProps> = React.memo(
  function CitedEvidenceMarker({
    event,
    placement,
    isHovered,
    isSelected,
    onHover,
    onSelect,
  }) {
    const px = 5 + (event.x / 100) * 95;
    const py = 4 + (event.y / 100) * 60;
    const isActive = isHovered || isSelected;

    return (
      <g
        className="cursor-pointer"
        onPointerEnter={() => onHover(event.id)}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(event.id);
        }}
      >
        {/* Transparent hit target circle around marker */}
        <circle cx={px} cy={py} r="3.2" fill="transparent" stroke="none" />

        {/* Outer Evidence Glow Ring (Stable Radius, Geometry Never Jumps) */}
        <circle
          cx={px}
          cy={py}
          r="3.2"
          fill="#10b981"
          fillOpacity={isSelected ? 0.45 : isHovered ? 0.35 : 0.22}
          stroke={isSelected ? '#38bdf8' : '#34d399'}
          strokeWidth={isSelected ? 0.7 : 0.5}
          style={{ pointerEvents: 'none' }}
        />

        {/* Core Solid Marker */}
        <circle
          cx={px}
          cy={py}
          r="1.3"
          fill={isSelected ? '#38bdf8' : '#34d399'}
          stroke="#ffffff"
          strokeWidth={0.5}
          style={{ pointerEvents: 'none' }}
        />

        {/* Collision-Avoided Label Pill & Leader Line in Unified Hit Group */}
        {placement && (
          <>
            {/* Transparent Hit Corridor between Marker and Pill */}
            <line
              x1={px}
              y1={py}
              x2={placement.labelX}
              y2={placement.labelY}
              stroke="transparent"
              strokeWidth="3.0"
            />

            {/* Visible Dashed Leader Line */}
            <line
              x1={px}
              y1={py}
              x2={placement.labelX}
              y2={placement.labelY}
              stroke={isSelected ? '#38bdf8' : '#34d399'}
              strokeWidth={isSelected ? 0.5 : 0.35}
              strokeDasharray="0.8, 0.4"
              style={{ pointerEvents: 'none' }}
            />

            {/* Pill Badge Background */}
            <rect
              x={placement.labelX - 4.8}
              y={placement.labelY - 1.9}
              width="9.6"
              height="3.8"
              rx="1.2"
              fill={isSelected ? '#0369a1' : isHovered ? '#047857' : '#022c22'}
              stroke={isSelected ? '#38bdf8' : '#34d399'}
              strokeWidth={isActive ? 0.6 : 0.4}
            />

            {/* Pill Event ID Text */}
            <text
              x={placement.labelX}
              y={placement.labelY + 0.65}
              fill={isSelected ? '#ffffff' : '#ecfdf5'}
              fontSize="1.9"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
              className="pointer-events-none select-none"
              style={{ pointerEvents: 'none' }}
            >
              {placement.text}
            </text>
          </>
        )}
      </g>
    );
  }
);

export const BroadcastStudio: React.FC<BroadcastStudioProps> = ({
  claims,
  events = [],
  snapshots = [],
}) => {
  const dedupedClaims = useMemo(() => deduplicateTruthlineRecords(claims), [claims]);
  const publishedClaims = useMemo(
    () => dedupedClaims.filter((c) => c.broadcastDecision?.published),
    [dedupedClaims]
  );

  const [selectedClaimId, setSelectedClaimId] = useState<string>(
    publishedClaims[0]?.claimId || dedupedClaims[0]?.claimId || ''
  );
  const [activeAudience, setActiveAudience] = useState<'casual' | 'analyst' | 'both'>('both');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const handleHover = useCallback((id: string | null) => {
    setHoveredEventId(id);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedEventId((prev) => (prev === id ? null : id));
  }, []);

  const selectedClaim = useMemo(() => {
    return (
      dedupedClaims.find((c) => c.claimId === selectedClaimId) ||
      publishedClaims[0] ||
      dedupedClaims[0] ||
      null
    );
  }, [dedupedClaims, publishedClaims, selectedClaimId]);

  // Filter actual events for the selected claim's interval
  const intervalEvents = useMemo(() => {
    if (!selectedClaim || !events || events.length === 0) return [];
    return events.filter(
      (e) =>
        e.minute >= selectedClaim.interval.startMinute &&
        e.minute <= selectedClaim.interval.endMinute
    );
  }, [selectedClaim, events]);

  // Set of event IDs specifically cited by the Evidence Auditor for this claim
  const supportingEventIds = useMemo(() => {
    if (!selectedClaim?.audit?.referencedEventIds) return new Set<string>();
    return new Set<string>(selectedClaim.audit.referencedEventIds);
  }, [selectedClaim]);

  // Find snapshot for the selected claim's interval
  const activeSnapshot = useMemo(() => {
    if (!selectedClaim || !snapshots || snapshots.length === 0) return null;
    return (
      snapshots.find(
        (s) => s.interval.startMinute === selectedClaim.interval.startMinute
      ) || snapshots[0]
    );
  }, [selectedClaim, snapshots]);

  // Compute collision-avoided labels for cited evidence events
  const citedLabelPlacements = useMemo(() => {
    return computeCitedLabelPlacements(intervalEvents, supportingEventIds);
  }, [intervalEvents, supportingEventIds]);

  const placementMap = useMemo(() => {
    const map = new Map<string, LabelPlacement>();
    for (const p of citedLabelPlacements) {
      map.set(p.eventId, p);
    }
    return map;
  }, [citedLabelPlacements]);

  const isPublished = Boolean(selectedClaim?.broadcastDecision?.published);
  const isVerified = selectedClaim?.status === 'verified';
  const isUncertain = selectedClaim?.status === 'uncertain';
  const isRejected = selectedClaim?.status === 'rejected';

  // Decoupled active inspection: hover takes temporary precedence, selected stays persistent
  const inspectedEventId = hoveredEventId || selectedEventId;

  const inspectedEvent = useMemo(() => {
    if (!inspectedEventId) return null;
    return intervalEvents.find((e) => e.id === inspectedEventId) || null;
  }, [inspectedEventId, intervalEvents]);

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tv className="h-5 w-5 text-emerald-800" />
              <h2 className="text-base font-bold text-slate-900">Broadcast Studio & On-Air Chyrons</h2>
            </div>
            <p className="text-xs text-slate-600">
              High-visibility tactical pitch telemetry with decoupled verified chyrons and audience-specific personalizations (Casual Fan vs Analyst).
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
            <Lock className="h-3 w-3 text-emerald-700" />
            <span>Broadcast Quality Gate: 0% Unverified Publication</span>
          </div>
        </div>
      </div>

      {/* Claim Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {dedupedClaims.map((c) => {
          const isSelected = selectedClaim?.claimId === c.claimId;
          const isClaimPublished = c.broadcastDecision?.published;

          return (
            <button
              key={`claim_tab_${c.claimId}`}
              onClick={() => {
                setSelectedClaimId(c.claimId);
                setSelectedEventId(null);
                setHoveredEventId(null);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="font-mono text-[11px]">{c.claimId}</span>
              <span className="truncate max-w-[120px]">{c.category.replace('_', ' ')}</span>
              {isClaimPublished ? (
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSelected ? 'bg-emerald-300' : 'bg-emerald-600'
                  }`}
                  title="Approved for On-Air"
                />
              ) : (
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSelected ? 'bg-red-300' : 'bg-red-500'
                  }`}
                  title="Withheld from Broadcast"
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedClaim && (
        <div className="space-y-5">
          {/* 1. PRIMARY VISUAL ELEMENT: Tactically Visible, Full-Width Broadcast Pitch Frame */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-5 flex flex-col gap-3.5">
            {/* Top Broadcast Bar: Scoreboard, Interval, Telemetry Disclosure, and Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-white">
              {/* Left: Feed Identity & Score Bug */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-xs font-bold shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tracking-wide">PROOFLINE FC BROADCAST FEED</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 font-mono text-[11px] font-normal">
                    SYNTHETIC TELEMETRY
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-xs font-bold">
                  <span className="text-slate-200">{DEFAULT_TEAMS.home.shortName}</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-400">1 - 1</span>
                  <span className="text-slate-200">{DEFAULT_TEAMS.away.shortName}</span>
                  <span className="text-slate-600">|</span>
                  <span className="font-mono text-emerald-400">{selectedClaim.interval.label}</span>
                </div>
              </div>

              {/* Right: Tactical Event Legend */}
              <div className="flex items-center gap-3.5 flex-wrap text-[11px] text-slate-300 bg-slate-950/70 px-3 py-1 rounded-lg border border-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50" />
                  <span className="font-semibold text-emerald-300">Cited Evidence</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <span>Pass</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-rose-400 font-bold text-xs leading-none">✕</span>
                  <span>Incomplete</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rotate-45 bg-purple-400" />
                  <span>Pressure</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Turnover</span>
                </span>
              </div>
            </div>

            {/* Broadcast Football Pitch SVG (High contrast, broadcast emerald green turf, full visibility) */}
            <div className="relative w-full h-[300px] sm:h-[350px] md:h-[390px] rounded-xl overflow-hidden border border-[#1b432a] bg-[#123e23] shadow-inner select-none">
              <svg
                viewBox="0 0 105 68"
                className="w-full h-full"
                preserveAspectRatio="none"
                onClick={() => setSelectedEventId(null)}
              >
                {/* Regulation Football Pitch Turf with Broadcast Vertical Mowing Stripes */}
                <rect x="0" y="0" width="105" height="68" fill="#134e2b" />
                <rect x="17.5" y="0" width="17.5" height="68" fill="#155832" opacity="0.3" />
                <rect x="52.5" y="0" width="17.5" height="68" fill="#155832" opacity="0.3" />
                <rect x="87.5" y="0" width="17.5" height="68" fill="#155832" opacity="0.3" />

                {/* Regulation Pitch Boundary Lines (Bright White, High Contrast) */}
                <rect
                  x="5"
                  y="4"
                  width="95"
                  height="60"
                  rx="0.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  strokeOpacity="0.85"
                />

                {/* Halfway Line & Center Circle */}
                <line
                  x1="52.5"
                  y1="4"
                  x2="52.5"
                  y2="64"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  strokeOpacity="0.85"
                />
                <circle
                  cx="52.5"
                  cy="34"
                  r="9"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  strokeOpacity="0.85"
                />
                <circle cx="52.5" cy="34" r="0.6" fill="#ffffff" strokeOpacity="0.9" />

                {/* Left Penalty Area (Home: London Titans) */}
                <rect
                  x="5"
                  y="17.5"
                  width="16.5"
                  height="33"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.45"
                  strokeOpacity="0.85"
                />
                <rect
                  x="5"
                  y="25"
                  width="5.5"
                  height="18"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.4"
                  strokeOpacity="0.75"
                />
                <circle cx="16" cy="34" r="0.5" fill="#ffffff" />
                <path
                  d="M 21.5 27.5 A 9 9 0 0 1 21.5 40.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.45"
                  strokeOpacity="0.8"
                />

                {/* Right Penalty Area (Away: Munich Red Star) */}
                <rect
                  x="83.5"
                  y="17.5"
                  width="16.5"
                  height="33"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.45"
                  strokeOpacity="0.85"
                />
                <rect
                  x="94.5"
                  y="25"
                  width="5.5"
                  height="18"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.4"
                  strokeOpacity="0.75"
                />
                <circle cx="89" cy="34" r="0.5" fill="#ffffff" />
                <path
                  d="M 83.5 27.5 A 9 9 0 0 0 83.5 40.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.45"
                  strokeOpacity="0.8"
                />

                {/* Tactical Third-of-Pitch Dividers */}
                <line x1="36.6" y1="4" x2="36.6" y2="64" stroke="#ffffff" strokeWidth="0.35" strokeDasharray="1.5, 1.5" strokeOpacity="0.3" />
                <line x1="68.3" y1="4" x2="68.3" y2="64" stroke="#ffffff" strokeWidth="0.35" strokeDasharray="1.5, 1.5" strokeOpacity="0.3" />

                {/* Third-of-Pitch Zone Header Labels */}
                <text x="20.8" y="7.5" fill="#ffffff" fontSize="2.2" fontWeight="700" textAnchor="middle" opacity="0.55" letterSpacing="0.2">
                  DEFENSIVE THIRD ({DEFAULT_TEAMS.home.shortName})
                </text>
                <text x="52.5" y="7.5" fill="#ffffff" fontSize="2.2" fontWeight="700" textAnchor="middle" opacity="0.55" letterSpacing="0.2">
                  MIDDLE THIRD
                </text>
                <text x="84.2" y="7.5" fill="#ffffff" fontSize="2.2" fontWeight="700" textAnchor="middle" opacity="0.55" letterSpacing="0.2">
                  ATTACKING THIRD ({DEFAULT_TEAMS.away.shortName})
                </text>

                {/* 1. Render Background Telemetry Events (Passes, Pressures, Turnovers) */}
                {intervalEvents
                  .filter((ev) => !supportingEventIds.has(ev.id))
                  .map((ev) => (
                    <BroadcastPitchMarker
                      key={`marker_${ev.id}`}
                      event={ev}
                      isHovered={hoveredEventId === ev.id}
                      isSelected={selectedEventId === ev.id}
                      onHover={handleHover}
                      onSelect={handleSelect}
                    />
                  ))}

                {/* 2. Render Cited Evidence Events with Collision-Avoided Pills */}
                {intervalEvents
                  .filter((ev) => supportingEventIds.has(ev.id))
                  .map((ev) => (
                    <CitedEvidenceMarker
                      key={`cited_${ev.id}`}
                      event={ev}
                      placement={placementMap.get(ev.id)}
                      isHovered={hoveredEventId === ev.id}
                      isSelected={selectedEventId === ev.id}
                      onHover={handleHover}
                      onSelect={handleSelect}
                    />
                  ))}

                {/* 3. Floating Inspection Card (Pointer Events strictly disabled, stable positioning) */}
                {inspectedEvent && (() => {
                  const hx = 5 + (inspectedEvent.x / 100) * 95;
                  const hy = 4 + (inspectedEvent.y / 100) * 60;
                  const cardY = hy < 28 ? hy + 7.5 : hy - 7.5;
                  const cardX = Math.max(16, Math.min(89, hx));
                  const isSelected = selectedEventId === inspectedEvent.id;
                  const isCited = supportingEventIds.has(inspectedEvent.id);

                  return (
                    <g
                      className="pointer-events-none select-none"
                      style={{ pointerEvents: 'none' }}
                    >
                      <rect
                        x={cardX - 15}
                        y={cardY - 4.2}
                        width="30"
                        height="8.4"
                        rx="1.6"
                        fill="#020617"
                        stroke={isSelected ? '#38bdf8' : isCited ? '#34d399' : '#64748b'}
                        strokeWidth={isSelected ? 0.7 : 0.5}
                        fillOpacity={0.96}
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        x={cardX}
                        y={cardY - 1.2}
                        fill="#ffffff"
                        fontSize="1.8"
                        fontWeight="bold"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                      >
                        {isSelected ? '● ' : ''}{inspectedEvent.id} • {inspectedEvent.minute}&apos; {inspectedEvent.type.replace('_', ' ').toUpperCase()}
                      </text>
                      <text
                        x={cardX}
                        y={cardY + 1.8}
                        fill={isCited ? '#34d399' : '#94a3b8'}
                        fontSize="1.5"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                      >
                        {inspectedEvent.teamName} ({inspectedEvent.outcome}){isCited ? ' • CITED EVIDENCE' : ''}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* In-Frame Context Footer: Inspection Tip & Active Telemetry Counter */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px]">
                  {selectedEventId ? (
                    <span>
                      Selected: <b className="text-white font-mono">{selectedEventId}</b> (click pitch or marker to deselect)
                    </span>
                  ) : (
                    <span>Hover or click any event marker or cited evidence ID pill above to inspect exact spatial telemetry.</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {selectedEventId && (
                  <button
                    onClick={() => setSelectedEventId(null)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                  >
                    Clear selection
                  </button>
                )}
                <span className="font-mono text-[11px] text-slate-400">
                  {intervalEvents.length} events in interval {selectedClaim.interval.label} ({supportingEventIds.size} cited)
                </span>
              </div>
            </div>
          </div>

          {/* 2. DECOUPLED ON-AIR VERIFIED TACTICAL INSIGHT PANEL (OUTSIDE THE PITCH) */}
          {/* Positioned cleanly below the pitch canvas, never obscuring tactical lines or event markers */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3.5">
            {isPublished ? (
              <div className="space-y-3">
                {/* Status & Categorization Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        <span>VERIFIED TACTICAL INSIGHT</span>
                      </span>
                    )}
                    {isUncertain && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                        <span>QUALIFIED CORRELATION</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-700" />
                        <span>UNVERIFIED CLAIM</span>
                      </span>
                    )}

                    <span className="text-xs font-semibold text-slate-700">
                      Interval: <b className="text-slate-900">{selectedClaim.interval.label}</b>
                    </span>

                    <span className="text-xs font-semibold text-slate-700">
                      Category: <b className="text-slate-900">{selectedClaim.category.replace('_', ' ').toUpperCase()}</b>
                    </span>

                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedClaim.epistemicType === 'factual'
                        ? 'Direct Observation'
                        : 'Certified Correlation'}
                    </span>
                  </div>

                  {/* Audit Gate Score */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                    <span className="flex items-center gap-1 font-semibold text-emerald-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      <span>10/10 Checks Passed</span>
                    </span>
                    <span>•</span>
                    <span>
                      Audited Uncertainty: <b>{(selectedClaim.audit.uncertaintyScore * 100).toFixed(0)}%</b>
                    </span>
                  </div>
                </div>

                {/* Prominent Verified Insight Headline (Responsive, Accessible Contrast) */}
                <div className="space-y-1">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-500">
                    On-Air Broadcast Narrative ({activeAudience === 'analyst' ? 'Analyst Mode' : 'Casual Fan Mode'}):
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {activeAudience === 'analyst'
                      ? selectedClaim.broadcastDecision?.audienceDrafts?.analyst || selectedClaim.claimText
                      : selectedClaim.broadcastDecision?.audienceDrafts?.casualFan || selectedClaim.claimText}
                  </h3>
                </div>

                {/* Evidence Provenance Strip */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-700">Supporting Evidence Events:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedClaim.audit.referencedEventIds.map((id) => {
                        const isSelected = selectedEventId === id;
                        const isHovered = hoveredEventId === id;
                        return (
                          <button
                            key={`evidence_ref_${id}`}
                            onClick={() => setSelectedEventId((prev) => (prev === id ? null : id))}
                            onPointerEnter={() => handleHover(id)}
                            onPointerLeave={() => handleHover(null)}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300'
                                : isHovered
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                            }`}
                            title="Click to select this event marker on the pitch above"
                          >
                            {id}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verified Metric Values */}
                  {activeSnapshot && (
                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                      <span>
                        Home Passing: <b className="text-slate-900">{activeSnapshot.home.passingSuccessRate}%</b>
                      </span>
                      <span>•</span>
                      <span>
                        Away Pressure: <b className="text-slate-900">{activeSnapshot.away.pressureFrequencyPerMin}/min</b>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Broadcast Graphic Withheld by Quality Gate */
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-red-900">
                    <ShieldAlert className="h-4 w-4 text-red-700" />
                    <span>ON-AIR GRAPHIC WITHHELD BY BROADCAST QUALITY GATE</span>
                  </div>
                  <span className="font-mono text-red-700 font-semibold">0% Unverified Publication Rule</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  {selectedClaim.broadcastDecision?.rationale ||
                    'Numeric assertion mismatch or invalid event reference detected during deterministic audit.'}
                </p>
                <div className="text-[11px] text-red-700 font-mono pt-1 border-t border-red-200">
                  Candidate claim {selectedClaim.claimId} failed verification threshold and is strictly withheld from broadcast display.
                </div>
              </div>
            )}
          </div>

          {/* 3. AUDIENCE PROFILE PERSONALIZATION & DECISION LOG (PRESERVED) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Audience Profile Personalization</h3>
                <p className="text-xs text-slate-500">
                  The same verified factual core adapted without compromising statistical integrity
                </p>
              </div>

              {/* Toggle mode */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs self-start">
                <button
                  onClick={() => setActiveAudience('both')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeAudience === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setActiveAudience('casual')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeAudience === 'casual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Casual Fan
                </button>
                <button
                  onClick={() => setActiveAudience('analyst')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeAudience === 'analyst' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Analyst
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Casual Fan Card */}
              {(activeAudience === 'both' || activeAudience === 'casual') && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Users className="h-4 w-4 text-blue-700" />
                    <span>Casual Fan Profile</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (Plain English, minimal jargon, zero hype)
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                    {selectedClaim.broadcastDecision?.audienceDrafts?.casualFan ||
                      'No casual draft available (insight withheld).'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rule: Translates statistical change into plain terms without asserting unproven causality.
                  </div>
                </div>
              )}

              {/* Analyst Profile Card */}
              {(activeAudience === 'both' || activeAudience === 'analyst') && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <UserCheck className="h-4 w-4 text-emerald-700" />
                    <span>Tactical Analyst Profile</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (Exact metrics, event provenance, baselines)
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono">
                    {selectedClaim.broadcastDecision?.audienceDrafts?.analyst ||
                      'No analyst draft available (insight withheld).'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rule: Full technical disclosures including sample size and counter-evidence flags.
                  </div>
                </div>
              )}
            </div>

            {/* Producer Rationale Card */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">Producer Publication Decision Log:</div>
              <p className="text-slate-700 leading-relaxed">{selectedClaim.broadcastDecision?.rationale}</p>
              <div className="text-[10px] text-slate-500 pt-1">
                Decided at: {selectedClaim.broadcastDecision?.decidedAt}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

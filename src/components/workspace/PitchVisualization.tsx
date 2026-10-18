import React, { useState } from 'react';
import { MatchEvent } from '@/types/events';

interface PitchVisualizationProps {
  events: MatchEvent[];
  selectedEventId?: string;
  onSelectEvent: (eventId: string) => void;
  highlightedEventIds?: string[];
}

export const PitchVisualization: React.FC<PitchVisualizationProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  highlightedEventIds = [],
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [hoveredEvent, setHoveredEvent] = useState<MatchEvent | null>(null);

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'all') return true;
    if (filterType === 'pass') return ev.type === 'pass' || ev.type === 'pass_failed';
    if (filterType === 'pressure') return ev.type === 'pressure';
    if (filterType === 'turnover') return ev.type === 'turnover' || ev.type === 'possession_change';
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Spatial Event & Pressure Plot
          </h3>
          <p className="text-[11px] text-slate-500">
            Full match stream ({filteredEvents.length} total events plotted • Claims cite specific verified subsets)
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs self-start sm:self-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'pass', label: 'Passes' },
            { id: 'pressure', label: 'Pressures' },
            { id: 'turnover', label: 'Turnovers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterType === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Football Pitch SVG Container */}
      <div className="relative w-full aspect-16/9 bg-[#1a472a] rounded-lg overflow-hidden border border-[#2d5a3c] shadow-inner">
        <svg
          viewBox="0 0 100 65"
          className="w-full h-full select-none"
          preserveAspectRatio="none"
        >
          {/* Pitch grass pattern stripes */}
          <rect x="0" y="0" width="100" height="65" fill="#1e4d2b" />
          <rect x="16.6" y="0" width="16.6" height="65" fill="#1b4728" opacity="0.6" />
          <rect x="50" y="0" width="16.6" height="65" fill="#1b4728" opacity="0.6" />
          <rect x="83.3" y="0" width="16.7" height="65" fill="#1b4728" opacity="0.6" />

          {/* Pitch Boundary Lines */}
          <rect
            x="3"
            y="3"
            width="94"
            height="59"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity="0.8"
          />

          {/* Halfway Line */}
          <line
            x1="50"
            y1="3"
            x2="50"
            y2="62"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity="0.8"
          />

          {/* Center Circle */}
          <circle
            cx="50"
            cy="32.5"
            r="9.15"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity="0.8"
          />
          <circle cx="50" cy="32.5" r="0.8" fill="#ffffff" fillOpacity="0.8" />

          {/* Left Penalty Area (Home Goal) */}
          <rect
            x="3"
            y="14"
            width="16.5"
            height="37"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity="0.8"
          />
          {/* Left Goal Area */}
          <rect
            x="3"
            y="23"
            width="5.5"
            height="19"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity="0.8"
          />
          {/* Left Penalty Spot */}
          <circle cx="14" cy="32.5" r="0.6" fill="#ffffff" fillOpacity="0.8" />

          {/* Right Penalty Area (Away Goal) */}
          <rect
            x="80.5"
            y="14"
            width="16.5"
            height="37"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity="0.8"
          />
          {/* Right Goal Area */}
          <rect
            x="91.5"
            y="23"
            width="5.5"
            height="19"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity="0.8"
          />
          {/* Right Penalty Spot */}
          <circle cx="86" cy="32.5" r="0.6" fill="#ffffff" fillOpacity="0.8" />

          {/* Tactical Third Markers (Dashed vertical lines) */}
          <line
            x1="33.3"
            y1="3"
            x2="33.3"
            y2="62"
            stroke="#ffffff"
            strokeWidth="0.3"
            strokeDasharray="1,1"
            strokeOpacity="0.4"
          />
          <line
            x1="66.6"
            y1="3"
            x2="66.6"
            y2="62"
            stroke="#ffffff"
            strokeWidth="0.3"
            strokeDasharray="1,1"
            strokeOpacity="0.4"
          />

          {/* Zone Labels */}
          <text x="18" y="7" fill="#ffffff" fillOpacity="0.5" fontSize="2.2" textAnchor="middle">
            DEFENSIVE THIRD
          </text>
          <text x="50" y="7" fill="#ffffff" fillOpacity="0.5" fontSize="2.2" textAnchor="middle">
            MIDDLE THIRD
          </text>
          <text x="82" y="7" fill="#ffffff" fillOpacity="0.5" fontSize="2.2" textAnchor="middle">
            ATTACKING THIRD
          </text>

          {/* Direction Indicator */}
          <text x="50" y="60" fill="#ffffff" fillOpacity="0.6" fontSize="2.0" textAnchor="middle">
            London Titans Attacking Right →
          </text>

          {/* Plotted Events */}
          {filteredEvents.map((ev) => {
            // Coordinate mapping: ev.x (0-100) -> 3 to 97, ev.y (0-100) -> 3 to 62
            const cx = 3 + (ev.x / 100) * 94;
            const cy = 3 + (ev.y / 100) * 59;
            const isSelected = selectedEventId === ev.id;
            const isHighlighted = highlightedEventIds.includes(ev.id);

            let color = '#22c55e'; // Successful pass: bright green
            let radius = 1.3;

            if (ev.type === 'pass_failed') {
              color = '#ef4444'; // Red
              radius = 1.5;
            } else if (ev.type === 'pressure') {
              color = '#f59e0b'; // Amber
              radius = 1.6;
            } else if (ev.type === 'turnover' || ev.type === 'possession_change') {
              color = '#a855f7'; // Purple
              radius = 1.4;
            } else if (ev.type === 'shot') {
              color = '#38bdf8'; // Blue
              radius = 1.8;
            }

            return (
              <g
                key={ev.id}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectEvent(ev.id)}
                onMouseEnter={() => setHoveredEvent(ev)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                {/* Highlight ring if referenced by active claim */}
                {(isHighlighted || isSelected) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 1.2}
                    fill="none"
                    stroke={isSelected ? '#ffffff' : '#fbbf24'}
                    strokeWidth="0.6"
                    className="animate-pulse"
                  />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="0.3"
                  opacity={isHighlighted || isSelected ? 1 : 0.85}
                />

                {/* Progressive vector arrow for passes */}
                {ev.progressiveDistance && ev.progressiveDistance > 10 && (
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cx + Math.min(10, ev.progressiveDistance * 0.3)}
                    y2={cy}
                    stroke={color}
                    strokeWidth="0.4"
                    strokeDasharray="0.6,0.6"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover inspection tooltip */}
        {hoveredEvent && (
          <div className="absolute top-2 right-2 bg-slate-900/95 text-white text-[11px] p-2 rounded-md shadow-lg border border-slate-700 pointer-events-none max-w-xs z-20 backdrop-blur-xs">
            <div className="flex items-center justify-between gap-3 font-semibold border-b border-slate-700 pb-1">
              <span className="text-emerald-400 font-mono">{hoveredEvent.id}</span>
              <span className="tabular-nums text-slate-300">
                {hoveredEvent.minute}&apos;:{String(hoveredEvent.second).padStart(2, '0')}
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-[10px]">
              <div>
                <span className="text-slate-400">Team:</span> {hoveredEvent.teamName}
              </div>
              <div>
                <span className="text-slate-400">Player:</span> {hoveredEvent.playerName}
              </div>
              <div className="capitalize">
                <span className="text-slate-400">Type:</span> {hoveredEvent.type.replace('_', ' ')} (
                {hoveredEvent.outcome})
              </div>
              {hoveredEvent.pressureIntensity && (
                <div>
                  <span className="text-slate-400">Pressure Intensity:</span>{' '}
                  <span className="text-amber-400 font-semibold">{hoveredEvent.pressureIntensity}</span>
                </div>
              )}
              {hoveredEvent.progressiveDistance && (
                <div>
                  <span className="text-slate-400">Progression:</span> +{hoveredEvent.progressiveDistance}m
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between pt-2.5 text-[11px] text-slate-600 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-300" />
            <span>Successful Pass</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 border border-slate-300" />
            <span>Failed Pass</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 border border-slate-300" />
            <span>Pressure Action</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500 border border-slate-300" />
            <span>Turnover</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500">
          Click any event marker to inspect evidence references
        </div>
      </div>
    </div>
  );
};

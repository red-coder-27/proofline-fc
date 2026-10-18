import React from 'react';
import {
  Activity,
  FileCheck2,
  Tv,
  FlaskConical,
  BarChart3,
  Layers,
} from 'lucide-react';

export type ActiveView = 'workspace' | 'truthline' | 'broadcast' | 'lab' | 'evaluation';

interface AppSidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  verifiedCount: number;
  supersededCount: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeView,
  onSelectView,
  verifiedCount,
  supersededCount,
}) => {
  const navItems = [
    {
      id: 'workspace' as ActiveView,
      label: 'Match Intelligence',
      description: 'Tactical state, turning points & pitch inspector',
      icon: Activity,
      badge: null,
    },
    {
      id: 'truthline' as ActiveView,
      label: 'Truthline Ledger',
      description: 'Audited claim ledger & supersession history',
      icon: FileCheck2,
      badge: `${verifiedCount} verified`,
    },
    {
      id: 'broadcast' as ActiveView,
      label: 'Broadcast Studio',
      description: 'Audience personalization: Fan vs Analyst',
      icon: Tv,
      badge: null,
    },
    {
      id: 'lab' as ActiveView,
      label: 'Scenario Lab',
      description: '6 reproducible tests & signature demo',
      icon: FlaskConical,
      badge: supersededCount > 0 ? `${supersededCount} superseded` : null,
    },
    {
      id: 'evaluation' as ActiveView,
      label: 'Evaluation Benchmark',
      description: 'Multi-Agent vs Baseline comparative rubric',
      icon: BarChart3,
      badge: 'Ground Truth',
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
      <div className="p-3">
        <div className="text-[11px] font-bold tracking-wider uppercase text-slate-600 px-3 py-2">
          Navigation Rail
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  />
                  <div className="truncate">
                    <div className="truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-500 truncate font-normal">
                      {item.description}
                    </div>
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={`shrink-0 ml-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Architecture Footnote & Contract Reminder */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-start gap-2 text-[11px] text-slate-600">
          <Layers className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">Core Engine Principle</span>
            <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
              No insight may be presented as verified unless supporting event evidence passes deterministic recalculation.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

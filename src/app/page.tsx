'use client';

import React, { useState } from 'react';
import { useMatchEngine } from '@/lib/state/useMatchEngine';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar, ActiveView } from '@/components/layout/AppSidebar';
import { MatchIntelligenceWorkspace } from '@/components/workspace/MatchIntelligenceWorkspace';
import { TruthlineLedger } from '@/components/truthline/TruthlineLedger';
import { BroadcastStudio } from '@/components/broadcast/BroadcastStudio';
import { ScenarioLab } from '@/components/lab/ScenarioLab';
import { EvaluationBenchmark } from '@/components/evaluation/EvaluationBenchmark';

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>('workspace');

  const {
    currentScenario,
    currentInterval,
    currentMinute,
    events,
    snapshots,
    turningPoints,
    activeClaims,
    agentMessages,
    isExecuting,
    signaturePhase,
    isContradictoryPhase,
    canAdvance,
    advanceInterval,
    resetSimulation,
    switchScenario,
    runSignaturePhase,
    isUsingMicrosoftFoundry,
    foundryModelName,
    foundryError,
  } = useMatchEngine();

  const verifiedClaimsCount = activeClaims.filter((c) => c.status === 'verified').length;
  const supersededClaimsCount = activeClaims.filter((c) => c.status === 'superseded').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Application Header */}
      <AppHeader
        currentMinute={currentMinute}
        currentIntervalLabel={currentInterval.label}
        isContradictoryPhase={isContradictoryPhase}
        onAdvance={advanceInterval}
        onReset={resetSimulation}
        isSimulating={isExecuting}
        canAdvance={canAdvance}
        isUsingMicrosoftFoundry={isUsingMicrosoftFoundry}
        foundryModelName={foundryModelName}
        foundryError={foundryError}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <AppSidebar
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          verifiedCount={verifiedClaimsCount}
          supersededCount={supersededClaimsCount}
        />

        {/* Primary Dynamic Content Area */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {activeView === 'workspace' && (
            <MatchIntelligenceWorkspace
              events={events}
              snapshots={snapshots}
              turningPoints={turningPoints}
              activeClaims={activeClaims}
              onNavigateToBroadcast={() => setActiveView('broadcast')}
            />
          )}

          {activeView === 'truthline' && <TruthlineLedger claims={activeClaims} />}

          {activeView === 'broadcast' && (
            <BroadcastStudio
              claims={activeClaims}
              events={events}
              snapshots={snapshots}
            />
          )}

          {activeView === 'lab' && (
            <ScenarioLab
              currentScenarioId={currentScenario.id}
              onSelectScenario={switchScenario}
              onRunSignaturePhase={runSignaturePhase}
              signaturePhase={signaturePhase}
              agentMessages={agentMessages}
              isExecuting={isExecuting}
            />
          )}

          {activeView === 'evaluation' && <EvaluationBenchmark />}
        </main>
      </div>
    </div>
  );
}

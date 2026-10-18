'use client';

import { useState, useEffect, useCallback } from 'react';
import { MatchEvent } from '@/types/events';
import { MatchIntervalSnapshot, TurningPoint } from '@/types/stats';
import { TruthlineRecord } from '@/types/claims';
import { ScenarioDefinition } from '@/types/scenarios';
import { AgentExecutionMessage } from '@/types/agents';
import { SCENARIO_CATALOG } from '@/lib/scenarios/scenarioCatalog';
import { generateSyntheticMatchEvents } from '@/lib/eventEngine/generator';
import { computeIntervalSnapshot } from '@/lib/eventEngine/statsCalculator';
import { detectTurningPoints } from '@/lib/eventEngine/turningPointDetector';
import { executeMultiAgentWorkflow } from '@/lib/agents/orchestrator';
import { deduplicateTruthlineRecords } from '@/lib/claims/claimsDeduplicator';

function getInitialEngineState(scenario: ScenarioDefinition, targetIntervalIdx: number) {
  const intervals = scenario.intervals;
  const seed = scenario.defaultSeed;
  let cumulativeEvents: MatchEvent[] = [];
  const calculatedSnapshots: MatchIntervalSnapshot[] = [];

  for (let i = 0; i <= targetIntervalIdx && i < intervals.length; i++) {
    const interval = intervals[i];
    const intervalEvents = generateSyntheticMatchEvents(
      scenario.id,
      interval.startMinute,
      interval.endMinute,
      seed
    );
    cumulativeEvents = [...cumulativeEvents, ...intervalEvents];
    const snap = computeIntervalSnapshot(intervalEvents, interval);
    calculatedSnapshots.push(snap);
  }

  const currentSnap = calculatedSnapshots[targetIntervalIdx] || calculatedSnapshots[0];
  const baselineSnap = calculatedSnapshots[Math.max(0, targetIntervalIdx - 1)];

  const detectedTps =
    targetIntervalIdx > 0
      ? detectTurningPoints(
          cumulativeEvents.filter(
            (e) =>
              e.minute >= currentSnap.interval.startMinute &&
              e.minute <= currentSnap.interval.endMinute
          ),
          baselineSnap,
          currentSnap,
          currentSnap.interval
        )
      : [];

  return {
    cumulativeEvents,
    calculatedSnapshots,
    detectedTps,
    currentSnap,
  };
}

export function useMatchEngine() {
  const [currentScenario, setCurrentScenario] = useState<ScenarioDefinition>(SCENARIO_CATALOG[0]);
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState<number>(1); // Default to interval 2 (16-30m)

  const initialState = getInitialEngineState(SCENARIO_CATALOG[0], 1);

  const [events, setEvents] = useState<MatchEvent[]>(initialState.cumulativeEvents);
  const [snapshots, setSnapshots] = useState<MatchIntervalSnapshot[]>(initialState.calculatedSnapshots);
  const [turningPoints, setTurningPoints] = useState<TurningPoint[]>(initialState.detectedTps);
  const [activeClaims, setActiveClaims] = useState<TruthlineRecord[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentExecutionMessage[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [signaturePhase, setSignaturePhase] = useState<number>(2);
  const [isUsingMicrosoftFoundry, setIsUsingMicrosoftFoundry] = useState<boolean>(false);
  const [foundryModelName, setFoundryModelName] = useState<string>('gpt-4o');
  const [foundryError, setFoundryError] = useState<string | undefined>(undefined);

  // Run simulation for an interval sequence
  const runIntervalSimulation = useCallback(
    async (
      scenario: ScenarioDefinition,
      targetIntervalIdx: number,
      existingClaims: TruthlineRecord[] = []
    ) => {
      setIsExecuting(true);
      const intervals = scenario.intervals;
      const seed = scenario.defaultSeed;

      let cumulativeEvents: MatchEvent[] = [];
      const calculatedSnapshots: MatchIntervalSnapshot[] = [];

      for (let i = 0; i <= targetIntervalIdx && i < intervals.length; i++) {
        const interval = intervals[i];
        const intervalEvents = generateSyntheticMatchEvents(
          scenario.id,
          interval.startMinute,
          interval.endMinute,
          seed
        );
        cumulativeEvents = [...cumulativeEvents, ...intervalEvents];
        const snap = computeIntervalSnapshot(intervalEvents, interval);
        calculatedSnapshots.push(snap);
      }

      setEvents(cumulativeEvents);
      setSnapshots(calculatedSnapshots);

      const currentSnap = calculatedSnapshots[targetIntervalIdx] || calculatedSnapshots[0];
      const baselineSnap = calculatedSnapshots[Math.max(0, targetIntervalIdx - 1)];

      const detectedTps =
        targetIntervalIdx > 0
          ? detectTurningPoints(
              cumulativeEvents.filter(
                (e) =>
                  e.minute >= currentSnap.interval.startMinute &&
                  e.minute <= currentSnap.interval.endMinute
              ),
              baselineSnap,
              currentSnap,
              currentSnap.interval
            )
          : [];

      setTurningPoints(detectedTps);

      const isContradiction =
        scenario.id === 'contradictory_evidence_later' && targetIntervalIdx >= 2;

      const workflowResult = await executeMultiAgentWorkflow({
        workflowId: `wf_${scenario.id}_${currentSnap.interval.startMinute}`,
        scenarioId: scenario.id,
        snapshot: currentSnap,
        turningPoints: detectedTps,
        events: cumulativeEvents,
        existingClaims,
        currentIntervalIndex: targetIntervalIdx,
        isContradictoryPhase: isContradiction,
      });

      setActiveClaims(deduplicateTruthlineRecords(workflowResult.activeClaims));
      setAgentMessages(workflowResult.messages);
      setIsUsingMicrosoftFoundry(Boolean(workflowResult.metrics.isUsingMicrosoftFoundry));
      if (workflowResult.metrics.foundryModelName) {
        setFoundryModelName(workflowResult.metrics.foundryModelName);
      }
      setFoundryError(workflowResult.metrics.foundryError);
      setIsExecuting(false);
    },
    []
  );

  // Initialize workflow asynchronously on mount / scenario change
  useEffect(() => {
    let isCancelled = false;
    const runAsync = async () => {
      const state = getInitialEngineState(currentScenario, 1);
      setEvents(state.cumulativeEvents);
      setSnapshots(state.calculatedSnapshots);
      setTurningPoints(state.detectedTps);

      const res = await executeMultiAgentWorkflow({
        workflowId: `wf_${currentScenario.id}_init`,
        scenarioId: currentScenario.id,
        snapshot: state.currentSnap,
        turningPoints: state.detectedTps,
        events: state.cumulativeEvents,
        existingClaims: [],
        currentIntervalIndex: 1,
        isContradictoryPhase: false,
      });

      if (!isCancelled) {
        setActiveClaims(deduplicateTruthlineRecords(res.activeClaims));
        setAgentMessages(res.messages);
        setIsUsingMicrosoftFoundry(Boolean(res.metrics.isUsingMicrosoftFoundry));
        if (res.metrics.foundryModelName) {
          setFoundryModelName(res.metrics.foundryModelName);
        }
        setFoundryError(res.metrics.foundryError);
      }
    };

    runAsync();
    return () => {
      isCancelled = true;
    };
  }, [currentScenario]);

  // Advance to next interval
  const advanceInterval = async () => {
    if (currentIntervalIndex < currentScenario.intervals.length - 1) {
      const nextIdx = currentIntervalIndex + 1;
      const nextInterval = currentScenario.intervals[nextIdx];
      setCurrentIntervalIndex(nextIdx);
      if (nextIdx >= 2) {
        setSignaturePhase(4);
      }
      const priorClaims = activeClaims.filter((c) => c.interval.endMinute <= nextInterval.startMinute);
      await runIntervalSimulation(currentScenario, nextIdx, priorClaims.length > 0 ? priorClaims : activeClaims);
    }
  };

  // Reset match simulation
  const resetSimulation = async () => {
    setCurrentIntervalIndex(0);
    setSignaturePhase(1);
    await runIntervalSimulation(currentScenario, 0, []);
  };

  // Select a different scenario
  const switchScenario = async (scenario: ScenarioDefinition) => {
    setCurrentScenario(scenario);
    setCurrentIntervalIndex(Math.min(1, scenario.intervals.length - 1));
    setSignaturePhase(2);
  };

  // Guided Signature Demo phase runner
  const runSignaturePhase = async (phase: 1 | 2 | 3 | 4) => {
    setSignaturePhase(phase);
    if (phase === 1) {
      setCurrentIntervalIndex(0);
      await runIntervalSimulation(SCENARIO_CATALOG[0], 0, []);
    } else if (phase === 2) {
      setCurrentIntervalIndex(1);
      await runIntervalSimulation(SCENARIO_CATALOG[0], 1, []);
    } else if (phase === 4) {
      setCurrentIntervalIndex(2);
      // Filter active claims to strictly prior intervals (ending <= 30) so interval 2
      // is not fed its own claim back as an existing claim.
      const priorClaims = activeClaims.filter((c) => c.interval.endMinute <= 30);
      await runIntervalSimulation(SCENARIO_CATALOG[0], 2, priorClaims);
    }
  };

  const currentInterval =
    currentScenario.intervals[currentIntervalIndex] || currentScenario.intervals[0];
  const currentSnapshot =
    snapshots[currentIntervalIndex] ||
    snapshots[0] ||
    computeIntervalSnapshot([], currentInterval);

  return {
    currentScenario,
    currentInterval,
    currentIntervalIndex,
    currentMinute: currentInterval.endMinute,
    events,
    snapshots,
    currentSnapshot,
    turningPoints,
    activeClaims,
    agentMessages,
    isExecuting,
    signaturePhase,
    isUsingMicrosoftFoundry,
    foundryModelName,
    foundryError,
    isContradictoryPhase:
      currentScenario.id === 'contradictory_evidence_later' && currentIntervalIndex >= 2,
    canAdvance: currentIntervalIndex < currentScenario.intervals.length - 1,
    advanceInterval,
    resetSimulation,
    switchScenario,
    runSignaturePhase,
  };
}

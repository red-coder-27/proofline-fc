/**
 * Multi-Agent System Schemas.
 * Explicit contracts and shared state for:
 * 1. Match State Analyst
 * 2. Evidence Auditor
 * 3. Broadcast Producer
 */

import { MatchEvent } from './events';
import { MatchIntervalSnapshot, TurningPoint } from './stats';
import { TruthlineRecord } from './claims';

export type AgentRole =
  | 'match_state_analyst'
  | 'evidence_auditor'
  | 'broadcast_producer';

export interface AgentExecutionMessage {
  id: string;
  sender: AgentRole | 'system';
  receiver: AgentRole | 'system' | 'broadcast';
  stepIndex: number;
  timestamp: string;
  action: string;
  summary: string;
  payload: Record<string, unknown>;
  latencyMs: number;
}

export interface SharedWorkflowState {
  workflowId: string;
  scenarioId: string;
  currentIntervalIndex: number;
  snapshot: MatchIntervalSnapshot;
  turningPoints: TurningPoint[];
  events: MatchEvent[];
  activeClaims: TruthlineRecord[];
  historyClaims: TruthlineRecord[];
  messages: AgentExecutionMessage[];
  currentRevisionCount: number;
  maxRevisionLimit: number;
  orchestrationStatus: 'idle' | 'analyzing' | 'auditing' | 'revising' | 'producing' | 'completed' | 'failed';
  errorDetails?: {
    agent: AgentRole;
    error: string;
    recoveryActionTaken: string;
  };
  metrics: {
    totalTokensUsed: number;
    totalLatencyMs: number;
    auditPassingRate: number;
    revisionsTriggered: number;
    isUsingMicrosoftFoundry: boolean;
    foundryModelName?: string;
    foundryError?: string;
  };
}

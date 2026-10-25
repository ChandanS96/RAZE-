export type RunStatus =
  | 'PENDING'
  | 'ANALYZING'
  | 'REPAIRING'
  | 'CHALLENGING'
  | 'TRUST_COLLAPSED'
  | 'RETRYING'
  | 'RUNNING_MUTATIONS'
  | 'SECURITY_CHECK'
  | 'GATE_EVALUATION'
  | 'READY_FOR_HUMAN_REVIEW'
  | 'NEEDS_REVIEW'
  | 'BLOCKED'
  | 'CIRCUIT_BREAKER_TRIPPED'
  | 'COMPLETED';

export type ReleaseRecommendation =
  | 'BLOCKED'
  | 'NEEDS_REVIEW'
  | 'READY_FOR_HUMAN_REVIEW';

export type AgentRole =
  | 'investigator'
  | 'repair_engineer'
  | 'counterexample_hunter'
  | 'security_guardian'
  | 'test_integrity_engineer'
  | 'evidence_judge';

export type AgentStatus = 'waiting' | 'running' | 'completed' | 'failed' | 'blocked';

export interface AgentExecutionState {
  role: AgentRole;
  name: string;
  status: AgentStatus;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  findingsCount?: number;
  outputArtifacts?: Record<string, any>;
  logs: string[];
}

export interface PatchAttempt {
  attemptNumber: number;
  runId: string;
  patchHash: string;
  diff: string;
  filesChanged: string[];
  explanation: string;
  expectedBehavior: string;
  knownRisks: string[];
  testedInShadowWorkspace: boolean;
  shadowWorkspacePath?: string;
  testPassedCount: number;
  testFailedCount: number;
  counterexamplesCount: number;
  status: 'PENDING' | 'CHALLENGING' | 'REJECTED_TRUST_COLLAPSED' | 'VERIFIED';
  createdAt: string;
}

export interface CounterexampleFinding {
  id: string;
  runId: string;
  attemptNumber: number;
  testName: string;
  inputVector: string;
  expectedOutput: string;
  actualOutput: string;
  reproductionCommand: string;
  failureEvidence: string;
  sourceLocation?: string;
  confirmed: boolean;
  timestamp: string;
}

export interface SecurityFinding {
  id: string;
  runId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  title: string;
  affectedFile: string;
  lineRange: string;
  detectionMethod: 'AST_SCANNER' | 'CIRCUIT_BREAKER' | 'PATTERN_RULES' | 'SANDBOX_WATCHER';
  evidence: string;
  recommendedMitigation: string;
  isConfirmed: boolean;
  blocksRelease: boolean;
  timestamp: string;
}

export interface MutantResult {
  id: string;
  runId: string;
  file: string;
  line: number;
  originalOp: string;
  mutatedOp: string;
  mutantCodeSnippet: string;
  status: 'KILLED' | 'SURVIVED' | 'TIMED_OUT';
  killingTest?: string;
  suggestedStrongerTest?: string;
}

export interface MutationAnalysisReport {
  totalMutants: number;
  mutantsKilled: number;
  mutantsSurvived: number;
  mutantsTimedOut: number;
  mutationScore: number; // percentage
  mutants: MutantResult[];
  survivingAnalysis: string;
}

export interface PolicyRuleEvaluation {
  ruleId: string;
  name: string;
  description: string;
  category: 'TESTS' | 'SECURITY' | 'INTEGRITY' | 'IDENTITY';
  passed: boolean;
  blocking: boolean;
  evidenceSummary: string;
}

export interface DeterministicPolicyResult {
  recommendation: ReleaseRecommendation;
  evaluatedAt: string;
  rulesEvaluated: PolicyRuleEvaluation[];
  blockingReasons: string[];
  warnings: string[];
  knownLimitations: string[];
  patchHashVerified: boolean;
  requiresHumanReview: boolean;
}

export interface VerificationMemoryRecord {
  id: string;
  repositoryId: string;
  defectPattern: string;
  bugDescription: string;
  rootCause: string;
  failedPatchSummary?: string;
  counterexampleInput?: string;
  effectiveRegressionTest?: string;
  mutationFinding?: string;
  securityFinding?: string;
  resolutionPatchHash?: string;
  outcome: string;
  createdAt: string;
}

export interface HumanDecision {
  runId: string;
  decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES';
  reviewedPatchHash: string;
  reviewerNotes: string;
  decidedAt: string;
  reviewer: string;
}

export interface VerificationRun {
  id: string;
  repositoryId: string;
  repositoryName: string;
  branch: string;
  baseCommit: string;
  bugReport: {
    title: string;
    description: string;
    targetFile: string;
    reportedBehavior: string;
    expectedBehavior: string;
    reproduceCommand: string;
  };
  status: RunStatus;
  currentAttempt: number;
  maxRetries: number;
  currentPatchHash?: string;
  recommendation?: ReleaseRecommendation;
  trustCollapsed: boolean;
  trustCollapseReason?: string;
  circuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
  agents: Record<AgentRole, AgentExecutionState>;
  attempts: PatchAttempt[];
  counterexamples: CounterexampleFinding[];
  securityFindings: SecurityFinding[];
  mutationReport?: MutationAnalysisReport;
  policyResult?: DeterministicPolicyResult;
  humanDecision?: HumanDecision;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RepositoryMetadata {
  id: string;
  name: string;
  description: string;
  path: string;
  isBundledDemo: boolean;
  defaultBranch: string;
  testCommand: string;
  filesCount: number;
  lastRunStatus?: RunStatus;
}

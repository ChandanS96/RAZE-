export interface Repository {
  id: string;
  name: string;
  description: string;
  path: string;
  isBundledDemo: boolean;
  defaultBranch: string;
  testCommand: string;
  filesCount: number;
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
  status: string;
  currentAttempt: number;
  maxRetries: number;
  currentPatchHash?: string;
  recommendation?: 'BLOCKED' | 'NEEDS_REVIEW' | 'READY_FOR_HUMAN_REVIEW';
  trustCollapsed: boolean;
  trustCollapseReason?: string;
  circuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
  agents: Record<string, {
    role: string;
    name: string;
    status: 'waiting' | 'running' | 'completed' | 'failed' | 'blocked';
    summary?: string;
    findingsCount?: number;
    logs: string[];
    outputArtifacts?: Record<string, any>;
  }>;
  attempts: Array<{
    attemptNumber: number;
    patchHash: string;
    diff: string;
    filesChanged: string[];
    explanation: string;
    expectedBehavior: string;
    knownRisks: string[];
    testPassedCount: number;
    testFailedCount: number;
    counterexamplesCount: number;
    status: string;
    createdAt: string;
  }>;
  counterexamples: Array<{
    id: string;
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
  }>;
  securityFindings: Array<{
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
    title: string;
    affectedFile: string;
    lineRange: string;
    detectionMethod: string;
    evidence: string;
    recommendedMitigation: string;
    isConfirmed: boolean;
    blocksRelease: boolean;
    timestamp: string;
  }>;
  mutationReport?: {
    totalMutants: number;
    mutantsKilled: number;
    mutantsSurvived: number;
    mutantsTimedOut: number;
    mutationScore: number;
    mutants: Array<{
      id: string;
      file: string;
      line: number;
      originalOp: string;
      mutatedOp: string;
      mutantCodeSnippet: string;
      status: 'KILLED' | 'SURVIVED' | 'TIMED_OUT';
      killingTest?: string;
      suggestedStrongerTest?: string;
    }>;
    survivingAnalysis: string;
  };
  policyResult?: {
    recommendation: 'BLOCKED' | 'NEEDS_REVIEW' | 'READY_FOR_HUMAN_REVIEW';
    evaluatedAt: string;
    rulesEvaluated: Array<{
      ruleId: string;
      name: string;
      description: string;
      category: string;
      passed: boolean;
      blocking: boolean;
      evidenceSummary: string;
    }>;
    blockingReasons: string[];
    warnings: string[];
    knownLimitations: string[];
    patchHashVerified: boolean;
  };
  humanDecision?: {
    decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES';
    reviewedPatchHash: string;
    reviewerNotes: string;
    decidedAt: string;
    reviewer: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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

export async function fetchRepositories(): Promise<Repository[]> {
  const res = await fetch('/api/repositories');
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
}

export async function fetchRepositoryFiles(repoId: string): Promise<Array<{ path: string; name: string; isDir: boolean; size: number }>> {
  const res = await fetch(`/api/repositories/${repoId}/files`);
  if (!res.ok) throw new Error('Failed to fetch repository files');
  return res.json();
}

export async function fetchFileContent(repoId: string, filePath: string): Promise<{ content: string; hash: string }> {
  const res = await fetch(`/api/repositories/${repoId}/file?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error('Failed to fetch file content');
  return res.json();
}

export async function createVerificationRun(payload: {
  repositoryId: string;
  targetFile?: string;
  bugTitle?: string;
  bugDescription?: string;
  maxRetries?: number;
  triggerTrustCollapseDemo?: boolean;
}): Promise<VerificationRun> {
  const res = await fetch('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create verification run');
  }
  return res.json();
}

export async function fetchRuns(): Promise<Array<{
  id: string;
  repositoryName: string;
  status: string;
  recommendation?: string;
  trustCollapsed: boolean;
  currentAttempt: number;
  createdAt: string;
}>> {
  const res = await fetch('/api/runs');
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function fetchRun(id: string): Promise<VerificationRun> {
  const res = await fetch(`/api/runs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch run');
  return res.json();
}

export async function retryRun(id: string): Promise<void> {
  const res = await fetch(`/api/runs/${id}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry verification run');
}

export async function recordDecision(runId: string, payload: {
  decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES';
  reviewedPatchHash: string;
  reviewer: string;
  notes: string;
}): Promise<void> {
  const res = await fetch(`/api/runs/${runId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to record decision');
  }
}

export async function fetchMemory(repoId?: string): Promise<VerificationMemoryRecord[]> {
  const url = repoId ? `/api/memory?repoId=${encodeURIComponent(repoId)}` : '/api/memory';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch verification memory');
  return res.json();
}

export async function searchMemory(query: string, repoId?: string): Promise<VerificationMemoryRecord[]> {
  const res = await fetch(`/api/memory/search?q=${encodeURIComponent(query)}&repoId=${encodeURIComponent(repoId || '')}`);
  if (!res.ok) throw new Error('Failed to search memory');
  return res.json();
}

export async function deleteMemory(id: string): Promise<void> {
  const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete memory record');
}

export async function askAssistant(
  runId: string | undefined,
  question: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
  runContext?: any
): Promise<{
  answer: string;
  citedEvidence: Array<{ type: string; reference: string; detail: string }>;
  operatingMode: string;
  confidence: number;
  model?: string;
}> {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, question, history, runContext })
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Assistant query failed (${res.status})`);
  }
  return res.json();
}

export async function fetchSettingsStatus(): Promise<{
  operatingMode: string;
  hasApiKey: boolean;
  activeProvider: string;
  sandboxMode: string;
  circuitBreakerEnabled: boolean;
  supportedRunners: string[];
  maxRepairRetries: number;
}> {
  const res = await fetch('/api/settings/status');
  if (!res.ok) throw new Error('Failed to fetch settings status');
  return res.json();
}

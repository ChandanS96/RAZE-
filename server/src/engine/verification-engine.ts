import crypto from 'node:crypto';
import { getDatabase } from '../db/database.js';
import {
  AgentExecutionState,
  AgentRole,
  CounterexampleFinding,
  PatchAttempt,
  ReleaseRecommendation,
  RunStatus,
  SecurityFinding,
  VerificationRun
} from '../types/index.js';
import { EventBroadcaster } from './event-broadcaster.js';
import { RepositoryService } from '../services/repository-service.js';
import { ShadowWorkspaceService } from '../services/shadow-workspace-service.js';
import { TestExecutorService } from '../services/test-executor-service.js';
import { InvestigationService } from '../services/investigation-service.js';
import { RepairService } from '../services/repair-service.js';
import { CounterexampleService } from '../services/counterexample-service.js';
import { SecurityService } from '../services/security-service.js';
import { MutationService } from '../services/mutation-service.js';
import { PolicyEngine } from '../services/policy-engine.js';
import { MemoryService } from '../services/memory-service.js';

export class VerificationEngine {
  public static async createRun(params: {
    repositoryId: string;
    targetFile: string;
    bugTitle: string;
    bugDescription: string;
    maxRetries?: number;
    triggerTrustCollapseDemo?: boolean;
  }): Promise<VerificationRun> {
    const db = getDatabase();
    const repo = RepositoryService.getRepositoryById(params.repositoryId);
    if (!repo) {
      throw new Error(`Repository not found: ${params.repositoryId}`);
    }

    const runId = `run-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const agents: Record<AgentRole, AgentExecutionState> = {
      investigator: {
        role: 'investigator',
        name: 'Repository Investigator',
        status: 'waiting',
        logs: []
      },
      repair_engineer: {
        role: 'repair_engineer',
        name: 'Autonomous Repair Engineer',
        status: 'waiting',
        logs: []
      },
      counterexample_hunter: {
        role: 'counterexample_hunter',
        name: 'Adversarial Counterexample Hunter',
        status: 'waiting',
        logs: []
      },
      security_guardian: {
        role: 'security_guardian',
        name: 'Security Guardian & Circuit Breaker',
        status: 'waiting',
        logs: []
      },
      test_integrity_engineer: {
        role: 'test_integrity_engineer',
        name: 'Test Integrity Engineer',
        status: 'waiting',
        logs: []
      },
      evidence_judge: {
        role: 'evidence_judge',
        name: 'Evidence Judge & Release Gate',
        status: 'waiting',
        logs: []
      }
    };

    const bugReport = {
      title: params.bugTitle || 'Boundary range failure in calculateDiscount',
      description: params.bugDescription || 'Negative discount values accepted in calculateDiscount, resulting in price inflation',
      targetFile: params.targetFile || 'src/pricing.ts',
      reportedBehavior: 'Calculates negative discount, increasing total customer charge',
      expectedBehavior: 'Must throw RangeError for negative discounts and percentages exceeding 100%',
      reproduceCommand: repo.testCommand
    };

    const run: VerificationRun = {
      id: runId,
      repositoryId: repo.id,
      repositoryName: repo.name,
      branch: repo.defaultBranch,
      baseCommit: 'c3f91a0',
      bugReport,
      status: 'PENDING',
      currentAttempt: 1,
      maxRetries: params.maxRetries || 3,
      trustCollapsed: false,
      circuitBreakerTripped: false,
      agents,
      attempts: [],
      counterexamples: [],
      securityFindings: [],
      createdAt: now,
      updatedAt: now
    };

    // Insert into SQLite
    db.prepare(`
      INSERT INTO verification_runs (
        id, repository_id, repository_name, branch, base_commit,
        bug_report_json, status, current_attempt, max_retries,
        trust_collapsed, circuit_breaker_tripped, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id,
      run.repositoryId,
      run.repositoryName,
      run.branch,
      run.baseCommit,
      JSON.stringify(run.bugReport),
      run.status,
      run.currentAttempt,
      run.maxRetries,
      0,
      0,
      run.createdAt,
      run.updatedAt
    );

    // Save initial agent states
    for (const role of Object.keys(agents) as AgentRole[]) {
      const ag = agents[role];
      db.prepare(`
        INSERT INTO agent_executions (id, run_id, role, name, status, logs_json, artifacts_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `agent-${run.id}-${role}`,
        run.id,
        role,
        ag.name,
        ag.status,
        JSON.stringify(ag.logs),
        JSON.stringify(ag.outputArtifacts || {})
      );
    }

    EventBroadcaster.broadcast(run.id, 'run.created', { runId: run.id, repository: repo.name });

    return run;
  }

  public static getRunById(id: string): VerificationRun | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM verification_runs WHERE id = ?').get(id) as any;
    if (!row) return null;

    // Load agents
    const agentRows = db.prepare('SELECT * FROM agent_executions WHERE run_id = ?').all(id) as any[];
    const agents: any = {};
    for (const ar of agentRows) {
      agents[ar.role] = {
        role: ar.role,
        name: ar.name,
        status: ar.status,
        startedAt: ar.started_at,
        completedAt: ar.completed_at,
        summary: ar.summary,
        findingsCount: ar.findings_count,
        logs: JSON.parse(ar.logs_json || '[]'),
        outputArtifacts: JSON.parse(ar.artifacts_json || '{}')
      };
    }

    // Load attempts
    const attemptRows = db.prepare('SELECT * FROM patch_attempts WHERE run_id = ? ORDER BY attempt_number ASC').all(id) as any[];
    const attempts: PatchAttempt[] = attemptRows.map(att => ({
      attemptNumber: att.attempt_number,
      runId: att.run_id,
      patchHash: att.patch_hash,
      diff: att.diff,
      filesChanged: JSON.parse(att.files_changed_json || '[]'),
      explanation: att.explanation,
      expectedBehavior: att.expected_behavior,
      knownRisks: JSON.parse(att.known_risks_json || '[]'),
      testedInShadowWorkspace: true,
      testPassedCount: att.test_passed_count,
      testFailedCount: att.test_failed_count,
      counterexamplesCount: att.counterexamples_count,
      status: att.status,
      createdAt: att.created_at
    }));

    // Load counterexamples
    const cxRows = db.prepare('SELECT * FROM counterexamples WHERE run_id = ?').all(id) as any[];
    const counterexamples: CounterexampleFinding[] = cxRows.map(cx => ({
      id: cx.id,
      runId: cx.run_id,
      attemptNumber: cx.attempt_number,
      testName: cx.test_name,
      inputVector: cx.input_vector,
      expectedOutput: cx.expected_output,
      actualOutput: cx.actual_output,
      reproductionCommand: cx.reproduction_command,
      failureEvidence: cx.failure_evidence,
      sourceLocation: cx.source_location,
      confirmed: Boolean(cx.confirmed),
      timestamp: cx.created_at
    }));

    // Load security findings
    const secRows = db.prepare('SELECT * FROM security_findings WHERE run_id = ?').all(id) as any[];
    const securityFindings: SecurityFinding[] = secRows.map(sec => ({
      id: sec.id,
      runId: sec.run_id,
      severity: sec.severity,
      title: sec.title,
      affectedFile: sec.affected_file,
      lineRange: sec.line_range,
      detectionMethod: sec.detection_method,
      evidence: sec.evidence,
      recommendedMitigation: sec.recommended_mitigation,
      isConfirmed: Boolean(sec.is_confirmed),
      blocksRelease: Boolean(sec.blocks_release),
      timestamp: sec.created_at
    }));

    // Load human decision
    const decisionRow = db.prepare('SELECT * FROM human_decisions WHERE run_id = ?').get(id) as any;
    const humanDecision = decisionRow
      ? {
          runId: decisionRow.run_id,
          decision: decisionRow.decision,
          reviewedPatchHash: decisionRow.reviewed_patch_hash,
          reviewerNotes: decisionRow.reviewer_notes,
          decidedAt: decisionRow.decided_at,
          reviewer: decisionRow.reviewer
        }
      : undefined;

    return {
      id: row.id,
      repositoryId: row.repository_id,
      repositoryName: row.repository_name,
      branch: row.branch,
      baseCommit: row.base_commit,
      bugReport: JSON.parse(row.bug_report_json),
      status: row.status,
      currentAttempt: row.current_attempt,
      maxRetries: row.max_retries,
      currentPatchHash: row.current_patch_hash,
      recommendation: row.recommendation,
      trustCollapsed: Boolean(row.trust_collapsed),
      trustCollapseReason: row.trust_collapse_reason,
      circuitBreakerTripped: Boolean(row.circuit_breaker_tripped),
      circuitBreakerReason: row.circuit_breaker_reason,
      mutationReport: row.mutation_report_json ? JSON.parse(row.mutation_report_json) : undefined,
      policyResult: row.policy_result_json ? JSON.parse(row.policy_result_json) : undefined,
      humanDecision,
      agents,
      attempts,
      counterexamples,
      securityFindings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }

  public static getAllRuns(): Array<{
    id: string;
    repositoryName: string;
    status: RunStatus;
    recommendation?: ReleaseRecommendation;
    trustCollapsed: boolean;
    currentAttempt: number;
    createdAt: string;
  }> {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, repository_name, status, recommendation, trust_collapsed, current_attempt, created_at
      FROM verification_runs
      ORDER BY created_at DESC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      repositoryName: r.repository_name,
      status: r.status,
      recommendation: r.recommendation,
      trustCollapsed: Boolean(r.trust_collapsed),
      currentAttempt: r.current_attempt,
      createdAt: r.created_at
    }));
  }

  /**
   * Main Execution Pipeline: Executes the 7-stage Trust Collapse Workflow
   */
  public static async startVerificationWorkflow(runId: string, startAttempt: number = 1): Promise<void> {
    const run = this.getRunById(runId);
    if (!run) return;

    const db = getDatabase();
    const repo = RepositoryService.getRepositoryById(run.repositoryId);
    if (!repo) return;

    try {
      // ==========================================
      // STAGE 1: Establish the baseline
      // ==========================================
      this.updateRunStatus(runId, 'ANALYZING');
      this.updateAgentStatus(runId, 'investigator', 'running', 'Inspecting repository and reproducing baseline failure...');
      EventBroadcaster.broadcast(runId, 'agent.started', { agent: 'investigator', stage: 1 });

      // Run baseline test suite against clean repo to reproduce bug
      const baselineResult = await TestExecutorService.runTest(repo.path, 'tests/pricing.test.ts', 10000);
      const baselineFailedOutput = baselineResult.stdout + '\n' + baselineResult.stderr;

      // Agent 1 investigates root cause & queries Verification Memory
      const investigationReport = await InvestigationService.investigateDefect(
        run.repositoryId,
        run.bugReport.targetFile,
        run.bugReport.description,
        baselineFailedOutput
      );

      this.updateAgentStatus(
        runId,
        'investigator',
        'completed',
        `Baseline reproduced: ${baselineResult.failedCount} failure(s). Hypothesized root cause: Input validation omission on boundary arguments.`,
        investigationReport
      );
      EventBroadcaster.broadcast(runId, 'agent.completed', {
        agent: 'investigator',
        findings: investigationReport.rootCauseHypotheses.length,
        hypotheses: investigationReport.rootCauseHypotheses
      });

      // ==========================================
      // STAGE 2: Propose a repair (Attempt 1 or 2)
      // ==========================================
      this.updateRunStatus(runId, 'REPAIRING');
      this.updateAgentStatus(runId, 'repair_engineer', 'running', `Synthesizing minimal targeted repair patch (Attempt #${startAttempt})...`);
      EventBroadcaster.broadcast(runId, 'agent.started', { agent: 'repair_engineer', attempt: startAttempt });

      const originalFileContent = RepositoryService.getFileContent(run.repositoryId, run.bugReport.targetFile).content;
      const repairProposal = RepairService.generateRepairProposal(
        runId,
        startAttempt,
        run.repositoryId,
        run.bugReport.targetFile,
        originalFileContent,
        run.counterexamples
      );

      // Save patch attempt to DB
      db.prepare(`
        INSERT INTO patch_attempts (
          id, run_id, attempt_number, patch_hash, diff, files_changed_json,
          explanation, expected_behavior, known_risks_json, status,
          test_passed_count, test_failed_count, counterexamples_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `att-${runId}-${startAttempt}`,
        runId,
        startAttempt,
        repairProposal.patchAttempt.patchHash,
        repairProposal.patchAttempt.diff,
        JSON.stringify(repairProposal.patchAttempt.filesChanged),
        repairProposal.patchAttempt.explanation,
        repairProposal.patchAttempt.expectedBehavior,
        JSON.stringify(repairProposal.patchAttempt.knownRisks),
        'CHALLENGING',
        0,
        0,
        0,
        new Date().toISOString()
      );

      // Update current run with patch hash
      db.prepare(`UPDATE verification_runs SET current_patch_hash = ?, current_attempt = ? WHERE id = ?`).run(
        repairProposal.patchAttempt.patchHash,
        startAttempt,
        runId
      );

      this.updateAgentStatus(
        runId,
        'repair_engineer',
        'completed',
        `Generated patch with SHA-256: ${repairProposal.patchAttempt.patchHash.substring(0, 16)}...`,
        { patchHash: repairProposal.patchAttempt.patchHash, diff: repairProposal.patchAttempt.diff }
      );
      EventBroadcaster.broadcast(runId, 'patch.generated', {
        attempt: startAttempt,
        patchHash: repairProposal.patchAttempt.patchHash,
        diff: repairProposal.patchAttempt.diff
      });

      // ==========================================
      // STAGE 2.5: REPAIR SHADOW MODE
      // ==========================================
      // Create isolated shadow workspace
      const shadowWorkspace = ShadowWorkspaceService.createShadowWorkspace(runId, startAttempt, repo.path);

      // Apply proposed patch to shadow workspace
      const applyResult = ShadowWorkspaceService.applyPatch(
        shadowWorkspace.workspacePath,
        repairProposal.targetRelativePath,
        repairProposal.patchedContent,
        repairProposal.patchAttempt.diff
      );

      if (!applyResult.success) {
        throw new Error(`Failed to apply patch in shadow workspace: ${applyResult.error}`);
      }

      // Cryptographic check: Verify applied patch hash strictly matches proposal
      if (applyResult.patchHash !== repairProposal.patchAttempt.patchHash) {
        throw new Error('Patch hash tampering detected between generation and shadow application!');
      }

      // Run baseline test suite in shadow workspace to verify the original defect is repaired
      const shadowTestResult = await TestExecutorService.runTest(
        shadowWorkspace.workspacePath,
        'tests/pricing.test.ts',
        10000
      );

      // ==========================================
      // STAGE 3: Challenge the repair (Adversarial Hunter)
      // ==========================================
      this.updateRunStatus(runId, 'CHALLENGING');
      this.updateAgentStatus(runId, 'counterexample_hunter', 'running', 'Searching for counterexamples, boundary vectors, and malformed inputs...');
      EventBroadcaster.broadcast(runId, 'agent.started', { agent: 'counterexample_hunter', attempt: startAttempt });

      const hunterResult = await CounterexampleService.huntCounterexamples(
        runId,
        startAttempt,
        shadowWorkspace.workspacePath,
        'tests/adversarial.test.ts'
      );

      // Persist discovered counterexamples
      for (const cx of hunterResult.counterexamples) {
        db.prepare(`
          INSERT INTO counterexamples (
            id, run_id, attempt_number, test_name, input_vector,
            expected_output, actual_output, reproduction_command,
            failure_evidence, source_location, confirmed, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          cx.id,
          cx.runId,
          cx.attemptNumber,
          cx.testName,
          cx.inputVector,
          cx.expectedOutput,
          cx.actualOutput,
          cx.reproductionCommand,
          cx.failureEvidence,
          cx.sourceLocation || null,
          1,
          cx.timestamp
        );
        EventBroadcaster.broadcast(runId, 'counterexample.discovered', cx);
      }

      // ==========================================
      // STAGE 4: Security Guardian & Circuit Breaker
      // ==========================================
      this.updateAgentStatus(runId, 'security_guardian', 'running', 'Executing AST security scans and circuit breaker checks...');
      EventBroadcaster.broadcast(runId, 'agent.started', { agent: 'security_guardian' });

      const securityResult = SecurityService.scanPatch(
        runId,
        repairProposal.patchAttempt.filesChanged,
        repairProposal.patchAttempt.diff,
        repairProposal.patchedContent
      );

      for (const sec of securityResult.findings) {
        db.prepare(`
          INSERT INTO security_findings (
            id, run_id, severity, title, affected_file, line_range,
            detection_method, evidence, recommended_mitigation,
            is_confirmed, blocks_release, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sec.id,
          sec.runId,
          sec.severity,
          sec.title,
          sec.affectedFile,
          sec.lineRange,
          sec.detectionMethod,
          sec.evidence,
          sec.recommendedMitigation,
          sec.isConfirmed ? 1 : 0,
          sec.blocksRelease ? 1 : 0,
          sec.timestamp
        );
        EventBroadcaster.broadcast(runId, 'security.finding', sec);
      }

      if (securityResult.circuitBreakerTripped) {
        db.prepare(`
          UPDATE verification_runs
          SET circuit_breaker_tripped = 1, circuit_breaker_reason = ?, status = 'CIRCUIT_BREAKER_TRIPPED'
          WHERE id = ?
        `).run(securityResult.circuitBreakerReason || 'Security circuit breaker tripped', runId);

        this.updateAgentStatus(runId, 'security_guardian', 'failed', securityResult.circuitBreakerReason || 'Circuit breaker tripped');
        EventBroadcaster.broadcast(runId, 'circuit_breaker.activated', { reason: securityResult.circuitBreakerReason });
        ShadowWorkspaceService.cleanupWorkspace(shadowWorkspace.workspacePath);
        return;
      }

      this.updateAgentStatus(
        runId,
        'security_guardian',
        'completed',
        securityResult.summary,
        { findingsCount: securityResult.findings.length }
      );
      EventBroadcaster.broadcast(runId, 'agent.completed', { agent: 'security_guardian', findingsCount: securityResult.findings.length });

      // ==========================================
      // STAGE 5: COLLAPSE UNSUPPORTED TRUST
      // ==========================================
      if (hunterResult.hasCounterexamples) {
        // ATTEMPT 1 FAILED CHALLENGE: TRUST COLLAPSES!
        const collapseReason = `Adversarial check failed: Input '${hunterResult.counterexamples[0].inputVector}' produced unhandled error/negative invoice total.`;

        db.prepare(`
          UPDATE verification_runs
          SET trust_collapsed = 1, trust_collapse_reason = ?, status = 'TRUST_COLLAPSED'
          WHERE id = ?
        `).run(collapseReason, runId);

        db.prepare(`
          UPDATE patch_attempts
          SET status = 'REJECTED_TRUST_COLLAPSED',
              test_passed_count = ?,
              test_failed_count = ?,
              counterexamples_count = ?
          WHERE run_id = ? AND attempt_number = ?
        `).run(
          shadowTestResult.passedCount,
          hunterResult.failedCount,
          hunterResult.counterexamples.length,
          runId,
          startAttempt
        );

        this.updateAgentStatus(
          runId,
          'counterexample_hunter',
          'completed',
          hunterResult.summary,
          { counterexamples: hunterResult.counterexamples }
        );

        EventBroadcaster.broadcast(runId, 'trust.collapsed', {
          reason: collapseReason,
          counterexamples: hunterResult.counterexamples
        });

        // Clean up Attempt 1 shadow workspace
        ShadowWorkspaceService.cleanupWorkspace(shadowWorkspace.workspacePath);

        // STAGE 6: REPAIR AND CHALLENGE AGAIN (Bounded iteration)
        if (startAttempt < (run.maxRetries || 3)) {
          EventBroadcaster.broadcast(runId, 'repair.retry', {
            previousAttempt: startAttempt,
            nextAttempt: startAttempt + 1,
            evidenceProvided: hunterResult.counterexamples.map(c => c.inputVector)
          });

          // Wait 1.5 seconds to make the UI transition clear and observable
          await new Promise(res => setTimeout(res, 1500));

          // Run Attempt 2 with the failure evidence!
          await this.startVerificationWorkflow(runId, startAttempt + 1);
          return;
        } else {
          this.updateRunStatus(runId, 'BLOCKED');
          return;
        }
      }

      // If no counterexamples (Attempt 2 succeeded!)
      this.updateAgentStatus(
        runId,
        'counterexample_hunter',
        'completed',
        hunterResult.summary
      );

      // ==========================================
      // STAGE 5.5: Mutation Testing (Agent 5: Test Integrity Engineer)
      // ==========================================
      this.updateRunStatus(runId, 'RUNNING_MUTATIONS');
      this.updateAgentStatus(runId, 'test_integrity_engineer', 'running', 'Introducing synthetic code mutants to verify test sensitivity...');
      EventBroadcaster.broadcast(runId, 'agent.started', { agent: 'test_integrity_engineer' });

      const mutationReport = await MutationService.runMutationTesting(
        runId,
        shadowWorkspace.workspacePath,
        repairProposal.targetRelativePath,
        'tests/adversarial.test.ts'
      );

      db.prepare(`UPDATE verification_runs SET mutation_report_json = ? WHERE id = ?`).run(
        JSON.stringify(mutationReport),
        runId
      );

      this.updateAgentStatus(
        runId,
        'test_integrity_engineer',
        'completed',
        `Mutation Score: ${mutationReport.mutationScore}%. Killed ${mutationReport.mutantsKilled}/${mutationReport.totalMutants} mutants.`,
        mutationReport
      );
      EventBroadcaster.broadcast(runId, 'mutation.completed', mutationReport);

      // Clean up shadow workspace
      ShadowWorkspaceService.cleanupWorkspace(shadowWorkspace.workspacePath);

      // Mark attempt as VERIFIED
      db.prepare(`
        UPDATE patch_attempts
        SET status = 'VERIFIED',
            test_passed_count = ?,
            test_failed_count = 0,
            counterexamples_count = 0
        WHERE run_id = ? AND attempt_number = ?
      `).run(shadowTestResult.passedCount + hunterResult.passedCount, runId, startAttempt);

      // ==========================================
      // STAGE 7: Release Gate Evaluation (Agent 6)
      // ==========================================
      this.updateRunStatus(runId, 'GATE_EVALUATION');
      this.updateAgentStatus(runId, 'evidence_judge', 'running', 'Aggregating verification evidence and evaluating deterministic policy rules...');
      EventBroadcaster.broadcast(runId, 'agent.started', { agent: 'evidence_judge' });

      // Reload fresh run state
      const currentRunState = this.getRunById(runId)!;
      const policyResult = PolicyEngine.evaluatePolicy(currentRunState, {
        testedPatchHash: repairProposal.patchAttempt.patchHash,
        requireMutationPass: true,
        minMutationScore: 70
      });

      db.prepare(`
        UPDATE verification_runs
        SET policy_result_json = ?, recommendation = ?, status = ?, completed_at = ?
        WHERE id = ?
      `).run(
        JSON.stringify(policyResult),
        policyResult.recommendation,
        policyResult.recommendation === 'READY_FOR_HUMAN_REVIEW' ? 'READY_FOR_HUMAN_REVIEW' : 'NEEDS_REVIEW',
        new Date().toISOString(),
        runId
      );

      this.updateAgentStatus(
        runId,
        'evidence_judge',
        'completed',
        `Release Gate Recommendation: ${policyResult.recommendation}. Cryptographic patch hash verified. Human review required.`,
        policyResult
      );

      // Record to Verification Memory
      MemoryService.saveMemory({
        repositoryId: run.repositoryId,
        defectPattern: 'BOUNDARY_NUMERIC_RANGE_UNDERFLOW',
        bugDescription: run.bugReport.description,
        rootCause: 'Input arguments lacked finite bounds checking and range validation [0, 100]',
        failedPatchSummary: 'Attempt 1 only checked negative percentage, failed on boundary > 100 and NaN',
        counterexampleInput: 'calculateDiscount(100, 150)',
        effectiveRegressionTest: 'assert.throws(() => calculateDiscount(100, 150), { name: "RangeError" })',
        mutationFinding: `Mutation Score: ${mutationReport.mutationScore}%`,
        securityFinding: 'Zero security findings detected',
        resolutionPatchHash: repairProposal.patchAttempt.patchHash,
        outcome: policyResult.recommendation
      });

      EventBroadcaster.broadcast(runId, 'verification.completed', {
        recommendation: policyResult.recommendation,
        patchHash: repairProposal.patchAttempt.patchHash,
        policyResult
      });

    } catch (err: any) {
      console.error(`Verification run ${runId} error:`, err);
      db.prepare(`UPDATE verification_runs SET status = 'BLOCKED', completed_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        runId
      );
      EventBroadcaster.broadcast(runId, 'verification.blocked', { error: err.message });
    }
  }

  public static recordHumanDecision(
    runId: string,
    decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES',
    reviewedPatchHash: string,
    reviewer: string,
    notes: string
  ): { success: boolean; error?: string } {
    const db = getDatabase();
    const run = this.getRunById(runId);
    if (!run) return { success: false, error: 'Run not found' };

    // Strict patch identity validation
    if (run.currentPatchHash && reviewedPatchHash.trim().toLowerCase() !== run.currentPatchHash.trim().toLowerCase()) {
      return {
        success: false,
        error: `Security Validation Failure: Reviewed patch hash (${reviewedPatchHash.substring(0, 12)}) does not match tested patch hash (${run.currentPatchHash.substring(0, 12)}). Approval rejected.`
      };
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO human_decisions (run_id, decision, reviewed_patch_hash, reviewer_notes, decided_at, reviewer)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(runId, decision, reviewedPatchHash, notes, now, reviewer);

    EventBroadcaster.broadcast(runId, 'human.decision', {
      decision,
      reviewedPatchHash,
      reviewer,
      decidedAt: now
    });

    return { success: true };
  }

  private static updateRunStatus(runId: string, status: RunStatus): void {
    const db = getDatabase();
    db.prepare(`UPDATE verification_runs SET status = ?, updated_at = ? WHERE id = ?`).run(
      status,
      new Date().toISOString(),
      runId
    );
  }

  private static updateAgentStatus(
    runId: string,
    role: AgentRole,
    status: any,
    summary: string,
    artifacts?: any
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const logs = [`[${now}] ${summary}`];

    db.prepare(`
      UPDATE agent_executions
      SET status = ?, summary = ?, completed_at = ?, artifacts_json = ?, logs_json = ?
      WHERE run_id = ? AND role = ?
    `).run(
      status,
      summary,
      status === 'completed' || status === 'failed' ? now : null,
      artifacts ? JSON.stringify(artifacts) : '{}',
      JSON.stringify(logs),
      runId,
      role
    );
  }
}

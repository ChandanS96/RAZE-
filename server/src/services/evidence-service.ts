import { VerificationRun } from '../types/index.js';

export class EvidenceService {
  public static generateJsonReport(run: VerificationRun): string {
    const reportData = {
      meta: {
        generator: 'RAZE Evidence Service',
        specVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        runId: run.id
      },
      repository: {
        id: run.repositoryId,
        name: run.repositoryName,
        branch: run.branch,
        baseCommit: run.baseCommit
      },
      bugReport: run.bugReport,
      verificationSummary: {
        status: run.status,
        recommendation: run.recommendation,
        totalAttempts: run.attempts.length,
        currentAttempt: run.currentAttempt,
        trustCollapsed: run.trustCollapsed,
        trustCollapseReason: run.trustCollapseReason,
        circuitBreakerTripped: run.circuitBreakerTripped,
        circuitBreakerReason: run.circuitBreakerReason,
        verifiedPatchHash: run.currentPatchHash
      },
      agents: run.agents,
      attempts: run.attempts.map(a => ({
        attemptNumber: a.attemptNumber,
        patchHash: a.patchHash,
        status: a.status,
        testPassedCount: a.testPassedCount,
        testFailedCount: a.testFailedCount,
        counterexamplesCount: a.counterexamplesCount,
        explanation: a.explanation,
        diff: a.diff
      })),
      counterexamples: run.counterexamples,
      securityFindings: run.securityFindings,
      mutationTesting: run.mutationReport,
      deterministicPolicy: run.policyResult,
      humanDecision: run.humanDecision
    };

    return JSON.stringify(reportData, null, 2);
  }

  public static generateMarkdownReport(run: VerificationRun): string {
    const lines: string[] = [];

    lines.push(`# RAZE — Cryptographic Verification & Evidence Report`);
    lines.push(`**Run Identifier:** \`${run.id}\`  `);
    lines.push(`**Repository:** \`${run.repositoryName}\` (\`${run.branch}\`)  `);
    lines.push(`**Generated At:** ${new Date().toUTCString()}  `);
    lines.push(`**Final Release Recommendation:** **${run.recommendation || 'PENDING'}**  `);
    lines.push(``);

    lines.push(`---`);
    lines.push(`## 1. Executive Summary`);
    lines.push(`- **Defect Title:** ${run.bugReport.title}`);
    lines.push(`- **Target File:** \`${run.bugReport.targetFile}\``);
    lines.push(`- **Reproduction Command:** \`${run.bugReport.reproduceCommand}\``);
    lines.push(`- **Overall Status:** \`${run.status}\``);
    lines.push(`- **Trust Collapse Triggered:** ${run.trustCollapsed ? 'YES (Unsupported trust collapsed during adversarial stage)' : 'NO'}`);
    if (run.trustCollapseReason) {
      lines.push(`  - *Collapse Trigger:* ${run.trustCollapseReason}`);
    }
    lines.push(`- **Security Circuit Breaker:** ${run.circuitBreakerTripped ? 'TRIPPED' : 'INACTIVE (Nominal)'}`);
    if (run.currentPatchHash) {
      lines.push(`- **Verified Patch SHA-256 Hash:** \`${run.currentPatchHash}\``);
    }
    lines.push(``);

    lines.push(`---`);
    lines.push(`## 2. Deterministic Approval Policy Matrix`);
    if (run.policyResult) {
      lines.push(`| Policy Rule | Category | Status | Blocking | Evidence Summary |`);
      lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
      for (const rule of run.policyResult.rulesEvaluated) {
        const statusEmoji = rule.passed ? 'PASSED' : 'FAILED';
        lines.push(`| **${rule.name}** | \`${rule.category}\` | ${statusEmoji} | ${rule.blocking ? 'YES' : 'NO'} | ${rule.evidenceSummary} |`);
      }
      lines.push(``);

      if (run.policyResult.blockingReasons.length > 0) {
        lines.push(`### Blocking Conditions:`);
        for (const reason of run.policyResult.blockingReasons) {
          lines.push(`- 🛑 ${reason}`);
        }
        lines.push(``);
      }

      if (run.policyResult.knownLimitations.length > 0) {
        lines.push(`### Disclosed Limitations & Assumptions:`);
        for (const lim of run.policyResult.knownLimitations) {
          lines.push(`- ⚠️ ${lim}`);
        }
        lines.push(``);
      }
    } else {
      lines.push(`*Policy evaluation is pending or not yet executed.*`);
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(`## 3. Patch Attempt History`);
    for (const attempt of run.attempts) {
      lines.push(`### Attempt #${attempt.attemptNumber} — Status: \`${attempt.status}\``);
      lines.push(`- **Patch Hash:** \`${attempt.patchHash}\``);
      lines.push(`- **Tests Passed:** ${attempt.testPassedCount} | **Failed:** ${attempt.testFailedCount}`);
      lines.push(`- **Discovered Counterexamples:** ${attempt.counterexamplesCount}`);
      lines.push(`- **Explanation:** ${attempt.explanation}`);
      lines.push(``);
      lines.push(`\`\`\`diff`);
      lines.push(attempt.diff);
      lines.push(`\`\`\``);
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(`## 4. Adversarial Counterexample Findings`);
    if (run.counterexamples.length === 0) {
      lines.push(`*Zero counterexamples discovered. All executed edge cases satisfied specification.*`);
    } else {
      for (const cx of run.counterexamples) {
        lines.push(`#### [Attempt #${cx.attemptNumber}] ${cx.testName}`);
        lines.push(`- **Input Vector:** \`${cx.inputVector}\``);
        lines.push(`- **Expected Output:** ${cx.expectedOutput}`);
        lines.push(`- **Actual Output:** ${cx.actualOutput}`);
        lines.push(`- **Reproduction Command:** \`${cx.reproductionCommand}\``);
        lines.push(`- **Evidence:** \`${cx.failureEvidence}\``);
        lines.push(``);
      }
    }
    lines.push(``);

    lines.push(`---`);
    lines.push(`## 5. Security Guardian Audit`);
    if (run.securityFindings.length === 0) {
      lines.push(`*Zero security vulnerabilities or prohibited operations detected.*`);
    } else {
      for (const sec of run.securityFindings) {
        lines.push(`#### [${sec.severity}] ${sec.title}`);
        lines.push(`- **File:** \`${sec.affectedFile}\` (${sec.lineRange})`);
        lines.push(`- **Detection:** \`${sec.detectionMethod}\``);
        lines.push(`- **Evidence:** ${sec.evidence}`);
        lines.push(`- **Mitigation:** ${sec.recommendedMitigation}`);
        lines.push(``);
      }
    }
    lines.push(``);

    lines.push(`---`);
    lines.push(`## 6. Mutation Testing Trust Score`);
    if (run.mutationReport) {
      lines.push(`- **Mutation Trust Score:** **${run.mutationReport.mutationScore}%**`);
      lines.push(`- **Mutants Killed:** ${run.mutationReport.mutantsKilled} / ${run.mutationReport.totalMutants}`);
      lines.push(`- **Mutants Survived:** ${run.mutationReport.mutantsSurvived}`);
      lines.push(`- **Analysis:** ${run.mutationReport.survivingAnalysis}`);
      lines.push(``);
    } else {
      lines.push(`*Mutation testing not executed for this run.*`);
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(`## 7. Human Review Record`);
    if (run.humanDecision) {
      lines.push(`- **Decision:** **${run.humanDecision.decision}**`);
      lines.push(`- **Reviewed Patch Hash:** \`${run.humanDecision.reviewedPatchHash}\``);
      lines.push(`- **Reviewer:** ${run.humanDecision.reviewer}`);
      lines.push(`- **Timestamp:** ${run.humanDecision.decidedAt}`);
      lines.push(`- **Notes:** ${run.humanDecision.reviewerNotes || 'None'}`);
    } else {
      lines.push(`*Awaiting human developer inspection and cryptographic hash sign-off.*`);
    }

    return lines.join('\n');
  }
}

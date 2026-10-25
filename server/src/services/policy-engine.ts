import {
  DeterministicPolicyResult,
  PolicyRuleEvaluation,
  ReleaseRecommendation,
  VerificationRun
} from '../types/index.js';

export class PolicyEngine {
  /**
   * Deterministically evaluates the accumulated evidence against strict release criteria.
   * LLMs cannot override these rule results.
   */
  public static evaluatePolicy(
    run: VerificationRun,
    options: {
      testedPatchHash?: string;
      reviewedPatchHash?: string;
      requireMutationPass?: boolean;
      minMutationScore?: number;
    } = {}
  ): DeterministicPolicyResult {
    const rulesEvaluated: PolicyRuleEvaluation[] = [];
    const blockingReasons: string[] = [];
    const warnings: string[] = [];
    const knownLimitations: string[] = [
      'Empirical verification does not constitute a mathematical proof of correctness for all arbitrary execution states.',
      'Test suite execution is bounded by specified adversarial test vectors and observed mutation candidates.',
      'Security scans check for known static vulnerability patterns, prototype pollution, dangerous eval calls, and path traversal, but cannot guarantee absence of zero-day logic flaws.'
    ];

    // Rule 1: Baseline & Regression Test Success
    const latestAttempt = run.attempts[run.attempts.length - 1];
    const testPassed = latestAttempt && latestAttempt.testFailedCount === 0 && latestAttempt.testPassedCount > 0;
    rulesEvaluated.push({
      ruleId: 'RULE-TESTS-CLEAN',
      name: 'All Executed Unit & Regression Tests Pass',
      description: 'Zero test failures permitted in the target and regression suites.',
      category: 'TESTS',
      passed: Boolean(testPassed),
      blocking: true,
      evidenceSummary: latestAttempt
        ? `${latestAttempt.testPassedCount} passed, ${latestAttempt.testFailedCount} failed`
        : 'No attempt executed'
    });
    if (!testPassed) {
      blockingReasons.push(
        `Test failures detected in Attempt #${latestAttempt?.attemptNumber ?? 1}: ${latestAttempt?.testFailedCount ?? 1} test(s) failed.`
      );
    }

    // Rule 2: Counterexample Hunter Challenge
    const activeCounterexamples = run.counterexamples.filter(c => c.attemptNumber === run.currentAttempt && c.confirmed);
    const counterexamplesClean = activeCounterexamples.length === 0;
    rulesEvaluated.push({
      ruleId: 'RULE-NO-COUNTEREXAMPLES',
      name: 'Zero Confirmed Adversarial Counterexamples',
      description: 'Adversarial counterexample hunter must not find reproducible boundary or malformed vector failures.',
      category: 'TESTS',
      passed: counterexamplesClean,
      blocking: true,
      evidenceSummary: counterexamplesClean
        ? 'No active counterexamples on current patch attempt'
        : `${activeCounterexamples.length} confirmed counterexample(s) detected`
    });
    if (!counterexamplesClean) {
      for (const cx of activeCounterexamples) {
        blockingReasons.push(`Confirmed counterexample on ${cx.testName}: Input "${cx.inputVector}" caused failure.`);
      }
    }

    // Rule 3: Security Guardian Unresolved Critical / High Findings
    const unresolvedCriticalSecurity = run.securityFindings.filter(
      s => (s.severity === 'CRITICAL' || s.severity === 'HIGH') && s.blocksRelease
    );
    const securityClean = unresolvedCriticalSecurity.length === 0;
    rulesEvaluated.push({
      ruleId: 'RULE-SECURITY-CLEAN',
      name: 'Zero Unresolved Critical/High Security Findings',
      description: 'No unresolved critical vulnerabilities, path traversals, or hardcoded secrets.',
      category: 'SECURITY',
      passed: securityClean,
      blocking: true,
      evidenceSummary: securityClean
        ? 'Zero blocking security findings'
        : `${unresolvedCriticalSecurity.length} blocking security finding(s) detected`
    });
    if (!securityClean) {
      for (const sec of unresolvedCriticalSecurity) {
        blockingReasons.push(`Security finding [${sec.severity}] ${sec.title} in ${sec.affectedFile}`);
      }
    }

    // Rule 4: Security Circuit Breaker State
    const circuitBreakerClean = !run.circuitBreakerTripped;
    rulesEvaluated.push({
      ruleId: 'RULE-CIRCUIT-BREAKER',
      name: 'Security Circuit Breaker Inactive',
      description: 'Circuit breaker must not have tripped during execution due to prohibited operations or timeouts.',
      category: 'SECURITY',
      passed: circuitBreakerClean,
      blocking: true,
      evidenceSummary: circuitBreakerClean
        ? 'Circuit breaker remained closed (nominal)'
        : `Circuit breaker tripped: ${run.circuitBreakerReason}`
    });
    if (!circuitBreakerClean) {
      blockingReasons.push(`Circuit Breaker Tripped: ${run.circuitBreakerReason}`);
    }

    // Rule 5: Patch Identity and Cryptographic Hash Integrity
    const testedHash = options.testedPatchHash || latestAttempt?.patchHash || run.currentPatchHash;
    const reviewedHash = options.reviewedPatchHash;
    let patchHashVerified = true;

    if (reviewedHash && testedHash) {
      patchHashVerified = testedHash.trim().toLowerCase() === reviewedHash.trim().toLowerCase();
    }

    rulesEvaluated.push({
      ruleId: 'RULE-PATCH-IDENTITY',
      name: 'Cryptographic Patch Hash Identity Verified',
      description: 'The patch presented for human review must have an identical SHA-256 hash to the tested patch.',
      category: 'IDENTITY',
      passed: patchHashVerified,
      blocking: true,
      evidenceSummary: patchHashVerified
        ? `Tested patch hash verified: ${testedHash?.substring(0, 16)}...`
        : `Hash mismatch! Tested: ${testedHash?.substring(0, 16)}... Reviewed: ${reviewedHash?.substring(0, 16)}...`
    });
    if (!patchHashVerified) {
      blockingReasons.push('Patch integrity failure: Reviewed patch hash does not match tested patch hash in shadow workspace.');
    }

    // Rule 6: Mutation Testing Threshold
    if (run.mutationReport) {
      const minScore = options.minMutationScore ?? 70;
      const mutationScorePassed = run.mutationReport.mutationScore >= minScore;
      rulesEvaluated.push({
        ruleId: 'RULE-MUTATION-SCORE',
        name: `Mutation Testing Trust Score >= ${minScore}%`,
        description: 'Challenge test suite must kill at least the minimum threshold of introduced code mutants.',
        category: 'INTEGRITY',
        passed: mutationScorePassed,
        blocking: false, // Inconclusive / review rather than immediate hard block
        evidenceSummary: `Mutation score: ${run.mutationReport.mutationScore}% (${run.mutationReport.mutantsKilled}/${run.mutationReport.totalMutants} killed)`
      });
      if (!mutationScorePassed) {
        warnings.push(
          `Mutation score of ${run.mutationReport.mutationScore}% is below recommended ${minScore}%. Some boundary mutants survived.`
        );
      }
    } else {
      warnings.push('Mutation testing report is not attached; test integrity is based solely on test suite passes.');
    }

    // Determine Recommendation
    let recommendation: ReleaseRecommendation;
    if (blockingReasons.length > 0) {
      recommendation = 'BLOCKED';
    } else if (warnings.length > 0 || !run.mutationReport) {
      recommendation = 'NEEDS_REVIEW';
    } else {
      recommendation = 'READY_FOR_HUMAN_REVIEW';
    }

    return {
      recommendation,
      evaluatedAt: new Date().toISOString(),
      rulesEvaluated,
      blockingReasons,
      warnings,
      knownLimitations,
      patchHashVerified,
      requiresHumanReview: true // Always requires human approval before release
    };
  }
}

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDatabase } from '../src/db/database.js';
import { RepositoryService } from '../src/services/repository-service.js';
import { ShadowWorkspaceService } from '../src/services/shadow-workspace-service.js';
import { MemoryService } from '../src/services/memory-service.js';
import { SecurityService } from '../src/services/security-service.js';
import { PolicyEngine } from '../src/services/policy-engine.js';
import { EvidenceService } from '../src/services/evidence-service.js';
import { VerificationEngine } from '../src/engine/verification-engine.js';
import { VerificationRun } from '../src/types/index.js';

describe('RAZE Verification Platform - Automated Test Suite', () => {
  // Ensure DB and Repositories are initialized
  getDatabase();
  RepositoryService.initializeRepositories();
  MemoryService.seedInitialMemory();

  test('Repository Service: prevents path traversal attempts outside root', () => {
    assert.throws(
      () => RepositoryService.getFileContent('repo-pricing-service', '../../../../etc/passwd'),
      {
        message: /Security Violation: Path traversal attempted/
      }
    );
  });

  test('Repository Service: reads valid source file and computes SHA-256 hash', () => {
    const file = RepositoryService.getFileContent('repo-pricing-service', 'src/pricing.ts');
    assert.ok(file.content.length > 0);
    assert.equal(file.hash.length, 64); // SHA-256 hex length
  });

  test('Shadow Workspace: creates isolated workspace and applies patch with cryptographic hash match', () => {
    const repo = RepositoryService.getRepositoryById('repo-pricing-service')!;
    const shadow = ShadowWorkspaceService.createShadowWorkspace('test-run-1', 1, repo.path);

    const testDiff = `--- a/src/pricing.ts\n+++ b/src/pricing.ts\n@@ -1,1 +1,1 @@\n-// test\n+// patched`;
    const expectedHash = crypto.createHash('sha256').update(testDiff.trim()).digest('hex');

    const result = ShadowWorkspaceService.applyPatch(
      shadow.workspacePath,
      'src/pricing.ts',
      '// patched file content',
      testDiff
    );

    assert.ok(result.success);
    assert.equal(result.patchHash, expectedHash);

    // Cleanup
    ShadowWorkspaceService.cleanupWorkspace(shadow.workspacePath);
  });

  test('Security Circuit Breaker: trips when forbidden system file is targeted', () => {
    const result = SecurityService.scanPatch(
      'run-sec-test',
      ['.env', 'src/app.ts'],
      '+ SECRET=xyz',
      'console.log(process.env)'
    );

    assert.equal(result.circuitBreakerTripped, true);
    assert.ok(result.circuitBreakerReason?.includes('CIRCUIT BREAKER TRIPPED'));
    assert.equal(result.findings[0].severity, 'CRITICAL');
  });

  test('Security Circuit Breaker: trips when unsafe eval is introduced', () => {
    const diffWithEval = `--- a/src/calc.ts\n+++ b/src/calc.ts\n@@ -1,1 +1,2 @@\n+const result = eval(userExpression);`;
    const result = SecurityService.scanPatch(
      'run-sec-test-2',
      ['src/calc.ts'],
      diffWithEval,
      'eval(userExpression)'
    );

    assert.equal(result.circuitBreakerTripped, true);
    assert.ok(result.circuitBreakerReason?.includes('eval'));
  });

  test('Verification Memory: persists and retrieves historical failure patterns', () => {
    const uniquePattern = `TEST_PATTERN_${Date.now()}`;
    const saved = MemoryService.saveMemory({
      repositoryId: 'repo-pricing-service',
      defectPattern: uniquePattern,
      bugDescription: 'Special boundary test failure',
      rootCause: 'Omission of NaN check',
      outcome: 'VERIFIED_AND_PROTECTED'
    });

    assert.ok(saved.id.startsWith('mem-'));

    const searchResults = MemoryService.searchMemory('repo-pricing-service', uniquePattern);
    assert.ok(searchResults.length > 0);
    assert.equal(searchResults[0].defectPattern, uniquePattern);

    // Clean up
    MemoryService.deleteMemory(saved.id);
  });

  test('Deterministic Policy Engine: blocks release when test fails', () => {
    const mockRun: VerificationRun = {
      id: 'mock-1',
      repositoryId: 'repo-pricing-service',
      repositoryName: 'pricing-service',
      branch: 'main',
      baseCommit: 'a1b2c3d',
      bugReport: {
        title: 'Bug',
        description: 'Bug desc',
        targetFile: 'src/pricing.ts',
        reportedBehavior: 'fail',
        expectedBehavior: 'pass',
        reproduceCommand: 'npm test'
      },
      status: 'CHALLENGING',
      currentAttempt: 1,
      maxRetries: 3,
      currentPatchHash: 'hash-abc',
      trustCollapsed: true,
      circuitBreakerTripped: false,
      agents: {} as any,
      attempts: [
        {
          attemptNumber: 1,
          runId: 'mock-1',
          patchHash: 'hash-abc',
          diff: '',
          filesChanged: ['src/pricing.ts'],
          explanation: '',
          expectedBehavior: '',
          knownRisks: [],
          testedInShadowWorkspace: true,
          testPassedCount: 5,
          testFailedCount: 1, // Test failure!
          counterexamplesCount: 1,
          status: 'REJECTED_TRUST_COLLAPSED',
          createdAt: new Date().toISOString()
        }
      ],
      counterexamples: [
        {
          id: 'cx-1',
          runId: 'mock-1',
          attemptNumber: 1,
          testName: 'Boundary test',
          inputVector: '150%',
          expectedOutput: 'RangeError',
          actualOutput: '-$50',
          reproductionCommand: 'npm test',
          failureEvidence: 'Failed assertion',
          confirmed: true,
          timestamp: new Date().toISOString()
        }
      ],
      securityFindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const policy = PolicyEngine.evaluatePolicy(mockRun);
    assert.equal(policy.recommendation, 'BLOCKED');
    assert.ok(policy.blockingReasons.length >= 2); // test failure + counterexample
    assert.notEqual(policy.recommendation, 'READY_FOR_HUMAN_REVIEW');
  });

  test('Deterministic Policy Engine: requires matching patch hash for approval', () => {
    const testedHash = '88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589';
    const tamperedHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const mockRun: VerificationRun = {
      id: 'mock-2',
      repositoryId: 'repo-pricing-service',
      repositoryName: 'pricing-service',
      branch: 'main',
      baseCommit: 'a1b2c3d',
      bugReport: { title: '', description: '', targetFile: '', reportedBehavior: '', expectedBehavior: '', reproduceCommand: '' },
      status: 'GATE_EVALUATION',
      currentAttempt: 2,
      maxRetries: 3,
      currentPatchHash: testedHash,
      trustCollapsed: false,
      circuitBreakerTripped: false,
      agents: {} as any,
      attempts: [
        {
          attemptNumber: 2,
          runId: 'mock-2',
          patchHash: testedHash,
          diff: '',
          filesChanged: ['src/pricing.ts'],
          explanation: '',
          expectedBehavior: '',
          knownRisks: [],
          testedInShadowWorkspace: true,
          testPassedCount: 10,
          testFailedCount: 0,
          counterexamplesCount: 0,
          status: 'VERIFIED',
          createdAt: new Date().toISOString()
        }
      ],
      counterexamples: [],
      securityFindings: [],
      mutationReport: {
        totalMutants: 5,
        mutantsKilled: 5,
        mutantsSurvived: 0,
        mutantsTimedOut: 0,
        mutationScore: 100,
        mutants: [],
        survivingAnalysis: 'All killed'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Evaluate with tampered hash
    const policyMismatch = PolicyEngine.evaluatePolicy(mockRun, {
      testedPatchHash: testedHash,
      reviewedPatchHash: tamperedHash
    });

    assert.equal(policyMismatch.recommendation, 'BLOCKED');
    assert.equal(policyMismatch.patchHashVerified, false);
    assert.ok(policyMismatch.blockingReasons.some(r => r.includes('hash')));

    // Evaluate with matching hash
    const policyMatched = PolicyEngine.evaluatePolicy(mockRun, {
      testedPatchHash: testedHash,
      reviewedPatchHash: testedHash
    });
    assert.equal(policyMatched.recommendation, 'READY_FOR_HUMAN_REVIEW');
    assert.equal(policyMatched.patchHashVerified, true);
  });

  test('Evidence Service: generates compliant Markdown and JSON reports', () => {
    const mockRun: VerificationRun = {
      id: 'mock-report-run',
      repositoryId: 'repo-pricing-service',
      repositoryName: 'pricing-service',
      branch: 'main',
      baseCommit: 'c3f91a0',
      bugReport: {
        title: 'Negative discount error',
        description: 'Does not validate discount parameter',
        targetFile: 'src/pricing.ts',
        reportedBehavior: 'Negative price calculated',
        expectedBehavior: 'RangeError thrown',
        reproduceCommand: 'npx tsx --test tests/pricing.test.ts'
      },
      status: 'READY_FOR_HUMAN_REVIEW',
      currentAttempt: 2,
      maxRetries: 3,
      currentPatchHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      recommendation: 'READY_FOR_HUMAN_REVIEW',
      trustCollapsed: true,
      trustCollapseReason: 'Adversarial counterexample found on Attempt 1',
      circuitBreakerTripped: false,
      agents: {} as any,
      attempts: [
        {
          attemptNumber: 1,
          runId: 'mock-report-run',
          patchHash: 'hash-1',
          diff: '- old\n+ new',
          filesChanged: ['src/pricing.ts'],
          explanation: 'Naive check',
          expectedBehavior: 'Throws on negative',
          knownRisks: ['Misses >100%'],
          testedInShadowWorkspace: true,
          testPassedCount: 5,
          testFailedCount: 1,
          counterexamplesCount: 1,
          status: 'REJECTED_TRUST_COLLAPSED',
          createdAt: new Date().toISOString()
        }
      ],
      counterexamples: [
        {
          id: 'cx-1',
          runId: 'mock-report-run',
          attemptNumber: 1,
          testName: 'Boundary test 150%',
          inputVector: 'calculateDiscount(100, 150)',
          expectedOutput: 'RangeError',
          actualOutput: '-$50',
          reproductionCommand: 'npx tsx --test tests/adversarial.test.ts',
          failureEvidence: 'AssertionError: Missing expected exception',
          confirmed: true,
          timestamp: new Date().toISOString()
        }
      ],
      securityFindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const md = EvidenceService.generateMarkdownReport(mockRun);
    assert.ok(md.includes('# RAZE — Cryptographic Verification & Evidence Report'));
    assert.ok(md.includes('READY_FOR_HUMAN_REVIEW'));
    assert.ok(md.includes('Boundary test 150%'));

    const jsonStr = EvidenceService.generateJsonReport(mockRun);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.repository.name, 'pricing-service');
    assert.equal(parsed.counterexamples.length, 1);
  });
});

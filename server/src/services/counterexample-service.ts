import crypto from 'node:crypto';
import { CounterexampleFinding } from '../types/index.js';
import { TestExecutorService } from './test-executor-service.js';

export interface HunterChallengeResult {
  hasCounterexamples: boolean;
  counterexamples: CounterexampleFinding[];
  testOutput: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  summary: string;
}

export class CounterexampleService {
  /**
   * Executes adversarial test suite against the patched shadow workspace
   */
  public static async huntCounterexamples(
    runId: string,
    attemptNumber: number,
    workspacePath: string,
    adversarialTestPath: string = 'tests/adversarial.test.ts'
  ): Promise<HunterChallengeResult> {
    const testResult = await TestExecutorService.runTest(workspacePath, adversarialTestPath, 12000);

    const counterexamples: CounterexampleFinding[] = [];

    if (testResult.failedCount > 0) {
      for (const failedTest of testResult.failedTests) {
        let inputVector = 'Boundary or non-finite vector';
        let expectedOutput = 'Appropriate exception (RangeError or TypeError)';
        let actualOutput = 'Unchecked computation returned invalid state';

        if (failedTest.name.includes('exceeding 100%')) {
          inputVector = 'calculateDiscount(100, 150)';
          expectedOutput = 'RangeError: Discount percentage must be between 0 and 100';
          actualOutput = 'Returned { discountAmount: 150, finalPrice: -50 } (customer is paid)';
        } else if (failedTest.name.includes('negative price')) {
          inputVector = 'calculateDiscount(-50, 10)';
          expectedOutput = 'RangeError: Price must be a non-negative number';
          actualOutput = 'Returned { discountAmount: -5, finalPrice: -45 } (negative subtotal)';
        } else if (failedTest.name.includes('NaN')) {
          inputVector = 'calculateDiscount(100, NaN)';
          expectedOutput = 'TypeError: Discount percentage must be a finite number';
          actualOutput = 'Returned { discountAmount: NaN, finalPrice: NaN } (corrupted invoice)';
        } else if (failedTest.name.includes('Infinity')) {
          inputVector = 'calculateDiscount(100, Infinity)';
          expectedOutput = 'TypeError: Discount percentage must be a finite number';
          actualOutput = 'Returned { discountAmount: Infinity, finalPrice: -Infinity }';
        }

        counterexamples.push({
          id: `cx-${crypto.randomBytes(4).toString('hex')}`,
          runId,
          attemptNumber,
          testName: failedTest.name,
          inputVector,
          expectedOutput,
          actualOutput,
          reproductionCommand: `${testResult.commandExecuted} --test-name-pattern="${failedTest.name}"`,
          failureEvidence: failedTest.error || testResult.stderr || 'Assertion failed during adversarial execution',
          sourceLocation: 'src/pricing.ts:calculateDiscount',
          confirmed: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    const hasCounterexamples = counterexamples.length > 0;
    const summary = hasCounterexamples
      ? `TRUST COLLAPSE: Adversarial Counterexample Hunter exposed ${counterexamples.length} reproducible failure(s)! Proposed patch does not generalize to boundary and malformed inputs.`
      : `Adversarial Check Passed: Zero counterexamples discovered across ${testResult.passedCount} adversarial boundary tests.`;

    return {
      hasCounterexamples,
      counterexamples,
      testOutput: testResult.stdout + '\n' + testResult.stderr,
      totalTests: testResult.totalTests,
      passedCount: testResult.passedCount,
      failedCount: testResult.failedCount,
      summary
    };
  }
}

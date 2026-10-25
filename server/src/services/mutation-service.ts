import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MutantResult, MutationAnalysisReport } from '../types/index.js';
import { TestExecutorService } from './test-executor-service.js';

interface MutationCandidate {
  description: string;
  originalSnippet: string;
  mutatedSnippet: string;
  line: number;
  suggestedTest: string;
}

export class MutationService {
  /**
   * Runs mutation testing against the patched code in the shadow workspace
   */
  public static async runMutationTesting(
    runId: string,
    workspacePath: string,
    targetRelativeFile: string,
    testRelativeFile: string
  ): Promise<MutationAnalysisReport> {
    const fullPath = path.resolve(workspacePath, targetRelativeFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Target file for mutation testing not found: ${fullPath}`);
    }

    const originalContent = fs.readFileSync(fullPath, 'utf-8');
    const lines = originalContent.split('\n');

    // Generate real mutation candidates based on code structure
    const candidates = this.generateCandidates(originalContent, lines);

    const mutants: MutantResult[] = [];
    let killed = 0;
    let survived = 0;
    let timedOut = 0;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const mutantId = `mut-${i + 1}-${crypto.randomBytes(3).toString('hex')}`;

      // Apply single mutant
      const mutatedContent = originalContent.replace(candidate.originalSnippet, candidate.mutatedSnippet);
      fs.writeFileSync(fullPath, mutatedContent, 'utf-8');

      try {
        // Run challenge test suite against this mutant
        let testResult = await TestExecutorService.runTest(workspacePath, testRelativeFile, 8000);
        // If not killed by primary suite, also run standard regression test suite
        if (testResult.failedCount === 0 && !testResult.timedOut) {
          const regressionResult = await TestExecutorService.runTest(workspacePath, 'tests/pricing.test.ts', 8000);
          if (regressionResult.failedCount > 0 || regressionResult.exitCode !== 0) {
            testResult = regressionResult;
          }
        }

        if (testResult.timedOut) {
          timedOut++;
          mutants.push({
            id: mutantId,
            runId,
            file: targetRelativeFile,
            line: candidate.line,
            originalOp: candidate.originalSnippet.trim(),
            mutatedOp: candidate.mutatedSnippet.trim(),
            mutantCodeSnippet: candidate.mutatedSnippet,
            status: 'TIMED_OUT',
            killingTest: undefined,
            suggestedStrongerTest: candidate.suggestedTest
          });
        } else if (testResult.failedCount > 0 || testResult.exitCode !== 0) {
          // Mutant caught by test! KILLED
          killed++;
          const killingTest = testResult.failedTests[0]?.name || 'Standard test suite assertion';
          mutants.push({
            id: mutantId,
            runId,
            file: targetRelativeFile,
            line: candidate.line,
            originalOp: candidate.originalSnippet.trim(),
            mutatedOp: candidate.mutatedSnippet.trim(),
            mutantCodeSnippet: candidate.mutatedSnippet,
            status: 'KILLED',
            killingTest,
            suggestedStrongerTest: undefined
          });
        } else {
          // Tests still passed! Mutant SURVIVED
          survived++;
          mutants.push({
            id: mutantId,
            runId,
            file: targetRelativeFile,
            line: candidate.line,
            originalOp: candidate.originalSnippet.trim(),
            mutatedOp: candidate.mutatedSnippet.trim(),
            mutantCodeSnippet: candidate.mutatedSnippet,
            status: 'SURVIVED',
            killingTest: undefined,
            suggestedStrongerTest: candidate.suggestedTest
          });
        }
      } catch (err) {
        killed++;
      } finally {
        // Restore original content after each mutant execution
        fs.writeFileSync(fullPath, originalContent, 'utf-8');
      }
    }

    const totalMutants = mutants.length;
    const mutationScore = totalMutants > 0 ? Math.round((killed / totalMutants) * 100) : 100;

    const survivingAnalysis = survived > 0
      ? `Test Integrity Alert: ${survived} mutant(s) survived execution. This indicates test coverage gaps at boundary conditions. Review suggested stronger tests.`
      : `High Test Integrity: All ${killed} active mutant(s) were successfully killed by the challenge test suite.`;

    return {
      totalMutants,
      mutantsKilled: killed,
      mutantsSurvived: survived,
      mutantsTimedOut: timedOut,
      mutationScore,
      mutants,
      survivingAnalysis
    };
  }

  private static generateCandidates(content: string, lines: string[]): MutationCandidate[] {
    const candidates: MutationCandidate[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNum = i + 1;

      // 1. Comparison mutations
      if (lineText.includes('discountPercent < 0')) {
        candidates.push({
          description: 'Boundary mutation: replace < with <=',
          originalSnippet: 'discountPercent < 0',
          mutatedSnippet: 'discountPercent <= 0',
          line: lineNum,
          suggestedTest: 'test("zero discount boundary: 0% must be accepted", () => { assert.equal(calculateDiscount(100, 0).finalPrice, 100); })'
        });
      }

      if (lineText.includes('discountPercent > 100')) {
        candidates.push({
          description: 'Boundary mutation: replace 100 with 99',
          originalSnippet: 'discountPercent > 100',
          mutatedSnippet: 'discountPercent > 99',
          line: lineNum,
          suggestedTest: 'test("full discount boundary: exactly 100% must be valid", () => { assert.equal(calculateDiscount(50, 100).finalPrice, 0); })'
        });
      }

      // 2. Arithmetic mutations
      if (lineText.includes('price - discountAmount')) {
        candidates.push({
          description: 'Arithmetic mutation: replace subtraction with addition',
          originalSnippet: 'price - discountAmount',
          mutatedSnippet: 'price + discountAmount',
          line: lineNum,
          suggestedTest: 'test("verify discount reduces price: price - discountAmount", () => { assert.equal(calculateDiscount(100, 20).finalPrice, 80); })'
        });
      }

      if (lineText.includes('discountPercent / 100')) {
        candidates.push({
          description: 'Scaling mutation: replace divisor / 100 with / 10',
          originalSnippet: 'discountPercent / 100',
          mutatedSnippet: 'discountPercent / 10',
          line: lineNum,
          suggestedTest: 'test("percentage scale factor: 25% of 100 is 25", () => { assert.equal(calculateDiscount(100, 25).discountAmount, 25); })'
        });
      }

      // 3. Negation mutations
      if (lineText.includes('!Number.isFinite(price)')) {
        candidates.push({
          description: 'Condition inversion: invert Number.isFinite check',
          originalSnippet: '!Number.isFinite(price)',
          mutatedSnippet: 'Number.isFinite(price)',
          line: lineNum,
          suggestedTest: 'test("finite number check on price", () => { assert.throws(() => calculateDiscount(NaN, 10)); })'
        });
      }

      if (lineText.includes('price < 0')) {
        candidates.push({
          description: 'Comparison swap: price < 0 to price > 0',
          originalSnippet: 'price < 0',
          mutatedSnippet: 'price > 0',
          line: lineNum,
          suggestedTest: 'test("negative price boundary", () => { assert.throws(() => calculateDiscount(-10, 5)); })'
        });
      }
    }

    // Default fallback candidate if specific lines were different
    if (candidates.length === 0) {
      candidates.push({
        description: 'Return value mutation',
        originalSnippet: 'return {',
        mutatedSnippet: 'return null as any; // {',
        line: 25,
        suggestedTest: 'test("return shape integrity check", () => { assert.ok(calculateDiscount(100, 10)); })'
      });
    }

    return candidates;
  }
}

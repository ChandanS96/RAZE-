import crypto from 'node:crypto';
import { PatchAttempt } from '../types/index.js';
import { CounterexampleFinding } from '../types/index.js';

export interface RepairProposal {
  patchAttempt: PatchAttempt;
  patchedContent: string;
  targetRelativePath: string;
}

export class RepairService {
  /**
   * Generates a targeted patch proposal based on attempt number and previous failure evidence
   */
  public static generateRepairProposal(
    runId: string,
    attemptNumber: number,
    repoId: string,
    targetFile: string,
    originalContent: string,
    counterexamples: CounterexampleFinding[] = []
  ): RepairProposal {
    if (repoId === 'repo-pricing-service' || targetFile.includes('pricing')) {
      return this.generatePricingRepair(runId, attemptNumber, targetFile, originalContent, counterexamples);
    } else {
      return this.generateAuthRepair(runId, attemptNumber, targetFile, originalContent, counterexamples);
    }
  }

  private static generatePricingRepair(
    runId: string,
    attemptNumber: number,
    targetFile: string,
    originalContent: string,
    counterexamples: CounterexampleFinding[]
  ): RepairProposal {
    let patchedContent = originalContent;
    let diff = '';
    let explanation = '';
    let expectedBehavior = '';
    let knownRisks: string[] = [];

    if (attemptNumber === 1) {
      // ATTEMPT 1: Plausible but incomplete patch (Demonstrates Trust Collapse Engine)
      // Fixes negative discount, but fails boundary > 100%, NaN, and negative price!
      const originalFunctionSnippet = `export function calculateDiscount(price: number, discountPercent: number): DiscountResult {
  // DELIBERATE DEFECTIVE BASELINE:
  const discountAmount = price * (discountPercent / 100);`;

      const patchedSnippet = `export function calculateDiscount(price: number, discountPercent: number): DiscountResult {
  // ATTEMPT 1 FIX: Validate negative discount
  if (discountPercent < 0) {
    throw new RangeError('Discount percentage must be between 0 and 100');
  }
  const discountAmount = price * (discountPercent / 100);`;

      patchedContent = originalContent.replace(originalFunctionSnippet, patchedSnippet);

      diff = `--- a/src/pricing.ts
+++ b/src/pricing.ts
@@ -32,3 +32,6 @@ export function calculateDiscount(price: number, discountPercent: number): Disco
-  // DELIBERATE DEFECTIVE BASELINE:
+  // ATTEMPT 1 FIX: Validate negative discount
+  if (discountPercent < 0) {
+    throw new RangeError('Discount percentage must be between 0 and 100');
+  }
   const discountAmount = price * (discountPercent / 100);`;

      explanation =
        'Attempt 1 adds a guard check for negative discount percentages (discountPercent < 0) to satisfy reproduction test #104.';
      expectedBehavior =
        'Calls with negative discount percentage will raise a RangeError. Positive percentages compute standard discounts.';
      knownRisks = [
        'Boundary check does not evaluate upper bound (discountPercent > 100).',
        'Does not validate price argument or check for NaN/Infinity non-finite values.'
      ];
    } else {
      // ATTEMPT 2: Hardened comprehensive patch addressing the counterexamples!
      const originalFunctionSnippet = `export function calculateDiscount(price: number, discountPercent: number): DiscountResult {
  // DELIBERATE DEFECTIVE BASELINE:
  const discountAmount = price * (discountPercent / 100);
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round((price - discountAmount) * 100) / 100
  };
}`;

      // Also support replacing Attempt 1 if re-patching
      const attempt1Snippet = `export function calculateDiscount(price: number, discountPercent: number): DiscountResult {
  // ATTEMPT 1 FIX: Validate negative discount
  if (discountPercent < 0) {
    throw new RangeError('Discount percentage must be between 0 and 100');
  }
  const discountAmount = price * (discountPercent / 100);
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round((price - discountAmount) * 100) / 100
  };
}`;

      const hardenedSnippet = `export function calculateDiscount(price: number, discountPercent: number): DiscountResult {
  // ATTEMPT 2 (HARDENED REPAIR): Comprehensive boundary, type, and range validation
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new TypeError('Price must be a finite number');
  }
  if (price < 0) {
    throw new RangeError('Price must be a non-negative number');
  }
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent)) {
    throw new TypeError('Discount percentage must be a finite number');
  }
  if (discountPercent < 0 || discountPercent > 100) {
    throw new RangeError('Discount percentage must be between 0 and 100');
  }

  const discountAmount = price * (discountPercent / 100);
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round((price - discountAmount) * 100) / 100
  };
}`;

      if (patchedContent.includes(attempt1Snippet)) {
        patchedContent = patchedContent.replace(attempt1Snippet, hardenedSnippet);
      } else {
        patchedContent = patchedContent.replace(originalFunctionSnippet, hardenedSnippet);
      }

      diff = `--- a/src/pricing.ts
+++ b/src/pricing.ts
@@ -32,6 +32,18 @@ export function calculateDiscount(price: number, discountPercent: number): Disco
+  // ATTEMPT 2 (HARDENED REPAIR): Comprehensive boundary, type, and range validation
+  if (typeof price !== 'number' || !Number.isFinite(price)) {
+    throw new TypeError('Price must be a finite number');
+  }
+  if (price < 0) {
+    throw new RangeError('Price must be a non-negative number');
+  }
+  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent)) {
+    throw new TypeError('Discount percentage must be a finite number');
+  }
+  if (discountPercent < 0 || discountPercent > 100) {
+    throw new RangeError('Discount percentage must be between 0 and 100');
+  }
   const discountAmount = price * (discountPercent / 100);`;

      explanation =
        'Attempt 2 incorporates adversarial feedback from Counterexample Hunter: added upper bound check (discountPercent > 100), price non-negativity check (price < 0), and strict Number.isFinite() validation for both arguments.';
      expectedBehavior =
        'Rejects all out-of-range discounts (both < 0 and > 100), rejects negative prices, rejects NaN/Infinity with TypeError.';
      knownRisks = [
        'Strict validation will reject legacy callers that inadvertently passed un-sanitized string numbers or NaN.'
      ];
    }

    const patchHash = crypto.createHash('sha256').update(diff.trim()).digest('hex');

    const patchAttempt: PatchAttempt = {
      attemptNumber,
      runId,
      patchHash,
      diff,
      filesChanged: [targetFile],
      explanation,
      expectedBehavior,
      knownRisks,
      testedInShadowWorkspace: false,
      testPassedCount: 0,
      testFailedCount: 0,
      counterexamplesCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    return {
      patchAttempt,
      patchedContent,
      targetRelativePath: targetFile
    };
  }

  private static generateAuthRepair(
    runId: string,
    attemptNumber: number,
    targetFile: string,
    originalContent: string,
    counterexamples: CounterexampleFinding[]
  ): RepairProposal {
    let patchedContent = originalContent;
    let diff = '';
    let explanation = '';
    let expectedBehavior = '';
    let knownRisks: string[] = [];

    const vulnerableSnippet = `export function resolveTenantPath(baseDir: string, userPath: string): string {
  // DELIBERATE SECURITY VULNERABILITY:
  // Directly joins without checking for traversal outside baseDir!
  const targetPath = path.resolve(baseDir, userPath);
  return targetPath;
}`;

    const secureSnippet = `export function resolveTenantPath(baseDir: string, userPath: string): string {
  // HARDENED SECURITY FIX: Canonical prefix path verification
  const safeBase = path.resolve(baseDir);
  const targetPath = path.resolve(baseDir, userPath);
  
  if (!targetPath.startsWith(safeBase + path.sep) && targetPath !== safeBase) {
    throw new Error('AccessDenied: Path traversal attempt outside tenant sandbox');
  }
  return targetPath;
}`;

    patchedContent = originalContent.replace(vulnerableSnippet, secureSnippet);

    diff = `--- a/src/tokenValidator.ts
+++ b/src/tokenValidator.ts
@@ -20,5 +20,9 @@ export function resolveTenantPath(baseDir: string, userPath: string): string {
-  // DELIBERATE SECURITY VULNERABILITY:
-  // Directly joins without checking for traversal outside baseDir!
+  // HARDENED SECURITY FIX: Canonical prefix path verification
+  const safeBase = path.resolve(baseDir);
   const targetPath = path.resolve(baseDir, userPath);
+  
+  if (!targetPath.startsWith(safeBase + path.sep) && targetPath !== safeBase) {
+    throw new Error('AccessDenied: Path traversal attempt outside tenant sandbox');
+  }
   return targetPath;`;

    explanation =
      'Secures resolveTenantPath against directory traversal by verifying canonical prefix containment against safeBase + path.sep.';
    expectedBehavior =
      'Relative traversal vectors (../../etc/passwd, ....//) throw an AccessDenied Error. Legitimate tenant subpaths resolve cleanly.';
    knownRisks = [
      'Symlinked directories outside the base path will be denied access unless explicitly mounted.'
    ];

    const patchHash = crypto.createHash('sha256').update(diff.trim()).digest('hex');

    const patchAttempt: PatchAttempt = {
      attemptNumber,
      runId,
      patchHash,
      diff,
      filesChanged: [targetFile],
      explanation,
      expectedBehavior,
      knownRisks,
      testedInShadowWorkspace: false,
      testPassedCount: 0,
      testFailedCount: 0,
      counterexamplesCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    return {
      patchAttempt,
      patchedContent,
      targetRelativePath: targetFile
    };
  }
}

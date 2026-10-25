import crypto from 'node:crypto';
import { getDatabase } from '../db/database.js';
import { VerificationMemoryRecord } from '../types/index.js';

export class MemoryService {
  public static seedInitialMemory(): void {
    const db = getDatabase();
    const count = (db.prepare('SELECT COUNT(*) as count FROM verification_memory').get() as any).count;
    if (count > 0) return;

    const initialEntries: VerificationMemoryRecord[] = [
      {
        id: 'mem-prc-001',
        repositoryId: 'repo-pricing-service',
        defectPattern: 'BOUNDARY_NUMERIC_RANGE_UNDERFLOW',
        bugDescription: 'Negative discount values accepted in calculateDiscount, resulting in price inflation',
        rootCause: 'Missing range validation for discountPercent argument in calculateDiscount; assumed caller sanitizes inputs',
        failedPatchSummary: 'Initial naive check only clamped (discountPercent = Math.max(0, discountPercent)) without raising RangeError, masking upstream API contract violations',
        counterexampleInput: 'calculateDiscount(100, -25)',
        effectiveRegressionTest: 'assert.throws(() => calculateDiscount(100, -15), { name: "RangeError" })',
        mutationFinding: 'Mutant replacing discountPercent < 0 with <= 0 survived when 0% boundary test was absent',
        securityFinding: 'No critical security bypass, but anomalous accounting ledger debit possible',
        resolutionPatchHash: 'a7c934f8e1245b98d2ef01a742881b764ef1a03975d045c719efb0394857b102',
        outcome: 'VERIFIED_AND_PROTECTED',
        createdAt: '2026-10-20T14:32:00.000Z'
      },
      {
        id: 'mem-prc-002',
        repositoryId: 'repo-pricing-service',
        defectPattern: 'FLOATING_POINT_NON_FINITE_NAN',
        bugDescription: 'Passing NaN or Infinity to cart subtotal causes NaN propagation to invoice database',
        rootCause: 'Lack of Number.isFinite check prior to arithmetic multiplication and rounding',
        failedPatchSummary: 'Patch checked typeof price === "number", but in JavaScript typeof NaN is "number"',
        counterexampleInput: 'calculateDiscount(NaN, 10) and calculateDiscount(100, Infinity)',
        effectiveRegressionTest: 'assert.throws(() => calculateDiscount(100, NaN), { name: "TypeError" })',
        mutationFinding: 'Killed mutant replacing Number.isFinite(p) with !isNaN(p)',
        securityFinding: 'Denial of service in financial reconciliation batches',
        resolutionPatchHash: 'f45d1290bb8a7e0403cf2179a957816cfbc5672d1591f8a7d65377011d88a291',
        outcome: 'VERIFIED_AND_PROTECTED',
        createdAt: '2026-10-22T09:15:00.000Z'
      },
      {
        id: 'mem-auth-001',
        repositoryId: 'repo-auth-guardian',
        defectPattern: 'PATH_TRAVERSAL_DIRECTORY_ESCAPE',
        bugDescription: 'resolveTenantPath allowed relative navigation via ../../../etc/passwd',
        rootCause: 'path.resolve was used without verifying that the resolved path is prefixed by baseDir with boundary slash',
        failedPatchSummary: 'Stripped ../ strings once with string.replace, vulnerable to nested ....// bypass',
        counterexampleInput: 'resolveTenantPath(sandboxDir, "....//....//etc/passwd")',
        effectiveRegressionTest: 'assert.throws(() => resolveTenantPath(sandboxDir, "../../etc/passwd"))',
        mutationFinding: 'Mutant disabling boundary prefix check caught by security integration test',
        securityFinding: 'CRITICAL: Arbitrary filesystem read and unauthorized host configuration disclosure',
        resolutionPatchHash: 'c838914b72ef31a98076d54cf3302d7aa0167c130f142279b9ef56b9c97693d2',
        outcome: 'VERIFIED_AND_PROTECTED',
        createdAt: '2026-10-24T18:40:00.000Z'
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO verification_memory (
        id, repository_id, defect_pattern, bug_description, root_cause,
        failed_patch_summary, counterexample_input, effective_regression_test,
        mutation_finding, security_finding, resolution_patch_hash, outcome, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const mem of initialEntries) {
      stmt.run(
        mem.id,
        mem.repositoryId,
        mem.defectPattern,
        mem.bugDescription,
        mem.rootCause,
        mem.failedPatchSummary ?? null,
        mem.counterexampleInput ?? null,
        mem.effectiveRegressionTest ?? null,
        mem.mutationFinding ?? null,
        mem.securityFinding ?? null,
        mem.resolutionPatchHash ?? null,
        mem.outcome,
        mem.createdAt
      );
    }
  }

  public static searchMemory(repoId: string, query: string): VerificationMemoryRecord[] {
    const db = getDatabase();
    const cleanQuery = `%${query.trim().toLowerCase()}%`;
    const rows = db.prepare(`
      SELECT * FROM verification_memory
      WHERE (repository_id = ? OR ? = '')
      AND (
        LOWER(defect_pattern) LIKE ?
        OR LOWER(bug_description) LIKE ?
        OR LOWER(root_cause) LIKE ?
        OR LOWER(counterexample_input) LIKE ?
      )
      ORDER BY created_at DESC
    `).all(repoId, repoId, cleanQuery, cleanQuery, cleanQuery, cleanQuery) as any[];

    return rows.map(this.mapRowToRecord);
  }

  public static getAllMemory(repoId?: string): VerificationMemoryRecord[] {
    const db = getDatabase();
    let query = 'SELECT * FROM verification_memory';
    const params: any[] = [];
    if (repoId) {
      query += ' WHERE repository_id = ?';
      params.push(repoId);
    }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(this.mapRowToRecord);
  }

  public static getMemoryById(id: string): VerificationMemoryRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM verification_memory WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  public static saveMemory(record: Omit<VerificationMemoryRecord, 'id' | 'createdAt'>): VerificationMemoryRecord {
    const db = getDatabase();
    const id = `mem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO verification_memory (
        id, repository_id, defect_pattern, bug_description, root_cause,
        failed_patch_summary, counterexample_input, effective_regression_test,
        mutation_finding, security_finding, resolution_patch_hash, outcome, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      record.repositoryId,
      record.defectPattern,
      record.bugDescription,
      record.rootCause,
      record.failedPatchSummary ?? null,
      record.counterexampleInput ?? null,
      record.effectiveRegressionTest ?? null,
      record.mutationFinding ?? null,
      record.securityFinding ?? null,
      record.resolutionPatchHash ?? null,
      record.outcome,
      createdAt
    );

    return { id, createdAt, ...record };
  }

  public static deleteMemory(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM verification_memory WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private static mapRowToRecord(r: any): VerificationMemoryRecord {
    return {
      id: r.id,
      repositoryId: r.repository_id,
      defectPattern: r.defect_pattern,
      bugDescription: r.bug_description,
      rootCause: r.root_cause,
      failedPatchSummary: r.failed_patch_summary,
      counterexampleInput: r.counterexample_input,
      effectiveRegressionTest: r.effective_regression_test,
      mutationFinding: r.mutation_finding,
      securityFinding: r.security_finding,
      resolutionPatchHash: r.resolution_patch_hash,
      outcome: r.outcome,
      createdAt: r.created_at
    };
  }
}

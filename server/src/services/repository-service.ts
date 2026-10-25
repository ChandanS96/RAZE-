import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RepositoryMetadata } from '../types/index.js';
import { getDatabase } from '../db/database.js';

export class RepositoryService {
  private static workspaceRoot = process.cwd();

  public static initializeRepositories(): void {
    const db = getDatabase();
    const demoRepos: RepositoryMetadata[] = [
      {
        id: 'repo-pricing-service',
        name: 'pricing-service',
        description: 'High-throughput checkout pricing and discount computation engine (Deliberate defect #104 in calculateDiscount)',
        path: path.resolve(this.workspaceRoot, 'demo-repos', 'pricing-service'),
        isBundledDemo: true,
        defaultBranch: 'main',
        testCommand: 'npx tsx --test tests/pricing.test.ts',
        filesCount: 4
      },
      {
        id: 'repo-auth-guardian',
        name: 'auth-guardian',
        description: 'API Gateway token authentication and path security guard (Path traversal vulnerability demo)',
        path: path.resolve(this.workspaceRoot, 'demo-repos', 'auth-guardian'),
        isBundledDemo: true,
        defaultBranch: 'main',
        testCommand: 'npx tsx --test tests/token.test.ts',
        filesCount: 3
      }
    ];

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO repositories (id, name, description, path, is_bundled_demo, default_branch, test_command, files_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const repo of demoRepos) {
      insertStmt.run(
        repo.id,
        repo.name,
        repo.description,
        repo.path,
        repo.isBundledDemo ? 1 : 0,
        repo.defaultBranch,
        repo.testCommand,
        repo.filesCount,
        new Date().toISOString()
      );
    }
  }

  public static getAllRepositories(): RepositoryMetadata[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM repositories ORDER BY is_bundled_demo DESC, name ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      path: r.path,
      isBundledDemo: Boolean(r.is_bundled_demo),
      defaultBranch: r.default_branch,
      testCommand: r.test_command,
      filesCount: r.files_count
    }));
  }

  public static getRepositoryById(id: string): RepositoryMetadata | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM repositories WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      path: row.path,
      isBundledDemo: Boolean(row.is_bundled_demo),
      defaultBranch: row.default_branch,
      testCommand: row.test_command,
      filesCount: row.files_count
    };
  }

  public static getRepositoryFiles(repoId: string): Array<{ path: string; name: string; isDir: boolean; size: number }> {
    const repo = this.getRepositoryById(repoId);
    if (!repo || !fs.existsSync(repo.path)) {
      throw new Error(`Repository not found or directory inaccessible: ${repoId}`);
    }

    const results: Array<{ path: string; name: string; isDir: boolean; size: number }> = [];

    const walk = (currentDir: string, relativeDir: string = '') => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.join(relativeDir, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          results.push({ path: relPath, name: entry.name, isDir: true, size: 0 });
          walk(fullPath, relPath);
        } else {
          const stat = fs.statSync(fullPath);
          results.push({ path: relPath, name: entry.name, isDir: false, size: stat.size });
        }
      }
    };

    walk(repo.path);
    return results;
  }

  public static getFileContent(repoId: string, relativePath: string): { content: string; hash: string } {
    const repo = this.getRepositoryById(repoId);
    if (!repo) throw new Error(`Repository not found: ${repoId}`);

    // Path traversal safeguard
    const safeBase = path.resolve(repo.path);
    const resolvedPath = path.resolve(repo.path, relativePath);
    if (!resolvedPath.startsWith(safeBase)) {
      throw new Error(`Security Violation: Path traversal attempted outside repository root: ${relativePath}`);
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File does not exist: ${relativePath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { content, hash };
  }
}

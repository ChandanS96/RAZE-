import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface ShadowWorkspaceInfo {
  workspacePath: string;
  runId: string;
  attemptNumber: number;
  baseRepoPath: string;
  appliedPatchHash?: string;
  createdAt: string;
}

export class ShadowWorkspaceService {
  private static baseWorkspacesDir = path.resolve(process.cwd(), 'data', 'workspaces');

  private static ensureBaseDir(): void {
    if (!fs.existsSync(this.baseWorkspacesDir)) {
      fs.mkdirSync(this.baseWorkspacesDir, { recursive: true });
    }
  }

  /**
   * Creates an isolated shadow workspace by copying clean repository files
   */
  public static createShadowWorkspace(runId: string, attemptNumber: number, baseRepoPath: string): ShadowWorkspaceInfo {
    this.ensureBaseDir();
    const workspaceName = `shadow-${runId}-attempt-${attemptNumber}`;
    const workspacePath = path.join(this.baseWorkspacesDir, workspaceName);

    // If already exists, clear it first
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
    fs.mkdirSync(workspacePath, { recursive: true });

    // Copy repo files cleanly
    this.copyDirectoryRecursively(baseRepoPath, workspacePath);

    return {
      workspacePath,
      runId,
      attemptNumber,
      baseRepoPath,
      createdAt: new Date().toISOString()
    };
  }

  private static copyDirectoryRecursively(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
        continue;
      }

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectoryRecursively(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Applies a patch to the shadow workspace and returns the verified SHA-256 patch hash
   */
  public static applyPatch(
    workspacePath: string,
    relativeFilePath: string,
    newFileContent: string,
    unifiedDiff: string
  ): { patchHash: string; success: boolean; error?: string } {
    try {
      const targetPath = path.resolve(workspacePath, relativeFilePath);
      const safeRoot = path.resolve(workspacePath);

      if (!targetPath.startsWith(safeRoot)) {
        return {
          patchHash: '',
          success: false,
          error: `Security Violation: Patch attempts to modify file outside shadow workspace: ${relativeFilePath}`
        };
      }

      // Ensure directory exists
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      // Write patched content
      fs.writeFileSync(targetPath, newFileContent, 'utf-8');

      // Compute SHA-256 patch hash
      const patchHash = crypto.createHash('sha256').update(unifiedDiff.trim()).digest('hex');

      return {
        patchHash,
        success: true
      };
    } catch (err: any) {
      return {
        patchHash: '',
        success: false,
        error: `Failed to apply patch to shadow workspace: ${err.message}`
      };
    }
  }

  /**
   * Destroys the temporary shadow workspace
   */
  public static cleanupWorkspace(workspacePath: string): void {
    try {
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Could not delete shadow workspace at ${workspacePath}:`, err);
    }
  }
}

import { spawn } from 'node:child_process';
import path from 'node:path';

export interface TestExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  failedTests: Array<{ name: string; error: string; line?: number }>;
  timedOut: boolean;
  commandExecuted: string;
}

export class TestExecutorService {
  private static MAX_LOG_BYTES = 64 * 1024; // 64 KB limit

  public static async runTest(
    workspacePath: string,
    testRelativePath: string,
    timeoutMs: number = 15000
  ): Promise<TestExecutionResult> {
    const startTime = Date.now();
    const isWindows = process.platform === 'win32';
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';

    // Build command: npx tsx --test <relativePath>
    const args = ['tsx', '--test', testRelativePath];
    const commandExecuted = `${npxCmd} ${args.join(' ')}`;

    return new Promise((resolve) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let timedOut = false;

      const child = spawn(npxCmd, args, {
        cwd: workspacePath,
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          FORCE_COLOR: '0'
        }
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGTERM');
        } catch (e) {
          // Ignore
        }
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        if (stdoutBuffer.length < this.MAX_LOG_BYTES) {
          stdoutBuffer += chunk.toString();
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderrBuffer.length < this.MAX_LOG_BYTES) {
          stderrBuffer += chunk.toString();
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        const exitCode = timedOut ? -1 : (code ?? 1);

        const parsed = this.parseTestOutput(stdoutBuffer + '\n' + stderrBuffer);

        resolve({
          exitCode,
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          durationMs,
          totalTests: parsed.totalTests,
          passedCount: parsed.passedCount,
          failedCount: parsed.failedCount,
          failedTests: parsed.failedTests,
          timedOut,
          commandExecuted
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        resolve({
          exitCode: 1,
          stdout: stdoutBuffer,
          stderr: err.message,
          durationMs,
          totalTests: 0,
          passedCount: 0,
          failedCount: 1,
          failedTests: [{ name: 'Process Spawn Error', error: err.message }],
          timedOut: false,
          commandExecuted
        });
      });
    });
  }

  private static parseTestOutput(output: string): {
    totalTests: number;
    passedCount: number;
    failedCount: number;
    failedTests: Array<{ name: string; error: string; line?: number }>;
  } {
    let totalTests = 0;
    let passedCount = 0;
    let failedCount = 0;
    const failedTests: Array<{ name: string; error: string; line?: number }> = [];

    // Parse node:test summary line e.g. "ℹ tests 6", "ℹ pass 5", "ℹ fail 1"
    const totalMatch = output.match(/ℹ tests\s+(\d+)/);
    const passMatch = output.match(/ℹ pass\s+(\d+)/);
    const failMatch = output.match(/ℹ fail\s+(\d+)/);

    if (totalMatch) totalTests = parseInt(totalMatch[1], 10);
    if (passMatch) passedCount = parseInt(passMatch[1], 10);
    if (failMatch) failedCount = parseInt(failMatch[1], 10);

    // If no summary was matched, count ✔ and ✖ markers
    if (totalTests === 0) {
      const passes = (output.match(/[✔√]/g) || []).length;
      const fails = (output.match(/[✖×]/g) || []).length;
      passedCount = passes;
      failedCount = fails;
      totalTests = passes + fails;
    }

    // Extract failed test details
    const failBlocks = output.split(/✖ failing tests:/i);
    if (failBlocks.length > 1) {
      const details = failBlocks[1];
      const testLines = details.split('\n');
      let currentTest = '';
      let currentError = '';

      for (const line of testLines) {
        const clean = line.trim();
        if (clean.startsWith('✖')) {
          if (currentTest) {
            failedTests.push({ name: currentTest, error: currentError.trim() });
          }
          currentTest = clean.replace(/^✖\s*/, '');
          currentError = '';
        } else if (clean.startsWith('AssertionError') || clean.startsWith('Error:')) {
          currentError += clean + ' ';
        }
      }
      if (currentTest) {
        failedTests.push({ name: currentTest, error: currentError.trim() });
      }
    }

    return { totalTests, passedCount, failedCount, failedTests };
  }
}

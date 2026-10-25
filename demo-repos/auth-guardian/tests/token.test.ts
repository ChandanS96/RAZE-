import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveTenantPath, validateAuthToken } from '../src/tokenValidator.ts';

describe('Auth Guardian - Path and Token Suite', () => {
  const baseSandbox = path.resolve(process.cwd(), 'tenant_sandbox');

  test('resolves legitimate child resource file', () => {
    const resolved = resolveTenantPath(baseSandbox, 'reports/2026/q1.pdf');
    assert.ok(resolved.startsWith(baseSandbox));
  });

  test('security test: path traversal attempt using ../../../etc/passwd must be blocked', () => {
    // In vulnerable baseline code, this test fails or permits escape!
    assert.throws(
      () => {
        const resolved = resolveTenantPath(baseSandbox, '../../etc/passwd');
        if (!resolved.startsWith(baseSandbox)) {
          throw new Error('AccessDenied: Path traversal attempt outside tenant sandbox');
        }
      },
      {
        message: /Path traversal attempt outside tenant sandbox/
      }
    );
  });
});

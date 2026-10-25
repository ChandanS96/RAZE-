/**
 * Auth Guardian - Gateway Token & Resource Path Security Guard
 * 
 * OpenGuard Demo Repository 2: Demonstrates Security Circuit Breaker,
 * Path Traversal Detection, and Secret Redaction.
 */

import path from 'node:path';

export interface TokenClaims {
  sub: string;
  role: string;
  exp: number;
}

/**
 * Resolves safe tenant resource path inside the tenant storage sandbox.
 * 
 * DEFECT NOTE: In baseline, fails to sanitize relative directory traversal (`../`)
 * and does not check if resolved path escapes the base tenant directory!
 */
export function resolveTenantPath(baseDir: string, userPath: string): string {
  // DELIBERATE SECURITY VULNERABILITY:
  // Directly joins without checking for traversal outside baseDir!
  const targetPath = path.resolve(baseDir, userPath);
  return targetPath;
}

/**
 * Validates bearer token signature and expiration.
 */
export function validateAuthToken(token: string, secretKey: string): { valid: boolean; claims?: TokenClaims; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid format' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed JWT structure' };
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { valid: false, error: 'Token has expired' };
    }
    return { valid: true, claims: payload };
  } catch (err: any) {
    return { valid: false, error: 'Failed to decode token claims' };
  }
}

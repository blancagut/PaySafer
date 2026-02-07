/**
 * Webhook Logging Utilities
 * 
 * NO BUSINESS LOGIC - Logging infrastructure only
 * 
 * SECURITY RULES:
 * - NEVER log full payloads
 * - NEVER log signatures or secrets
 * - ONLY log safe, non-sensitive metadata
 */

import type { WebhookLogEntry, VerificationStatus } from './types';

// ============================================================================
// LOG ENTRY CREATION
// ============================================================================

/**
 * Create a safe log entry for webhook events.
 * 
 * SECURITY: This function deliberately excludes sensitive data.
 */
export function createLogEntry(params: {
  eventId: string | null;
  eventType: string | null;
  verificationStatus: VerificationStatus;
  ipAddress: string | null;
  userAgent: string | null;
  startTime: number;
}): WebhookLogEntry {
  return {
    timestamp: new Date().toISOString(),
    eventId: params.eventId,
    eventType: params.eventType,
    verificationStatus: params.verificationStatus,
    ipAddress: sanitizeIpAddress(params.ipAddress),
    userAgent: truncateUserAgent(params.userAgent),
    processingTimeMs: Date.now() - params.startTime,
  };
}

// ============================================================================
// LOG OUTPUT
// ============================================================================

/**
 * Log webhook verification success.
 * 
 * Output: Structured JSON for log aggregation services.
 */
export function logVerificationSuccess(entry: WebhookLogEntry): void {
  console.log(JSON.stringify({
    level: 'info',
    category: 'webhook',
    action: 'verification_success',
    ...entry,
  }));
}

/**
 * Log webhook verification failure.
 * 
 * Output: Structured JSON with failure reason.
 */
export function logVerificationFailure(
  entry: WebhookLogEntry,
  reason: string
): void {
  console.warn(JSON.stringify({
    level: 'warn',
    category: 'webhook',
    action: 'verification_failure',
    reason,
    ...entry,
  }));
}

/**
 * Log webhook intake error.
 */
export function logIntakeError(
  error: string,
  ipAddress: string | null,
  startTime: number
): void {
  console.error(JSON.stringify({
    level: 'error',
    category: 'webhook',
    action: 'intake_error',
    error,
    ipAddress: sanitizeIpAddress(ipAddress),
    timestamp: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime,
  }));
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize IP address for logging.
 * Only allows valid IPv4/IPv6 format, rejects anything suspicious.
 */
function sanitizeIpAddress(ip: string | null): string | null {
  if (!ip) return null;
  
  // Basic IPv4/IPv6 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([a-fA-F0-9:]+)$/;
  
  // Handle forwarded header format (first IP)
  const firstIp = ip.split(',')[0]?.trim();
  
  if (!firstIp) return null;
  
  if (ipv4Regex.test(firstIp) || ipv6Regex.test(firstIp)) {
    return firstIp;
  }
  
  return '[redacted]';
}

/**
 * Truncate user agent to prevent log bloat.
 */
function truncateUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  
  const maxLength = 200;
  if (userAgent.length <= maxLength) {
    return userAgent;
  }
  
  return userAgent.substring(0, maxLength) + '...';
}

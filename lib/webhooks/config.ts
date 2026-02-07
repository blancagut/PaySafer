/**
 * Webhook Configuration
 * 
 * NO BUSINESS LOGIC - Configuration only
 */

import type { WebhookConfig } from './types';

// ============================================================================
// ENVIRONMENT VARIABLE LOADING
// ============================================================================

/**
 * Load webhook configuration from environment variables.
 * 
 * SECURITY:
 * - Signing secret MUST be set in production
 * - Throws if secret is missing (fail secure)
 */
export function loadWebhookConfig(): WebhookConfig {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!signingSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET environment variable is not set. ' +
      'Webhook signature verification cannot proceed.'
    );
  }

  return {
    signingSecret,
    timestampToleranceSeconds: getTimestampTolerance(),
    signatureHeader: 'stripe-signature',
  };
}

/**
 * Get timestamp tolerance from environment or use default.
 * 
 * Default: 300 seconds (5 minutes)
 * Minimum: 60 seconds (1 minute)
 * Maximum: 600 seconds (10 minutes)
 */
function getTimestampTolerance(): number {
  const envValue = process.env.WEBHOOK_TIMESTAMP_TOLERANCE;
  
  if (!envValue) {
    return 300; // 5 minutes default
  }
  
  const parsed = parseInt(envValue, 10);
  
  if (isNaN(parsed)) {
    return 300;
  }
  
  // Enforce bounds
  return Math.min(Math.max(parsed, 60), 600);
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate webhook configuration at startup.
 */
export function validateConfig(config: WebhookConfig): void {
  if (!config.signingSecret || config.signingSecret.length < 20) {
    throw new Error('Webhook signing secret is too short or missing');
  }
  
  if (config.timestampToleranceSeconds < 60) {
    throw new Error('Timestamp tolerance must be at least 60 seconds');
  }
}

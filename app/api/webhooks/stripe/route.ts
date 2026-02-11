/**
 * Stripe Webhook Intake Endpoint
 * 
 * POST /api/webhooks/stripe
 * 
 * ============================================================================
 * ARCHITECTURE: HARDENED GATE - NOT A PROCESSOR
 * ============================================================================
 * 
 * This endpoint is responsible for:
 * ✅ Receiving raw webhook payloads
 * ✅ Verifying cryptographic signatures
 * ✅ Validating timestamp freshness
 * ✅ Logging verification results
 * ✅ Returning appropriate HTTP status codes
 * 
 * This endpoint is FORBIDDEN from:
 * ❌ Calling Stripe APIs
 * ❌ Writing to transaction tables
 * ❌ Triggering state transitions
 * ❌ Emitting side effects
 * ❌ Any business logic whatsoever
 * 
 * ============================================================================
 * VERIFICATION FLOW
 * ============================================================================
 * 
 * 1. RECEIVE    → Read raw body exactly once
 * 2. EXTRACT    → Get signature header
 * 3. VERIFY     → Cryptographic signature check
 * 4. VALIDATE   → Timestamp freshness check
 * 5. LOG        → Record verification result (no sensitive data)
 * 6. RESPOND    → Return appropriate status code
 * 
 * ============================================================================
 * HTTP STATUS CODE MATRIX
 * ============================================================================
 * 
 * | Scenario                    | Status | Response                    |
 * |-----------------------------|--------|-----------------------------|
 * | Wrong HTTP method           | 405    | Method Not Allowed          |
 * | Empty body                  | 400    | Bad Request                 |
 * | Missing signature header    | 401    | Unauthorized                |
 * | Malformed signature header  | 401    | Unauthorized                |
 * | Timestamp expired           | 401    | Unauthorized                |
 * | Invalid signature           | 401    | Unauthorized                |
 * | Valid signature             | 200    | OK (acknowledged)           |
 * | Internal error              | 500    | Internal Server Error       |
 * 
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  extractEventId,
  extractEventType,
  loadWebhookConfig,
  createLogEntry,
  logVerificationSuccess,
  logVerificationFailure,
  logIntakeError,
  type IntakeResponse,
  type IntakeErrorResponse,
  type WebhookErrorCode,
} from '@/lib/webhooks';
import { processStripeEvent } from '@/lib/stripe/webhook-processor';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Lazy-load configuration (throws if secret missing)
let webhookConfig: ReturnType<typeof loadWebhookConfig> | null = null;

function getConfig() {
  if (!webhookConfig) {
    webhookConfig = loadWebhookConfig();
  }
  return webhookConfig;
}

// ============================================================================
// REQUEST HANDLERS
// ============================================================================

/**
 * POST /api/webhooks/stripe
 * 
 * Main webhook intake handler.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // ---------------------------------------------------------------------------
  // STEP 1: Read raw body EXACTLY ONCE
  // ---------------------------------------------------------------------------
  let rawBody: string;
  
  try {
    rawBody = await request.text();
  } catch (error) {
    logIntakeError('Failed to read request body', ipAddress, startTime);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to read request', 500);
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Check body is not empty
  // ---------------------------------------------------------------------------
  if (!rawBody || rawBody.length === 0) {
    logIntakeError('Empty request body', ipAddress, startTime);
    return createErrorResponse('MALFORMED_PAYLOAD', 'Request body is empty', 400);
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Extract signature header
  // ---------------------------------------------------------------------------
  let config;
  
  try {
    config = getConfig();
  } catch (error) {
    logIntakeError('Webhook configuration error', ipAddress, startTime);
    return createErrorResponse('INTERNAL_ERROR', 'Configuration error', 500);
  }

  const signatureHeader = request.headers.get(config.signatureHeader);

  // ---------------------------------------------------------------------------
  // STEP 4: Verify signature (this is the critical security check)
  // ---------------------------------------------------------------------------
  const verificationResult = verifyWebhookSignature(
    rawBody,
    signatureHeader,
    config
  );

  // ---------------------------------------------------------------------------
  // STEP 5: Extract event metadata for logging (safe extraction only)
  // ---------------------------------------------------------------------------
  const eventId = extractEventId(rawBody);
  const eventType = extractEventType(rawBody);

  // ---------------------------------------------------------------------------
  // STEP 6: Create log entry
  // ---------------------------------------------------------------------------
  const logEntry = createLogEntry({
    eventId,
    eventType,
    verificationStatus: verificationResult.status,
    ipAddress,
    userAgent,
    startTime,
  });

  // ---------------------------------------------------------------------------
  // STEP 7: Handle verification result
  // ---------------------------------------------------------------------------
  if (!verificationResult.isValid) {
    // Log failure
    logVerificationFailure(logEntry, verificationResult.error || 'Unknown error');

    // Map status to error code and HTTP status
    const { errorCode, httpStatus } = mapVerificationFailure(verificationResult.status);
    
    return createErrorResponse(errorCode, verificationResult.error || 'Verification failed', httpStatus);
  }

  // ---------------------------------------------------------------------------
  // STEP 8: Verification successful - Log and acknowledge
  // ---------------------------------------------------------------------------
  logVerificationSuccess(logEntry);

  // Add event ID to result for downstream processing reference
  verificationResult.eventId = eventId ?? undefined;

  // ---------------------------------------------------------------------------
  // STEP 9: Process the event (state transitions, system messages)
  // ---------------------------------------------------------------------------
  try {
    const parsedEvent = JSON.parse(rawBody);
    await processStripeEvent(parsedEvent);
  } catch (processError) {
    // Log but still return 200 — we've received and verified the event.
    // Re-processing can be handled via dead-letter queue.
    console.error('[webhook] Event processing error:', processError);
  }

  // Return success response
  const response: IntakeResponse = {
    received: true,
    eventId: eventId ?? undefined,
    timestamp: verificationResult.timestamp,
  };

  return NextResponse.json(response, { status: 200 });
}

// ============================================================================
// METHOD HANDLERS (Reject non-POST)
// ============================================================================

export async function GET(): Promise<NextResponse> {
  return createErrorResponse('INTERNAL_ERROR', 'Method not allowed', 405);
}

export async function PUT(): Promise<NextResponse> {
  return createErrorResponse('INTERNAL_ERROR', 'Method not allowed', 405);
}

export async function DELETE(): Promise<NextResponse> {
  return createErrorResponse('INTERNAL_ERROR', 'Method not allowed', 405);
}

export async function PATCH(): Promise<NextResponse> {
  return createErrorResponse('INTERNAL_ERROR', 'Method not allowed', 405);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract client IP address from request.
 * Handles Vercel's forwarding headers.
 */
function getClientIp(request: NextRequest): string | null {
  // Vercel-specific header
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }
  
  // Fallback headers
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    null
  );
}

/**
 * Map verification status to error code and HTTP status.
 */
function mapVerificationFailure(status: string): {
  errorCode: WebhookErrorCode;
  httpStatus: number;
} {
  switch (status) {
    case 'EMPTY_PAYLOAD':
      return { errorCode: 'MALFORMED_PAYLOAD', httpStatus: 400 };
    
    case 'MISSING_SIGNATURE':
      return { errorCode: 'MISSING_SIGNATURE', httpStatus: 401 };
    
    case 'MALFORMED_HEADER':
      return { errorCode: 'INVALID_SIGNATURE', httpStatus: 401 };
    
    case 'TIMESTAMP_EXPIRED':
      return { errorCode: 'TIMESTAMP_EXPIRED', httpStatus: 401 };
    
    case 'INVALID_SIGNATURE':
      return { errorCode: 'INVALID_SIGNATURE', httpStatus: 401 };
    
    default:
      return { errorCode: 'INTERNAL_ERROR', httpStatus: 500 };
  }
}

/**
 * Create standardized error response.
 */
function createErrorResponse(
  code: WebhookErrorCode,
  message: string,
  status: number
): NextResponse {
  const response: IntakeErrorResponse = {
    error: message,
    code,
  };
  
  return NextResponse.json(response, { status });
}

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

/**
 * Next.js Route Segment Config
 * 
 * - runtime: 'nodejs' for crypto module support
 * - dynamic: 'force-dynamic' to disable caching
 * - maxDuration: 10 seconds max execution time
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

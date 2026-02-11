// =============================================================================
// Shared AI Types — Lean MVP
// =============================================================================

/** Scam pattern categories */
export type ScamPatternType =
  | 'off_platform_request'
  | 'fake_delivery_proof'
  | 'phishing_link'
  | 'pressure_tactics'
  | 'impersonation'
  | 'social_engineering'
  | 'advance_fee'
  | 'overpayment'
  | 'none'

// =============================================================================
// AI Response Shapes
// =============================================================================

export interface ScamDetectionResult {
  is_suspicious: boolean
  confidence: number // 0-1
  pattern_type: ScamPatternType
  explanation: string
}

export interface OfferOptimizationResult {
  improved_title: string
  improved_description: string
  suggested_category: string
  improvements_made: string[]
}

export interface SupportAgentResult {
  response: string
  confidence: number // 0-1
  should_escalate: boolean
  escalation_reason?: string
  category: string
}

export interface TranslationResult {
  translated_text: string
  source_language?: string
}

// =============================================================================
// AI Usage Logging
// =============================================================================

export interface AIUsageLog {
  feature: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  user_id?: string
  metadata?: Record<string, unknown>
}

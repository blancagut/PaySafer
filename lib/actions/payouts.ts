'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Re-export shared types (these are imported from the non-server module)
export type { PayoutMethodType, PayoutMethod, PayoutRequest } from '@/lib/payout-utils'
import type { PayoutMethodType, PayoutMethod, PayoutRequest } from '@/lib/payout-utils'

// ─── Fee Calculation ───

export async function calculatePayoutFee(amount: number, methodType: string): Promise<number> {
  if (amount <= 0) return 0
  switch (methodType) {
    case 'bank_transfer':
      return Math.max(0.50, amount * 0.001)          // 0.1% min €0.50 — 1-3 days
    case 'bank_transfer_international':
      return Math.max(2.00, amount * 0.003)          // 0.3% min €2.00 — 2-5 days
    case 'paypal':
      return Math.max(1.00, amount * 0.005)          // 0.5% min €1.00 — instant
    case 'card_express':
      return Math.max(1.50, amount * 0.015)          // 1.5% min €1.50 — instant
    case 'card_standard':
      return Math.max(0.75, amount * 0.005)          // 0.5% min €0.75 — 1-2 days
    case 'western_union':
      return Math.max(3.00, amount * 0.018)          // 1.8% min €3.00 — same day
    case 'moneygram':
      return Math.max(2.50, amount * 0.015)          // 1.5% min €2.50 — same day
    case 'crypto':
      return 2.00                                     // Flat €2.00 — ~15 min
    case 'stripe':
      return Math.max(0.50, amount * 0.001)          // 0.1% min €0.50
    default:
      return Math.max(0.50, amount * 0.001)
  }
}



// ─── Get Payout Methods ───

export async function getPayoutMethods() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('payout_methods')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as PayoutMethod[] }
}

// ─── Add Payout Method ───

export async function addPayoutMethod(input: {
  type: PayoutMethodType
  label: string
  last4?: string
  bankName?: string
  routingNumber?: string
  isDefault?: boolean
  recipientName?: string
  city?: string
  country?: string
  cryptoAddress?: string
  cryptoNetwork?: string
  cryptoCurrency?: string
  iban?: string
  swiftCode?: string
  cardId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { count } = await supabase
    .from('payout_methods')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= 10) return { error: 'Maximum 10 payout methods allowed' }

  // Validation per type
  if ((input.type === 'western_union' || input.type === 'moneygram') && !input.recipientName) {
    return { error: 'Recipient name is required for cash pickup' }
  }
  if ((input.type === 'western_union' || input.type === 'moneygram') && !input.city) {
    return { error: 'City is required for cash pickup' }
  }
  if ((input.type === 'western_union' || input.type === 'moneygram') && !input.country) {
    return { error: 'Country is required for cash pickup' }
  }
  if (input.type === 'crypto' && !input.cryptoAddress) {
    return { error: 'Wallet address is required for crypto payouts' }
  }
  if (input.type === 'crypto' && !input.cryptoNetwork) {
    return { error: 'Network is required for crypto payouts' }
  }
  if (input.type === 'crypto' && !input.cryptoCurrency) {
    return { error: 'Cryptocurrency is required' }
  }
  if (input.type === 'bank_transfer_international' && !input.iban) {
    return { error: 'IBAN is required for international transfers' }
  }
  if (input.type === 'bank_transfer_international' && !input.swiftCode) {
    return { error: 'SWIFT/BIC code is required for international transfers' }
  }

  const { data, error } = await supabase
    .from('payout_methods')
    .insert({
      user_id: user.id,
      type: input.type,
      label: input.label,
      last4: input.last4 || null,
      bank_name: input.bankName || null,
      routing_number: input.routingNumber || null,
      is_default: input.isDefault ?? false,
      recipient_name: input.recipientName || null,
      city: input.city || null,
      country: input.country || null,
      crypto_address: input.cryptoAddress || null,
      crypto_network: input.cryptoNetwork || null,
      crypto_currency: input.cryptoCurrency || null,
      iban: input.iban || null,
      swift_code: input.swiftCode || null,
      card_id: input.cardId || null,
      metadata: input.metadata || {},
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/payouts')
  return { data: data as PayoutMethod }
}

// ─── Remove Payout Method ───

export async function removePayoutMethod(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { count } = await admin
    .from('payout_requests')
    .select('id', { count: 'exact', head: true })
    .eq('payout_method_id', id)
    .in('status', ['pending', 'processing'])

  if ((count || 0) > 0) {
    return { error: 'Cannot remove a method with pending payouts' }
  }

  const { error } = await supabase
    .from('payout_methods')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/payouts')
  return { data: { success: true } }
}

// ─── Set Default Payout Method ───

export async function setDefaultPayoutMethod(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('payout_methods')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/payouts')
  return { data: { success: true } }
}

// ─── Get Payout History ───

export async function getPayoutHistory(filters?: {
  status?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  let query = supabase
    .from('payout_requests')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.limit) query = query.limit(filters.limit)
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)

  const { data, error, count } = await query

  if (error) return { error: error.message }
  return { data: data as PayoutRequest[], total: count || 0 }
}

// ─── Get Payout Stats ───

export async function getPayoutStats() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance, currency')
    .eq('user_id', user.id)
    .single()

  const { data: payouts } = await supabase
    .from('payout_requests')
    .select('amount, fee, status')
    .eq('user_id', user.id)

  const pending = (payouts || [])
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const totalPaidOut = (payouts || [])
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const totalFees = (payouts || [])
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.fee), 0)

  return {
    data: {
      availableBalance: Number(wallet?.balance ?? 0),
      currency: wallet?.currency ?? 'EUR',
      pendingPayouts: pending,
      totalPaidOut,
      totalFees,
    }
  }
}

// ─── Generate Cash Pickup Reference ───

function generatePickupReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = ''
  for (let i = 0; i < 10; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return ref
}

// ─── Send Cash Pickup Email ───

async function sendCashPickupEmail(userId: string, details: {
  provider: 'Western Union' | 'MoneyGram'
  reference: string
  recipientName: string
  city: string
  country: string
  netAmount: number
  fee: number
  currency: string
}) {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    if (!process.env.RESEND_API_KEY) return

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    if (!profile?.email) return

    const isWU = details.provider === 'Western Union'
    const providerColor = isWU ? '#FFDD00' : '#1A1F71'
    const providerBg = isWU ? '#000000' : '#FFFFFF'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#111827,#1f2937);border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
      <div style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="display:inline-block;padding:8px 20px;border-radius:8px;background:${providerBg};margin-bottom:16px;">
          <span style="font-size:16px;font-weight:700;color:${providerColor};">${details.provider}</span>
        </div>
        <h1 style="color:#10b981;font-size:24px;margin:8px 0 4px;">Your Cash is Ready for Pickup!</h1>
        <p style="color:#9ca3af;font-size:14px;margin:0;">Hi ${profile.full_name || 'there'}, your withdrawal has been processed.</p>
      </div>
      <div style="padding:24px 32px;text-align:center;">
        <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Reference Code</p>
        <div style="background:rgba(16,185,129,0.1);border:2px dashed rgba(16,185,129,0.3);border-radius:12px;padding:16px;margin-bottom:24px;">
          <span style="font-size:28px;font-weight:800;color:#10b981;letter-spacing:3px;font-family:'Courier New',monospace;">${details.reference}</span>
        </div>
      </div>
      <div style="padding:0 32px 24px;">
        <div style="background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Recipient Name</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;text-align:right;">${details.recipientName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid rgba(255,255,255,0.04);">Pickup City</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;text-align:right;border-top:1px solid rgba(255,255,255,0.04);">${details.city}, ${details.country}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid rgba(255,255,255,0.04);">Amount to Collect</td><td style="padding:8px 0;color:#10b981;font-size:15px;font-weight:700;text-align:right;border-top:1px solid rgba(255,255,255,0.04);">\u20AC${details.netAmount.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid rgba(255,255,255,0.04);">Processing Fee</td><td style="padding:8px 0;color:#9ca3af;font-size:13px;text-align:right;border-top:1px solid rgba(255,255,255,0.04);">\u20AC${details.fee.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid rgba(255,255,255,0.04);">Provider</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;text-align:right;border-top:1px solid rgba(255,255,255,0.04);">${details.provider}</td></tr>
          </table>
        </div>
      </div>
      <div style="padding:0 32px 32px;">
        <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:12px;padding:20px;">
          <p style="color:#f59e0b;font-size:13px;font-weight:600;margin:0 0 12px;">What to bring:</p>
          <ul style="color:#d1d5db;font-size:12px;margin:0;padding-left:16px;line-height:1.8;">
            <li>Government-issued photo ID (passport, national ID, or driver's license)</li>
            <li>The reference code shown above</li>
            <li>Recipient name must match the ID exactly: <strong>${details.recipientName}</strong></li>
          </ul>
          <p style="color:#9ca3af;font-size:11px;margin:16px 0 0;padding-top:12px;border-top:1px solid rgba(245,158,11,0.1);">
            Visit any ${details.provider} agent location in <strong>${details.city}, ${details.country}</strong> to collect your cash.
            ${isWU ? 'Find locations at westernunion.com.' : 'Find locations at moneygram.com.'}
          </p>
        </div>
      </div>
      <div style="padding:20px 32px;background:rgba(0,0,0,0.2);text-align:center;border-top:1px solid rgba(255,255,255,0.04);">
        <p style="color:#4b5563;font-size:11px;margin:0;">This is an automated message from PaySafer. Do not share your reference code with anyone.</p>
      </div>
    </div>
  </div>
</body>
</html>`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'PaySafer <notifications@paysafer.app>',
      to: profile.email,
      subject: `Your ${details.provider} Cash Pickup is Ready - ${details.reference}`,
      html,
    })
  } catch (err) {
    console.error('Failed to send cash pickup email:', err)
  }
}

// ─── Request Withdrawal ───

export async function requestWithdrawal(input: {
  amount: number
  payoutMethodId?: string
  note?: string
  // Direct method details (for inline wizard — no saved method needed)
  methodType?: PayoutMethodType
  methodLabel?: string
  // Cash pickup
  recipientName?: string
  city?: string
  country?: string
  // Crypto
  cryptoAddress?: string
  cryptoNetwork?: string
  cryptoCurrency?: string
  // International bank
  bankName?: string
  iban?: string
  swiftCode?: string
  routingNumber?: string
  accountNumber?: string
  // Card
  cardId?: string
  cardLast4?: string
  deliverySpeed?: 'express' | 'standard'
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  if (input.amount < 10) return { error: 'Minimum withdrawal is \u20AC10.00' }
  if (input.amount > 50000) return { error: 'Maximum withdrawal is \u20AC50,000.00' }

  let methodType: string = input.methodType || ''
  let methodLabel: string = input.methodLabel || ''
  let methodId: string | null = null

  // If using saved method
  if (input.payoutMethodId) {
    const { data: method } = await supabase
      .from('payout_methods')
      .select('*')
      .eq('id', input.payoutMethodId)
      .eq('user_id', user.id)
      .single()

    if (!method) return { error: 'Payout method not found' }
    methodType = method.type
    methodLabel = method.label
    methodId = method.id
  }

  if (!methodType) return { error: 'Payout method type is required' }

  // Get wallet and verify balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance, frozen')
    .eq('user_id', user.id)
    .single()

  if (!wallet) return { error: 'Wallet not found' }
  if (wallet.frozen) return { error: 'Wallet is frozen. Contact support.' }

  const fee = await calculatePayoutFee(input.amount, methodType)
  const netAmount = input.amount - fee

  if (input.amount > Number(wallet.balance)) {
    return { error: 'Insufficient balance' }
  }

  const admin = createAdminClient()

  // Debit the wallet
  const { error: debitError } = await admin.rpc('debit_wallet', {
    p_user_id: user.id,
    p_amount: input.amount,
    p_type: 'withdrawal',
    p_reference_type: 'fee',
    p_reference_id: null,
    p_description: `Withdrawal to ${methodLabel}`,
    p_metadata: { payout_method_id: methodId, fee },
  })

  if (debitError) {
    if (debitError.message.includes('function') || debitError.message.includes('does not exist')) {
      const newBalance = Number(wallet.balance) - input.amount
      if (newBalance < 0) return { error: 'Insufficient balance' }

      const { error: updateError } = await admin
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id)

      if (updateError) return { error: updateError.message }

      await admin.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount: input.amount,
        direction: 'debit',
        balance_after: newBalance,
        reference_type: 'fee',
        description: `Withdrawal to ${methodLabel}`,
        metadata: { fee },
      })
    } else {
      return { error: debitError.message }
    }
  }

  // Build pickup details for cash methods
  let pickupDetails: Record<string, unknown> = {}
  let reference: string | null = null

  if (methodType === 'western_union' || methodType === 'moneygram') {
    reference = generatePickupReference()
    pickupDetails = {
      reference,
      recipient_name: input.recipientName,
      city: input.city,
      country: input.country,
      provider: methodType === 'western_union' ? 'Western Union' : 'MoneyGram',
      instructions: 'Bring government-issued photo ID matching the recipient name.',
      created_at: new Date().toISOString(),
    }
  }

  if (methodType === 'crypto') {
    pickupDetails = {
      wallet_address: input.cryptoAddress,
      network: input.cryptoNetwork,
      currency: input.cryptoCurrency,
    }
  }

  // Create payout request
  const { data: payout, error: payoutError } = await admin
    .from('payout_requests')
    .insert({
      user_id: user.id,
      payout_method_id: methodId,
      amount: input.amount,
      currency: 'EUR',
      fee,
      net_amount: netAmount,
      status: 'pending',
      method_type: methodType,
      method_label: methodLabel,
      reference,
      note: input.note || null,
      pickup_details: Object.keys(pickupDetails).length > 0 ? pickupDetails : null,
      delivery_speed: input.deliverySpeed || null,
    })
    .select()
    .single()

  if (payoutError) return { error: payoutError.message }

  // Notification type based on method
  let notificationType = 'payout.requested'
  let notificationTitle = 'Withdrawal Requested'
  let notificationMessage = `Your withdrawal of \u20AC${input.amount.toFixed(2)} to ${methodLabel} is being processed.`

  if (methodType === 'western_union' || methodType === 'moneygram') {
    notificationType = 'payout.cash_ready'
    const providerName = methodType === 'western_union' ? 'Western Union' : 'MoneyGram'
    notificationTitle = `${providerName} Cash Pickup Ready`
    notificationMessage = `Your cash pickup of \u20AC${netAmount.toFixed(2)} is ready! Reference: ${reference}. Collect at any ${providerName} location in ${input.city}, ${input.country}. Recipient: ${input.recipientName}.`
  }

  // Insert in-app notification
  await admin.from('notifications').insert({
    user_id: user.id,
    type: notificationType,
    title: notificationTitle,
    message: notificationMessage,
    reference_type: 'payout',
    reference_id: payout.id,
  })

  // Send email for cash pickup
  if ((methodType === 'western_union' || methodType === 'moneygram') && reference) {
    sendCashPickupEmail(user.id, {
      provider: methodType === 'western_union' ? 'Western Union' : 'MoneyGram',
      reference,
      recipientName: input.recipientName || '',
      city: input.city || '',
      country: input.country || '',
      netAmount,
      fee,
      currency: 'EUR',
    }).catch(console.error) // fire-and-forget
  }

  revalidatePath('/payouts')
  revalidatePath('/wallet')
  return { data: payout as PayoutRequest }
}

// ─── Cancel Payout ───

export async function cancelPayout(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: payout } = await admin
    .from('payout_requests')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!payout) return { error: 'Payout not found' }
  if (payout.status !== 'pending') return { error: 'Only pending payouts can be cancelled' }

  const { error: creditError } = await admin.rpc('credit_wallet', {
    p_user_id: user.id,
    p_amount: Number(payout.amount),
    p_type: 'escrow_refund',
    p_reference_type: 'fee',
    p_reference_id: payout.id,
    p_description: `Withdrawal cancelled \u2014 funds returned`,
    p_metadata: { payout_id: payout.id },
  })

  if (creditError) {
    const { data: wallet } = await admin
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single()

    if (wallet) {
      const newBalance = Number(wallet.balance) + Number(payout.amount)
      await admin.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)
      await admin.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'escrow_refund',
        amount: Number(payout.amount),
        direction: 'credit',
        balance_after: newBalance,
        reference_type: 'fee',
        reference_id: payout.id,
        description: 'Withdrawal cancelled \u2014 funds returned',
      })
    }
  }

  const { error } = await admin
    .from('payout_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/payouts')
  revalidatePath('/wallet')
  return { data: { success: true } }
}

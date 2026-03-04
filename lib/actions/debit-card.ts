"use server";

import { createClient } from "@/lib/supabase/server";

/* ── Types ── */
export interface DebitCard {
  id: string;
  tier: "standard" | "gold" | "platinum";
  last4: string;
  expiry: string;
  status: "active" | "frozen" | "inactive" | "expired";
  cardType: "virtual" | "physical";
  dailyLimit: number;
  monthlyLimit: number;
  atmLimit: number;
  contactless: boolean;
  onlinePurchases: boolean;
  internationalPayments: boolean;
  magStripe: boolean;
}

/* ── Helpers ── */
function mapRow(r: Record<string, unknown>): DebitCard {
  return {
    id: r.id as string,
    tier: r.tier as DebitCard["tier"],
    last4: r.last4 as string,
    expiry: r.expiry as string,
    status: r.status as DebitCard["status"],
    cardType: r.card_type as DebitCard["cardType"],
    dailyLimit: r.daily_limit as number,
    monthlyLimit: r.monthly_limit as number,
    atmLimit: r.atm_limit as number,
    contactless: r.contactless as boolean,
    onlinePurchases: r.online_purchases as boolean,
    internationalPayments: r.international_payments as boolean,
    magStripe: r.mag_stripe as boolean,
  };
}

/* ── Get primary card ── */
export async function getDebitCard(): Promise<DebitCard | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("debit_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

/* ── Freeze / unfreeze ── */
export async function toggleFreezeCard(
  cardId: string
): Promise<{ success: boolean; newStatus: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, newStatus: "" };

  // Fetch current status
  const { data: card } = await supabase
    .from("debit_cards")
    .select("status")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!card) return { success: false, newStatus: "" };

  const newStatus = card.status === "frozen" ? "active" : "frozen";

  const { error } = await supabase
    .from("debit_cards")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("user_id", user.id);

  return { success: !error, newStatus };
}

/* ── Toggle a boolean security setting ── */
export async function toggleCardSetting(
  cardId: string,
  setting: "contactless" | "online_purchases" | "international_payments" | "mag_stripe"
): Promise<{ success: boolean; newValue: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, newValue: false };

  const { data: card } = await supabase
    .from("debit_cards")
    .select("contactless, online_purchases, international_payments, mag_stripe")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!card) return { success: false, newValue: false };

  const current = (card as Record<string, boolean>)[setting];
  const newValue = !current;

  const { error } = await supabase
    .from("debit_cards")
    .update({ [setting]: newValue, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("user_id", user.id);

  return { success: !error, newValue };
}

/* ── Replace card (request) ── */
export async function replaceCard(
  cardId: string,
  reason: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  // Mark current card inactive and create a replacement with new last4
  const newLast4 = String(Math.floor(1000 + Math.random() * 9000));

  const { data: oldCard } = await supabase
    .from("debit_cards")
    .select("tier, card_type, daily_limit, monthly_limit, atm_limit")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!oldCard) return { success: false };

  // Deactivate old
  await supabase
    .from("debit_cards")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("user_id", user.id);

  // Create replacement
  const expiry = `${String(new Date().getMonth() + 1).padStart(2, "0")}/${String(
    new Date().getFullYear() + 4
  ).slice(-2)}`;

  const { error } = await supabase.from("debit_cards").insert({
    user_id: user.id,
    tier: oldCard.tier,
    last4: newLast4,
    expiry,
    status: "active",
    card_type: oldCard.card_type,
    daily_limit: oldCard.daily_limit,
    monthly_limit: oldCard.monthly_limit,
    atm_limit: oldCard.atm_limit,
  });

  return { success: !error };
}

/* ── Change PIN (stub — actual PIN change would go through card processor) ── */
export async function changePin(
  cardId: string,
  _currentPin: string,
  _newPin: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify card belongs to user
  const { data: card } = await supabase
    .from("debit_cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!card) return { success: false, error: "Card not found" };

  // In production, this would call the card processor API.
  // We just update the timestamp to indicate a PIN change was requested.
  const { error } = await supabase
    .from("debit_cards")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("user_id", user.id);

  return { success: !error };
}

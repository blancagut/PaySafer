"use server";

import { createClient } from "@/lib/supabase/server";

/* ── Types ── */
export interface RewardsSummary {
  currentTier: "standard" | "gold" | "platinum";
  totalEarned: number;
  thisMonth: number;
  pendingCashback: number;
}

export interface CashbackTransaction {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  cashback: number;
  rate: string;
  date: string;
  status: "credited" | "pending";
}

/* ── Get rewards data ── */
export async function getRewardsData(): Promise<{
  summary: RewardsSummary;
  history: CashbackTransaction[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultSummary: RewardsSummary = {
    currentTier: "standard",
    totalEarned: 0,
    thisMonth: 0,
    pendingCashback: 0,
  };

  if (!user) return { summary: defaultSummary, history: [] };

  // Get or create rewards row
  let { data: rewards } = await supabase
    .from("user_rewards")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rewards) {
    // Auto-create rewards record
    const { data: created } = await supabase
      .from("user_rewards")
      .insert({ user_id: user.id })
      .select()
      .single();
    rewards = created;
  }

  const summary: RewardsSummary = rewards
    ? {
        currentTier: rewards.current_tier as RewardsSummary["currentTier"],
        totalEarned: Number(rewards.total_earned ?? 0),
        thisMonth: Number(rewards.this_month ?? 0),
        pendingCashback: Number(rewards.pending_cashback ?? 0),
      }
    : defaultSummary;

  // Get cashback history
  const { data: txData } = await supabase
    .from("cashback_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const history: CashbackTransaction[] = (txData ?? []).map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      merchant: r.merchant as string,
      category: r.category as string,
      amount: Number(r.amount ?? 0),
      cashback: Number(r.cashback ?? 0),
      rate: r.rate as string,
      date: new Date(r.created_at as string).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: r.status as "credited" | "pending",
    })
  );

  return { summary, history };
}

/* ── Redeem cashback to wallet ── */
export async function redeemCashback(): Promise<{
  success: boolean;
  amount: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, amount: 0 };

  const { data: rewards } = await supabase
    .from("user_rewards")
    .select("this_month, total_earned")
    .eq("user_id", user.id)
    .single();

  if (!rewards || Number(rewards.this_month) <= 0)
    return { success: false, amount: 0 };

  const amount = Number(rewards.this_month);

  // Credit pending cashback transactions
  await supabase
    .from("cashback_transactions")
    .update({ status: "credited" })
    .eq("user_id", user.id)
    .eq("status", "pending");

  // Reset this_month, add to total
  const { error } = await supabase
    .from("user_rewards")
    .update({
      this_month: 0,
      pending_cashback: 0,
      total_earned: Number(rewards.total_earned) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return { success: !error, amount };
}

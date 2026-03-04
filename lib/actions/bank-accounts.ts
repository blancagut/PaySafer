"use server";

import { createClient } from "@/lib/supabase/server";

/* ── Types ── */
export interface BankAccount {
  id: string;
  nickname: string;
  bankName: string;
  accountType: "checking" | "savings";
  method: "ach" | "iban" | "plaid";
  last4: string;
  routingOrIban: string;
  currency: string;
  status: "verified" | "pending" | "failed";
  isDefault: boolean;
  addedAt: string;
}

function mapRow(r: Record<string, unknown>): BankAccount {
  return {
    id: r.id as string,
    nickname: r.nickname as string,
    bankName: r.bank_name as string,
    accountType: r.account_type as BankAccount["accountType"],
    method: r.method as BankAccount["method"],
    last4: r.last4 as string,
    routingOrIban: r.routing_or_iban as string,
    currency: r.currency as string,
    status: r.status as BankAccount["status"],
    isDefault: r.is_default as boolean,
    addedAt: (r.created_at as string).split("T")[0],
  };
}

/* ── List accounts ── */
export async function getBankAccounts(): Promise<BankAccount[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}

/* ── Add bank account ── */
export async function addBankAccount(input: {
  nickname: string;
  method: "ach" | "iban" | "plaid";
  last4: string;
  routingOrIban: string;
  currency: string;
  bankName: string;
}): Promise<{ success: boolean; account?: BankAccount }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  // Check if user has any accounts to decide isDefault
  const { count } = await supabase
    .from("bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      user_id: user.id,
      nickname: input.nickname || "New Account",
      bank_name: input.bankName,
      account_type: "checking",
      method: input.method,
      last4: input.last4,
      routing_or_iban: input.routingOrIban,
      currency: input.currency,
      status: input.method === "plaid" ? "verified" : "pending",
      is_default: (count ?? 0) === 0,
    })
    .select()
    .single();

  if (error || !data) return { success: false };
  return { success: true, account: mapRow(data as Record<string, unknown>) };
}

/* ── Set default account ── */
export async function setDefaultAccount(
  accountId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  // Unset all defaults
  await supabase
    .from("bank_accounts")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  // Set new default
  const { error } = await supabase
    .from("bank_accounts")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("user_id", user.id);

  return { success: !error };
}

/* ── Remove account ── */
export async function removeBankAccount(
  accountId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id);

  return { success: !error };
}

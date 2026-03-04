"use server";

import { createClient } from "@/lib/supabase/server";

/* ── Types ── */
export interface UserBill {
  id: string;
  billerName: string;
  categoryId: string;
  accountNumber: string;
  amount: number;
  dueDate: string | null;
  status: "due" | "paid" | "overdue" | "upcoming";
  autopay: boolean;
}

function mapRow(r: Record<string, unknown>): UserBill {
  return {
    id: r.id as string,
    billerName: r.biller_name as string,
    categoryId: r.category_id as string,
    accountNumber: r.account_number as string,
    amount: Number(r.amount ?? 0),
    dueDate: r.due_date as string | null,
    status: r.status as UserBill["status"],
    autopay: r.autopay as boolean,
  };
}

/* ── List bills ── */
export async function getBills(): Promise<UserBill[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_bills")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}

/* ── Add biller ── */
export async function addBill(bill: {
  billerName: string;
  categoryId: string;
  accountNumber: string;
}): Promise<{ success: boolean; bill?: UserBill }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data, error } = await supabase
    .from("user_bills")
    .insert({
      user_id: user.id,
      biller_name: bill.billerName,
      category_id: bill.categoryId,
      account_number: `****${bill.accountNumber.slice(-4)}`,
      amount: 0,
      status: "upcoming",
    })
    .select()
    .single();

  if (error || !data) return { success: false };
  return { success: true, bill: mapRow(data as Record<string, unknown>) };
}

/* ── Pay a single bill ── */
export async function payBill(
  billId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("user_bills")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", billId)
    .eq("user_id", user.id);

  return { success: !error };
}

/* ── Pay all due/overdue bills ── */
export async function payAllDueBills(): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, count: 0 };

  const { data } = await supabase
    .from("user_bills")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["due", "overdue"]);

  if (!data || data.length === 0) return { success: true, count: 0 };

  const { error } = await supabase
    .from("user_bills")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("status", ["due", "overdue"]);

  return { success: !error, count: data.length };
}

/* ── Toggle autopay ── */
export async function toggleAutopay(
  billId: string
): Promise<{ success: boolean; newValue: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, newValue: false };

  const { data: bill } = await supabase
    .from("user_bills")
    .select("autopay")
    .eq("id", billId)
    .eq("user_id", user.id)
    .single();

  if (!bill) return { success: false, newValue: false };

  const newValue = !bill.autopay;

  const { error } = await supabase
    .from("user_bills")
    .update({ autopay: newValue, updated_at: new Date().toISOString() })
    .eq("id", billId)
    .eq("user_id", user.id);

  return { success: !error, newValue };
}

/* ── Remove biller ── */
export async function removeBill(
  billId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("user_bills")
    .delete()
    .eq("id", billId)
    .eq("user_id", user.id);

  return { success: !error };
}

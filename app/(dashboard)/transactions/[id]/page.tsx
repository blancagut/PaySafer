import { notFound } from "next/navigation"
import Link from "next/link"
import { getTransaction } from "@/lib/actions/transactions"
import { getTransactionMessages } from "@/lib/actions/transaction-messages"
import { createClient } from "@/lib/supabase/server"
import { DealRoom } from "./deal-room"

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) notFound()

  const result = await getTransaction(id)

  if (result.error || !result.data) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Transactions
        </Link>
        <div className="text-center py-16">
          <p className="text-xl font-semibold text-foreground">Transaction not found</p>
          <p className="text-muted-foreground mt-2">This transaction doesn&apos;t exist or you don&apos;t have access.</p>
        </div>
      </div>
    )
  }

  const transaction = result.data
  const isBuyer = transaction.buyer_id === user.id
  const isSeller = transaction.seller_id === user.id

  // Fetch profiles and messages in parallel
  const [profilesResult, messagesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [transaction.buyer_id, transaction.seller_id].filter(Boolean)),
    getTransactionMessages(id),
  ])

  const profiles = profilesResult.data
  const buyerProfile = profiles?.find((p: any) => p.id === transaction.buyer_id)
  const sellerProfile = profiles?.find((p: any) => p.id === transaction.seller_id)

  return (
    <DealRoom
      transaction={transaction}
      isBuyer={isBuyer}
      isSeller={isSeller}
      userId={user.id}
      buyerName={buyerProfile?.full_name || buyerProfile?.email || "Unknown"}
      buyerEmail={buyerProfile?.email || transaction.seller_email}
      sellerName={sellerProfile?.full_name || sellerProfile?.email || transaction.seller_email}
      sellerEmail={sellerProfile?.email || transaction.seller_email}
      initialMessages={messagesResult.data || []}
    />
  )
}

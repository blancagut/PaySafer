import { notFound } from "next/navigation"
import Link from "next/link"
import { getDispute, getDisputeMessages } from "@/lib/actions/disputes"
import { createClient } from "@/lib/supabase/server"
import { DisputeDetailClient } from "./client"

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) notFound()

  const [disputeResult, messagesResult] = await Promise.all([
    getDispute(id),
    getDisputeMessages(id),
  ])

  if (disputeResult.error || !disputeResult.data) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/disputes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Disputes
        </Link>
        <div className="text-center py-16">
          <p className="text-xl font-semibold text-foreground">Dispute not found</p>
          <p className="text-muted-foreground mt-2">This dispute doesn&apos;t exist or you don&apos;t have access.</p>
        </div>
      </div>
    )
  }

  const dispute = disputeResult.data
  const messages = messagesResult.data ?? []

  // Get buyer/seller profiles for the transaction
  const txn = dispute.transaction
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", [txn?.buyer_id, txn?.seller_id].filter(Boolean))

  const buyerProfile = profiles?.find((p: any) => p.id === txn?.buyer_id)
  const sellerProfile = profiles?.find((p: any) => p.id === txn?.seller_id)

  return (
    <DisputeDetailClient
      dispute={dispute}
      messages={messages}
      currentUserId={user.id}
      buyerName={buyerProfile?.full_name || buyerProfile?.email || "Buyer"}
      sellerName={sellerProfile?.full_name || sellerProfile?.email || "Seller"}
    />
  )
}

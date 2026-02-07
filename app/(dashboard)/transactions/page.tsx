import Link from "next/link"
import {
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUserTransactions } from "@/lib/actions/transactions"
import { createClient } from "@/lib/supabase/server"

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  awaiting_payment: { label: "Awaiting Payment", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  in_escrow: { label: "In Escrow", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  released: { label: "Released", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  dispute: { label: "In Dispute", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await getUserTransactions()
  const transactions = result.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
        <p className="text-muted-foreground mt-1">View and manage all your transactions</p>
      </div>

      {/* Transactions list */}
      <Card className="border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg text-foreground">
            {transactions.length} Transaction{transactions.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {transactions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Inbox className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No transactions yet</p>
                <Link href="/transactions/new" className="text-primary hover:underline text-sm">
                  Create your first offer
                </Link>
              </div>
            ) : (
              transactions.map((txn: any) => {
                const isBuyer = txn.buyer_id === user?.id
                const role = isBuyer ? "buyer" : "seller"
                const counterparty = isBuyer ? txn.seller_email : "You are the seller"
                const status = statusConfig[txn.status] || statusConfig.draft

                return (
                  <Link
                    key={txn.id}
                    href={`/transactions/${txn.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        role === "buyer" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
                      }`}>
                        {role === "buyer" ? (
                          <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{txn.description}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {role === "buyer" ? "To: " : "From: "}
                          {counterparty}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {role === "buyer" ? "-" : "+"}
                          {txn.currency} {Number(txn.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

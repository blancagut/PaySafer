"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  User,
  Calendar,
  DollarSign,
  FileText,
  Package,
  Info,
  Loader2,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { updateTransactionStatus } from "@/lib/actions/transactions"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string; className: string; description: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", description: "Transaction created but not yet funded" },
  awaiting_payment: { label: "Awaiting Payment", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", description: "Waiting for buyer to complete payment" },
  in_escrow: { label: "In Escrow", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", description: "Funds are securely held. Waiting for delivery." },
  delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", description: "Seller has marked the item as delivered" },
  released: { label: "Released", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", description: "Funds have been released to the seller" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", description: "Transaction has been cancelled" },
  dispute: { label: "In Dispute", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", description: "A dispute has been opened for review" },
}

interface Props {
  transaction: any
  isBuyer: boolean
  isSeller: boolean
  buyerName: string
  buyerEmail: string
  sellerName: string
  sellerEmail: string
}

export function TransactionDetailClient({
  transaction,
  isBuyer,
  isSeller,
  buyerName,
  buyerEmail,
  sellerName,
  sellerEmail,
}: Props) {
  const router = useRouter()
  const [acting, setActing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDeliverDialog, setShowDeliverDialog] = useState(false)

  const status = statusConfig[transaction.status] || statusConfig.draft

  const handleStatusUpdate = async (newStatus: string) => {
    setActing(true)
    try {
      const result = await updateTransactionStatus(transaction.id, newStatus as any)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        newStatus === "released" ? "Funds released!" :
        newStatus === "delivered" ? "Marked as delivered!" :
        "Status updated!"
      )
      setShowConfirmDialog(false)
      setShowDeliverDialog(false)
      router.refresh()
    } catch {
      toast.error("Failed to update transaction")
    } finally {
      setActing(false)
    }
  }

  // Build timeline from real timestamps
  const timeline = [
    { label: "Transaction Created", date: transaction.created_at, completed: true },
    { label: "Payment Received", date: transaction.paid_at, completed: !!transaction.paid_at },
    { label: "Funds in Escrow", date: transaction.paid_at, completed: !!transaction.paid_at },
    { label: "Marked as Delivered", date: transaction.delivered_at, completed: !!transaction.delivered_at },
    { label: "Funds Released", date: transaction.released_at, completed: !!transaction.released_at },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Transactions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Transaction</h1>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{transaction.description}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-foreground">
            {transaction.currency} {Number(transaction.amount).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isBuyer ? "You are the buyer" : "You are the seller"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Buyer</p>
                    <p className="font-medium text-foreground">{buyerName}</p>
                    <p className="text-sm text-muted-foreground">{buyerEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Seller</p>
                    <p className="font-medium text-foreground">{sellerName}</p>
                    <p className="text-sm text-muted-foreground">{sellerEmail}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="text-sm font-medium text-foreground">{transaction.currency} {Number(transaction.amount).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm font-medium text-foreground">
                    {new Date(transaction.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <span className="text-sm text-foreground">{transaction.description}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        event.completed ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}>
                        {event.completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className={`w-0.5 h-8 mt-2 ${event.completed ? "bg-emerald-200 dark:bg-emerald-800" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`font-medium ${event.completed ? "text-foreground" : "text-muted-foreground"}`}>
                        {event.label}
                      </p>
                      {event.date && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Actions</CardTitle>
              <CardDescription className="text-muted-foreground">{status.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Buyer: Confirm delivery → release funds */}
              {isBuyer && transaction.status === "delivered" && (
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Release Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Delivery</DialogTitle>
                      <DialogDescription>
                        By confirming, you acknowledge receipt. Funds will be released to the seller immediately. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={acting}>Cancel</Button>
                      <Button onClick={() => handleStatusUpdate("released")} disabled={acting}>
                        {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Yes, Release Funds
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Buyer: Open dispute (in_escrow or delivered) */}
              {isBuyer && ["in_escrow", "delivered"].includes(transaction.status) && (
                <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent" asChild>
                  <Link href={`/disputes/new?transaction=${transaction.id}`}>
                    <AlertTriangle className="w-4 h-4 mr-2" /> Open Dispute
                  </Link>
                </Button>
              )}

              {/* Seller: Mark as delivered */}
              {isSeller && transaction.status === "in_escrow" && (
                <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Package className="w-4 h-4 mr-2" /> Mark as Delivered
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mark as Delivered</DialogTitle>
                      <DialogDescription>
                        Confirm that you have delivered the goods or completed the service. The buyer will be notified.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeliverDialog(false)} disabled={acting}>Cancel</Button>
                      <Button onClick={() => handleStatusUpdate("delivered")} disabled={acting}>
                        {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Confirm Delivery
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Completed */}
              {transaction.status === "released" && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Transaction Complete</span>
                </div>
              )}

              {/* Cancelled */}
              {transaction.status === "cancelled" && (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted p-3 rounded-lg">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Transaction Cancelled</span>
                </div>
              )}

              {/* Dispute in progress */}
              {transaction.status === "dispute" && (
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/disputes">View Dispute Details</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">What happens next?</p>
                  {transaction.status === "in_escrow" && (
                    <p className="text-muted-foreground mt-1">
                      {isBuyer
                        ? "Wait for the seller to deliver, then confirm receipt to release funds."
                        : "Deliver the goods or service, then mark as delivered."}
                    </p>
                  )}
                  {transaction.status === "delivered" && (
                    <p className="text-muted-foreground mt-1">
                      {isBuyer
                        ? "Review the delivery and confirm to release funds."
                        : "Waiting for the buyer to confirm receipt."}
                    </p>
                  )}
                  {transaction.status === "awaiting_payment" && (
                    <p className="text-muted-foreground mt-1">
                      {isBuyer
                        ? "Complete payment to move funds into escrow."
                        : "Waiting for the buyer to complete payment."}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Protected by SecureEscrow</span>
          </div>
        </div>
      </div>
    </div>
  )
}

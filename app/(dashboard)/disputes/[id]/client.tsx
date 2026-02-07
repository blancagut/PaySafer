"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  MessageSquare,
  FileText,
  User,
  Calendar,
  DollarSign,
  Shield,
  Send,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { addDisputeMessage } from "@/lib/actions/disputes"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string; className: string; description: string }> = {
  under_review: { label: "Under Review", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", description: "Our team is reviewing this case" },
  resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", description: "This dispute has been resolved" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground", description: "This dispute has been closed" },
}

interface Props {
  dispute: any
  messages: any[]
  currentUserId: string
  buyerName: string
  sellerName: string
}

export function DisputeDetailClient({ dispute, messages, currentUserId, buyerName, sellerName }: Props) {
  const router = useRouter()
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)

  const txn = dispute.transaction
  const status = statusConfig[dispute.status] || statusConfig.under_review

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const result = await addDisputeMessage(dispute.id, newMessage.trim())
      if (result.error) {
        toast.error(result.error)
        return
      }
      setNewMessage("")
      toast.success("Message sent")
      router.refresh()
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/disputes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Disputes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Dispute</h1>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{dispute.reason}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Dispute Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{dispute.description}</p>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Messages</CardTitle>
              <CardDescription>Communication regarding this dispute</CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No messages yet. Add evidence or information below.</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg: any) => {
                    const isOwn = msg.user_id === currentUserId
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isOwn ? "" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isOwn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {msg.user?.full_name || msg.user?.email || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1 bg-muted/50 p-3 rounded-lg">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Send message */}
              {dispute.status === "under_review" && (
                <div className="mt-6 pt-4 border-t border-border space-y-3">
                  <Textarea
                    placeholder="Add evidence, information, or a response..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} size="sm">
                      {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                dispute.status === "under_review"
                  ? "bg-amber-50 dark:bg-amber-900/20"
                  : "bg-emerald-50 dark:bg-emerald-900/20"
              }`}>
                {dispute.status === "under_review" ? (
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
                <div>
                  <p className={`font-medium ${dispute.status === "under_review" ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`}>{status.label}</p>
                  <p className="text-sm text-muted-foreground">{status.description}</p>
                </div>
              </div>
              {dispute.resolution && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</p>
                  <p className="text-sm font-medium text-foreground">{dispute.resolution}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {txn && (
                <>
                  <Link
                    href={`/transactions/${txn.id}`}
                    className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground text-sm">View Transaction</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{txn.description}</p>
                  </Link>
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="text-sm font-medium text-foreground">{txn.currency} {Number(txn.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <span className="text-muted-foreground">Buyer:</span>
                        <p className="font-medium text-foreground">{buyerName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <span className="text-muted-foreground">Seller:</span>
                        <p className="font-medium text-foreground">{sellerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Opened:</span>
                      <span className="text-sm font-medium text-foreground">
                        {new Date(dispute.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Fair Resolution</p>
                  <p className="text-muted-foreground mt-1">
                    We review all disputes neutrally. Both parties have equal opportunity to present their case.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

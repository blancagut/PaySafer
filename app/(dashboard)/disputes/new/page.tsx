"use client"

import React from "react"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, FileText, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createDispute } from "@/lib/actions/disputes"
import { toast } from "sonner"

const disputeReasons = [
  { value: "not_delivered", label: "Item or service not delivered" },
  { value: "not_as_described", label: "Not as described" },
  { value: "quality_issues", label: "Quality issues" },
  { value: "partial_delivery", label: "Partial delivery only" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "other", label: "Other" },
]

function NewDisputeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const transactionId = searchParams.get("transaction") || ""

  const [formData, setFormData] = useState({
    reason: "",
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transactionId) {
      toast.error("No transaction specified")
      return
    }
    if (!formData.reason) {
      toast.error("Please select a reason")
      return
    }
    if (!formData.description.trim()) {
      toast.error("Please describe the issue")
      return
    }

    setSubmitting(true)
    try {
      const result = await createDispute({
        transaction_id: transactionId,
        reason: formData.reason,
        description: formData.description.trim(),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Dispute submitted")
      router.push(`/disputes/${result.data!.id}`)
    } catch {
      toast.error("Failed to create dispute")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={transactionId ? `/transactions/${transactionId}` : "/transactions"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Transaction
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Open a Dispute</h1>
        {transactionId && (
          <p className="text-muted-foreground mt-1">
            Report an issue with this transaction
          </p>
        )}
      </div>

      {/* Warning */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">Before opening a dispute</p>
              <p className="text-amber-700 dark:text-amber-400 mt-1">
                We recommend contacting the other party directly to resolve the issue first.
                Disputes should be a last resort when direct communication has failed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!transactionId ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-foreground font-medium">No transaction specified</p>
            <p className="text-sm text-muted-foreground">
              Disputes must be opened from a transaction page.
            </p>
            <Button variant="outline" asChild>
              <Link href="/transactions">Go to Transactions</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Dispute Details</CardTitle>
            <CardDescription>Provide as much detail as possible to help us review your case</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Transaction reference */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Transaction Reference</p>
                    <p className="text-sm text-muted-foreground font-mono">{transactionId}</p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-foreground">Reason for Dispute</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => setFormData({ ...formData, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {disputeReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail. Include dates, communications, and what resolution you're seeking..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="resize-none"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Be specific and factual. Include any relevant details.
                </p>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  By submitting, you confirm this information is accurate.
                </p>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  Submit Dispute
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function NewDisputePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto p-6 text-muted-foreground">Loading...</div>}>
      <NewDisputeForm />
    </Suspense>
  )
}

"use client"

import React, { useState, useEffect, useRef } from "react"
import { Shield, CheckCircle2, Clock, XCircle, AlertTriangle, Upload, FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { getUserAmlRequests, submitAmlDocument, type AmlRequest, type AmlRequestStatus } from "@/lib/actions/compliance"

// ─── Status helpers ───

const statusConfig: Record<AmlRequestStatus, { label: string; variant: "default" | "warning" | "error" | "success" | "info"; icon: React.ComponentType<{ className?: string }> }> = {
  requested:    { label: "Action Required",   variant: "error",   icon: AlertTriangle },
  submitted:    { label: "Under Review",      variant: "warning", icon: Clock },
  under_review: { label: "Under Review",      variant: "warning", icon: Clock },
  approved:     { label: "Approved",          variant: "success", icon: CheckCircle2 },
  rejected:     { label: "Resubmit Required", variant: "error",   icon: XCircle },
}

const documentLabels: Record<string, string> = {
  government_id:    "Government-issued ID (passport, driver's license, national ID)",
  proof_of_address: "Proof of Address (utility bill, bank statement dated within 3 months)",
  bank_statement:   "Bank Statement (last 3 months)",
  source_of_funds:  "Source of Funds Declaration",
  income_proof:     "Proof of Income (pay stubs, tax return, employment letter)",
  invoice_contract: "Invoice or Contract related to the transaction",
}

// ─── Document Upload Row ───

function DocumentUploadRow({
  requestId,
  documentType,
  uploadedFile,
  requestStatus,
  onUploaded,
}: {
  requestId: string
  documentType: string
  uploadedFile: { file_name: string; uploaded_at: string } | undefined
  requestStatus: AmlRequestStatus
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const isLocked = requestStatus === "approved" || requestStatus === "rejected"

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)

    const res = await submitAmlDocument(requestId, documentType, fd)
    setUploading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(res.data?.allUploaded ? "All documents submitted! Your case is under review." : "Document uploaded successfully")
      onUploaded()
    }

    // Reset so same file can be re-uploaded if needed
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.06] last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${uploadedFile ? "bg-emerald-500/15" : "bg-white/[0.04]"}`}>
        {uploadedFile
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : <FileText className="w-4 h-4 text-muted-foreground" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">
          {documentLabels[documentType] || documentType.replace(/_/g, " ")}
        </p>
        {uploadedFile && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Uploaded: <span className="text-foreground">{uploadedFile.file_name}</span>{" "}
            · {new Date(uploadedFile.uploaded_at).toLocaleDateString()}
          </p>
        )}
        {!uploadedFile && (
          <p className="text-[11px] text-muted-foreground mt-0.5">Not yet provided</p>
        )}
      </div>

      {!isLocked && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <Button
            size="sm"
            variant="outline"
            className="text-[11px] h-7 px-3 gap-1.5"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Upload className="w-3 h-3" />
            }
            {uploadedFile ? "Replace" : "Upload"}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── AML Request Card ───

function AmlRequestCard({
  req,
  onRefresh,
}: {
  req: AmlRequest
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(req.status === "requested" || req.status === "rejected")
  const cfg = statusConfig[req.status]
  const StatusIcon = cfg.icon
  const uploadedMap = Object.fromEntries(
    (req.submitted_files || []).map((f) => [f.document_type, f])
  )
  const txn = req.transactions
  const uploadedCount = req.submitted_files?.length ?? 0
  const totalCount = req.requested_documents.length

  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          req.status === "approved" ? "bg-emerald-500/15" :
          req.status === "rejected" ? "bg-red-500/15" :
          req.status === "submitted" || req.status === "under_review" ? "bg-amber-500/15" :
          "bg-red-500/15"
        }`}>
          <StatusIcon className={`w-4 h-4 ${
            req.status === "approved" ? "text-emerald-400" :
            req.status === "rejected" ? "text-red-400" :
            req.status === "submitted" || req.status === "under_review" ? "text-amber-400" :
            "text-red-400"
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">AML Compliance Review</span>
            <GlassBadge variant={cfg.variant as "default"}>{cfg.label}</GlassBadge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            {txn ? `Transaction · ${txn.currency} ${Number(txn.amount).toFixed(2)}` : `Request ${req.id.slice(0, 8)}`}
            {" · "}Opened {new Date(req.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
          <span>{uploadedCount}/{totalCount} docs</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/[0.06]">
          {/* Reason */}
          <div className="mt-4 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3">
            <p className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide mb-1">Reason for review</p>
            <p className="text-sm text-amber-100/80">{req.reason}</p>
          </div>

          {/* Rejection notice */}
          {req.status === "rejected" && (req.metadata?.rejection_reason as string) && (
            <div className="mt-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 px-4 py-3">
              <p className="text-[11px] font-semibold text-red-300 uppercase tracking-wide mb-1">Rejection reason</p>
              <p className="text-sm text-red-100/80">{req.metadata.rejection_reason as string}</p>
            </div>
          )}

          {/* Approval notice */}
          {req.status === "approved" && (
            <div className="mt-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-4 py-3">
              <p className="text-sm text-emerald-300">
                ✓ Your documents have been reviewed and approved. Your wallet has been restored.
              </p>
            </div>
          )}

          {/* Document list */}
          {req.status !== "approved" && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Required Documents</p>
              <div>
                {req.requested_documents.map((docType) => (
                  <DocumentUploadRow
                    key={docType}
                    requestId={req.id}
                    documentType={docType}
                    uploadedFile={uploadedMap[docType]}
                    requestStatus={req.status}
                    onUploaded={onRefresh}
                  />
                ))}
              </div>
            </div>
          )}

          {req.status === "submitted" && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              All documents submitted. Our compliance team will review your case within 1–3 business days.
            </p>
          )}
        </div>
      )}
    </GlassCard>
  )
}

// ─── Page ───

export default function CompliancePage() {
  const [requests, setRequests] = useState<AmlRequest[]>([])
  const [loading, setLoading] = useState(true)

  const loadRequests = async () => {
    setLoading(true)
    const res = await getUserAmlRequests()
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      setRequests(res.data ?? [])
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const openRequests = requests.filter((r) => r.status !== "approved")
  const resolvedRequests = requests.filter((r) => r.status === "approved")

  return (
    <GlassContainer>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Compliance Center</h1>
            <p className="text-sm text-muted-foreground">Submit required documents for AML review</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <GlassCard className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="font-semibold text-foreground">No compliance actions required</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your account is in good standing. No documents are currently requested.
            </p>
          </GlassCard>
        )}

        {!loading && openRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Action Required ({openRequests.length})
            </p>
            {openRequests.map((req) => (
              <AmlRequestCard key={req.id} req={req} onRefresh={loadRequests} />
            ))}
          </div>
        )}

        {!loading && resolvedRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Resolved ({resolvedRequests.length})
            </p>
            {resolvedRequests.map((req) => (
              <AmlRequestCard key={req.id} req={req} onRefresh={loadRequests} />
            ))}
          </div>
        )}

        {/* Info footer */}
        {!loading && requests.length > 0 && (
          <GlassCard className="p-4">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Why am I seeing this?</strong> PaySafe is required by law to verify
              the identity and source of funds for certain transactions. Failure to provide requested documents may
              result in your wallet remaining frozen and funds held at PAYSAFERME LLC for legal compliance review.
              For questions, contact{" "}
              <a href="mailto:compliance@paysafe.app" className="text-primary underline underline-offset-2">
                compliance@paysafe.app
              </a>.
            </p>
          </GlassCard>
        )}
      </div>
    </GlassContainer>
  )
}

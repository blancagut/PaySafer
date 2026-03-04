"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Fingerprint,
  Upload,
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  Loader2,
  Eye,
  MapPin,
  User,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getVerificationStatus,
  uploadKycDocument,
  submitKycVerification,
  type VerificationLevel,
  type KycDocument,
  type KycSubmission,
} from "@/lib/actions/verify"

// ─── Verification Levels ───

const levels: { id: VerificationLevel; label: string; desc: string; docs: string[] }[] = [
  {
    id: "basic",
    label: "Basic (Tier 1)",
    desc: "Send & receive up to $1,000/month",
    docs: ["Full legal name", "Email verification", "Phone verification"],
  },
  {
    id: "enhanced",
    label: "Enhanced (Tier 2)",
    desc: "Up to $15,000/month — required for debit card",
    docs: ["Government-issued photo ID", "Selfie verification"],
  },
  {
    id: "full",
    label: "Full (Tier 3)",
    desc: "Unlimited — required for business accounts",
    docs: ["Proof of address", "Source of funds", "Enhanced due diligence"],
  },
]

// ─── Document Upload Card ───

function DocumentUpload({
  label,
  description,
  accept,
  icon: Icon,
  documentType,
  existingDoc,
  onUploaded,
}: {
  label: string
  description: string
  accept: string
  icon: React.ComponentType<{ className?: string }>
  documentType: string
  existingDoc: KycDocument | null
  onUploaded: (doc: KycDocument) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localFile, setLocalFile] = useState<string | null>(existingDoc?.file_name ?? null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", f)
    const result = await uploadKycDocument(documentType, formData)
    setUploading(false)
    if (result.error) {
      toast.error(result.error)
    } else if (result.data) {
      setLocalFile(f.name)
      onUploaded(result.data)
      toast.success(`${label} uploaded successfully`)
    }
    if (inputRef.current) inputRef.current.value = ""
  }

  const hasFile = !!localFile

  return (
    <div className={cn(
      "rounded-xl border bg-white/[0.02] p-4 transition-colors",
      hasFile ? "border-blue-500/20" : "border-white/[0.06]"
    )}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {hasFile && <GlassBadge variant="blue" size="sm">Uploaded</GlassBadge>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

          {localFile && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="truncate">{localFile}</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : hasFile ? (
              "Replace"
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───

export default function VerifyPage() {
  const [currentLevel, setCurrentLevel] = useState<VerificationLevel>("basic")
  const [pendingSubmission, setPendingSubmission] = useState<KycSubmission | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, KycDocument>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadStatus = useCallback(async () => {
    const { level, submission } = await getVerificationStatus()
    setCurrentLevel(level)
    setPendingSubmission(submission)
    if (submission?.documents) {
      const m: Record<string, KycDocument> = {}
      for (const d of submission.documents) m[d.document_type] = d
      setUploadedDocs(m)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleDocUploaded = (doc: KycDocument) => {
    setUploadedDocs((prev) => ({ ...prev, [doc.document_type]: doc }))
  }

  const handleSubmit = async () => {
    if (!uploadedDocs["id_front"]) {
      toast.error("Please upload the front of your ID document")
      return
    }
    setSubmitting(true)
    const docs = Object.values(uploadedDocs)
    const targetLevel = currentLevel === "basic" ? "enhanced" : "full"
    const { error } = await submitKycVerification(targetLevel as "enhanced" | "full", docs)
    if (error) {
      toast.error(error)
    } else {
      toast.success("Documents submitted for review!", {
        description: "You'll be notified once verification is complete. This usually takes 1-2 business days.",
      })
      await loadStatus()
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasPending = !!pendingSubmission

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Identity Verification
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Verify your identity to unlock higher limits
            </p>
          </div>
        </div>
      </div>

      {/* Current Level */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md" className="border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Current Level</span>
                <GlassBadge variant="emerald" size="sm">
                  {currentLevel === "basic" ? "Basic — Tier 1" : currentLevel === "enhanced" ? "Enhanced — Tier 2" : "Full — Tier 3"}
                </GlassBadge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentLevel === "full"
                  ? "You have the highest verification level"
                  : currentLevel === "enhanced"
                    ? "Complete Full verification for unlimited transactions"
                    : "Complete Enhanced verification to unlock debit card and higher limits"}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Pending Submission Banner */}
      {hasPending && (
        <div className="animate-fade-in">
          <GlassCard padding="md" className="border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <span className="text-sm font-medium text-foreground">Verification In Progress</span>
                <p className="text-xs text-muted-foreground">
                  Your {pendingSubmission.target_level} verification is {pendingSubmission.status === "pending" ? "pending review" : "under review"}.
                  Submitted {new Date(pendingSubmission.submitted_at).toLocaleDateString()}.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Verification Tiers */}
      <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <GlassContainer header={{ title: "Verification Tiers", description: "Higher tiers unlock more features and limits" }}>
          <div className="space-y-4">
            {levels.map((level, idx) => {
              const isCompleted =
                (level.id === "basic") ||
                (level.id === "enhanced" && (currentLevel === "enhanced" || currentLevel === "full")) ||
                (level.id === "full" && currentLevel === "full")
              const isCurrent =
                (level.id === "enhanced" && currentLevel === "basic") ||
                (level.id === "full" && currentLevel === "enhanced")
              return (
                <div
                  key={level.id}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : isCurrent
                        ? "border-primary/20 bg-primary/5"
                        : "border-white/[0.06] bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-primary" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20" />
                      )}
                      <span className="text-sm font-medium text-foreground">{level.label}</span>
                    </div>
                    {isCompleted && (
                      <GlassBadge variant="emerald" size="sm">Completed</GlassBadge>
                    )}
                    {isCurrent && (
                      <GlassBadge variant="blue" size="sm">In Progress</GlassBadge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{level.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {level.docs.map((doc) => (
                      <span
                        key={doc}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40 border border-white/[0.06]"
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassContainer>
      </div>

      {/* Document Upload Section */}
      {currentLevel !== "full" && !hasPending && (
        <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
          <GlassContainer header={{
            title: "Upload Documents",
            description: currentLevel === "basic"
              ? "Required for Enhanced (Tier 2) verification"
              : "Required for Full (Tier 3) verification"
          }}>
            <div className="space-y-3">
              <DocumentUpload
                label="Government ID — Front"
                description="Passport, driver's license or national ID card (front side)"
                accept="image/*,.pdf"
                icon={FileText}
                documentType="id_front"
                existingDoc={uploadedDocs["id_front"] ?? null}
                onUploaded={handleDocUploaded}
              />
              <DocumentUpload
                label="Government ID — Back"
                description="Back side of your ID (skip for passports)"
                accept="image/*,.pdf"
                icon={FileText}
                documentType="id_back"
                existingDoc={uploadedDocs["id_back"] ?? null}
                onUploaded={handleDocUploaded}
              />
              <DocumentUpload
                label="Selfie Verification"
                description="Take a clear selfie holding your ID next to your face"
                accept="image/*"
                icon={Camera}
                documentType="selfie"
                existingDoc={uploadedDocs["selfie"] ?? null}
                onUploaded={handleDocUploaded}
              />
              <DocumentUpload
                label="Proof of Address"
                description="Utility bill or bank statement dated within the last 3 months"
                accept="image/*,.pdf"
                icon={MapPin}
                documentType="proof_of_address"
                existingDoc={uploadedDocs["proof_of_address"] ?? null}
                onUploaded={handleDocUploaded}
              />
            </div>

            <div className="mt-6">
              <Button
                onClick={handleSubmit}
                disabled={!uploadedDocs["id_front"] || submitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Documents are encrypted with AES-256 and processed on secure servers. Verification typically
                completes within 24 hours. You&apos;ll receive a notification when your status is updated.
              </p>
            </div>
          </GlassContainer>
        </div>
      )}
    </div>
  )
}

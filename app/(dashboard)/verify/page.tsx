"use client"

import { useState, useRef } from "react"
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

// ─── Verification Levels ───

type VerificationLevel = "none" | "basic" | "enhanced" | "full"

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
  file,
  onFile,
  status,
}: {
  label: string
  description: string
  accept: string
  icon: React.ComponentType<{ className?: string }>
  file: File | null
  onFile: (f: File | null) => void
  status: "idle" | "uploading" | "uploaded" | "verified" | "rejected"
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    // Simulate upload
    await new Promise((r) => setTimeout(r, 1200))
    onFile(f)
    setUploading(false)
    toast.success(`${label} uploaded successfully`)
    if (inputRef.current) inputRef.current.value = ""
  }

  const statusConfig = {
    idle: { badge: null, border: "border-white/[0.06]" },
    uploading: { badge: null, border: "border-blue-500/30" },
    uploaded: { badge: <GlassBadge variant="blue" size="sm">Pending Review</GlassBadge>, border: "border-blue-500/20" },
    verified: { badge: <GlassBadge variant="emerald" size="sm">Verified</GlassBadge>, border: "border-emerald-500/20" },
    rejected: { badge: <GlassBadge variant="red" size="sm">Resubmit</GlassBadge>, border: "border-red-500/20" },
  }

  const s = statusConfig[file ? "uploaded" : status]

  return (
    <div className={cn("rounded-xl border bg-white/[0.02] p-4 transition-colors", s.border)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {s.badge}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

          {file && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="truncate">{file.name}</span>
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
            ) : file ? (
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
  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const currentLevel: VerificationLevel = "basic" // mock

  const handleSubmit = async () => {
    if (!idFront) {
      toast.error("Please upload the front of your ID document")
      return
    }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 2000))
    toast.success("Documents submitted for review!", {
      description: "You'll be notified once verification is complete. This usually takes 1-2 business days.",
    })
    setSubmitting(false)
  }

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
                <GlassBadge variant="emerald" size="sm">Basic — Tier 1</GlassBadge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete Enhanced verification to unlock debit card and higher limits
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Verification Tiers */}
      <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <GlassContainer header={{ title: "Verification Tiers", description: "Higher tiers unlock more features and limits" }}>
          <div className="space-y-4">
            {levels.map((level, idx) => {
              const isCompleted = level.id === "basic"
              const isCurrent = level.id === "enhanced"
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
      <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
        <GlassContainer header={{ title: "Upload Documents", description: "Required for Enhanced (Tier 2) verification" }}>
          <div className="space-y-3">
            <DocumentUpload
              label="Government ID — Front"
              description="Passport, driver's license or national ID card (front side)"
              accept="image/*,.pdf"
              icon={FileText}
              file={idFront}
              onFile={setIdFront}
              status="idle"
            />
            <DocumentUpload
              label="Government ID — Back"
              description="Back side of your ID (skip for passports)"
              accept="image/*,.pdf"
              icon={FileText}
              file={idBack}
              onFile={setIdBack}
              status="idle"
            />
            <DocumentUpload
              label="Selfie Verification"
              description="Take a clear selfie holding your ID next to your face"
              accept="image/*"
              icon={Camera}
              file={selfie}
              onFile={setSelfie}
              status="idle"
            />
            <DocumentUpload
              label="Proof of Address"
              description="Utility bill or bank statement dated within the last 3 months"
              accept="image/*,.pdf"
              icon={MapPin}
              file={proofOfAddress}
              onFile={setProofOfAddress}
              status="idle"
            />
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSubmit}
              disabled={!idFront || submitting}
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
    </div>
  )
}

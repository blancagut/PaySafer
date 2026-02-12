"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle2,
  Link2,
  DollarSign,
  FileText,
  Copy,
  Check,
  Sparkles,
  Loader2,
  ImagePlus,
  X,
  Calendar,
  Clock,
  Tag,
  Share2,
  QrCode,
  MessageCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GlassCard } from "@/components/glass"
import { createOffer, uploadOfferImage } from "@/lib/actions/offers"
import { toast } from "sonner"

const currencies = [
  { value: "USD", label: "$ USD", symbol: "$" },
  { value: "EUR", label: "€ EUR", symbol: "€" },
  { value: "GBP", label: "£ GBP", symbol: "£" },
  { value: "CAD", label: "$ CAD", symbol: "C$" },
  { value: "AUD", label: "$ AUD", symbol: "A$" },
]

const categories = [
  { value: "web-development", label: "Web Development", emoji: "💻" },
  { value: "design", label: "Design & Creative", emoji: "🎨" },
  { value: "writing", label: "Writing & Content", emoji: "✍️" },
  { value: "marketing", label: "Marketing", emoji: "📢" },
  { value: "consulting", label: "Consulting", emoji: "💼" },
  { value: "video", label: "Video & Animation", emoji: "🎬" },
  { value: "music", label: "Music & Audio", emoji: "🎵" },
  { value: "physical-goods", label: "Physical Goods", emoji: "📦" },
  { value: "digital-goods", label: "Digital Goods", emoji: "🗂️" },
  { value: "tutoring", label: "Tutoring & Education", emoji: "📚" },
  { value: "other", label: "Other", emoji: "✨" },
]

const deliveryOptions = [
  { value: "1", label: "1 day", sub: "Express" },
  { value: "3", label: "3 days", sub: "Fast" },
  { value: "7", label: "7 days", sub: "Standard" },
  { value: "14", label: "14 days", sub: "Relaxed" },
  { value: "30", label: "30 days", sub: "Extended" },
  { value: "60", label: "60 days", sub: "Long-term" },
  { value: "90", label: "90 days", sub: "Project" },
]

export default function CreateOfferPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "EUR",
    creator_role: "buyer" as "buyer" | "seller",
    category: "",
    delivery_days: "",
    expires_at: "",
  })
  const [images, setImages] = useState<{ url: string; preview: string }[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdOffer, setCreatedOffer] = useState<{ token: string; id: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [aiOptimizing, setAiOptimizing] = useState(false)
  const [step, setStep] = useState(1) // Multi-step form: 1=details, 2=media+extras

  // ─── Image Upload ───
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 3) {
      toast.error("Maximum 3 images allowed")
      return
    }

    for (const file of files) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`)
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File too large: ${file.name} (max 5MB)`)
        continue
      }

      setUploadingImage(true)

      // Create preview
      const preview = URL.createObjectURL(file)

      try {
        const fd = new FormData()
        fd.append("image", file)
        const result = await uploadOfferImage(fd)

        if (result.error) {
          toast.error(result.error)
          URL.revokeObjectURL(preview)
        } else {
          setImages(prev => [...prev, { url: result.data!.url, preview }])
          toast.success("Image uploaded")
        }
      } catch {
        toast.error("Upload failed")
        URL.revokeObjectURL(preview)
      } finally {
        setUploadingImage(false)
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [images.length])

  const removeImage = (index: number) => {
    setImages(prev => {
      const removed = prev[index]
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ─── AI Optimize ───
  const handleAIOptimize = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      toast.error("Add a title or description first so AI has something to enhance")
      return
    }
    setAiOptimizing(true)
    try {
      const res = await fetch("/api/ai/optimize-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          amount: formData.amount ? Number(formData.amount) : undefined,
          currency: formData.currency,
          role: formData.creator_role,
        }),
      })
      if (!res.ok) throw new Error("AI optimization failed")
      const data = await res.json()
      if (data.optimizedTitle) setFormData(prev => ({ ...prev, title: data.optimizedTitle }))
      if (data.optimizedDescription) setFormData(prev => ({ ...prev, description: data.optimizedDescription }))
      toast.success("Offer enhanced by AI! Review the changes.")
    } catch {
      toast.error("AI optimization unavailable right now")
    } finally {
      setAiOptimizing(false)
    }
  }

  // ─── Submit ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) { toast.error("Title is required"); return }
    if (!formData.description.trim()) { toast.error("Description is required"); return }
    if (!formData.amount || Number(formData.amount) <= 0) { toast.error("Amount must be positive"); return }

    setSubmitting(true)
    try {
      const result = await createOffer({
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: Number(formData.amount),
        currency: formData.currency,
        creator_role: formData.creator_role,
        image_urls: images.map(i => i.url),
        category: formData.category || undefined,
        delivery_days: formData.delivery_days ? Number(formData.delivery_days) : undefined,
        expires_at: formData.expires_at || undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Offer created! Share the link with the other party.")
      setCreatedOffer({ token: result.data!.token, id: result.data!.id })
    } catch {
      toast.error("Failed to create offer")
    } finally {
      setSubmitting(false)
    }
  }

  const offerLink = createdOffer ? `${window.location.origin}/offer/${createdOffer.token}` : ""
  const currencySymbol = currencies.find(c => c.value === formData.currency)?.symbol || "$"

  const copyLink = () => {
    navigator.clipboard.writeText(offerLink)
    setCopied(true)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOffer = async () => {
    if (navigator.share) {
      await navigator.share({ title: `PaySafer Offer: ${formData.title}`, url: offerLink })
    } else {
      copyLink()
    }
  }

  // ═══════════ SUCCESS STATE ═══════════
  if (createdOffer) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
        <div className="text-center space-y-4 py-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Offer Created!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Share this link with the other party. When they accept, a secure escrow transaction will be created.
          </p>
        </div>

        <GlassCard className="p-6 space-y-5">
          {/* Link */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Shareable Link</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-mono text-foreground break-all">
                {offerLink}
              </div>
              <Button onClick={copyLink} variant="outline" size="icon" className="shrink-0 h-11 w-11">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Offer summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-lg font-bold">{currencySymbol}{Number(formData.amount).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-lg font-bold capitalize">{formData.creator_role}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Role</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-lg font-bold">{formData.delivery_days || "—"}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days</p>
            </div>
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-white/[0.08]">
                  <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg text-sm text-amber-400">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Single-use link — once accepted, it cannot be used again.</span>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { setCreatedOffer(null); setFormData({ title: "", description: "", amount: "", currency: "EUR", creator_role: "buyer", category: "", delivery_days: "", expires_at: "" }); setImages([]) }}>
            Create Another
          </Button>
          <Button className="flex-1" onClick={shareOffer}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Offer
          </Button>
        </div>
      </div>
    )
  }

  // ═══════════ CREATE FORM ═══════════
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          Create Offer
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up a secure escrow deal and share the link with anyone.
        </p>
      </div>

      {/* How it works — compact */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: FileText, label: "Create", sub: "Set terms & your role", step: 1 },
            { icon: Share2, label: "Share", sub: "Send link to other party", step: 2 },
            { icon: Shield, label: "Protected", sub: "Escrow auto-created", step: 3 },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{item.sub}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${step === 1 ? "bg-primary/15 text-primary border border-primary/20" : "bg-white/[0.04] text-muted-foreground border border-white/[0.06]"}`}
        >
          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">1</span>
          Details
        </button>
        <div className="flex-1 h-px bg-white/[0.06]" />
        <button
          onClick={() => { if (formData.title && formData.amount) setStep(2); else toast.error("Fill in title and amount first") }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${step === 2 ? "bg-primary/15 text-primary border border-primary/20" : "bg-white/[0.04] text-muted-foreground border border-white/[0.06]"}`}
        >
          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">2</span>
          Media & Extras
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ─── STEP 1: Core Details ─── */}
        {step === 1 && (
          <GlassCard className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold mb-1">Offer Details</h3>
              <p className="text-xs text-muted-foreground">This information will be visible to the other party</p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Website Development Project"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    {currencySymbol}
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="pl-8 bg-white/[0.04] border-white/[0.08] text-lg font-semibold"
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Currency</Label>
                <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Your Role */}
            <div className="space-y-2">
              <Label>Your Role *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, creator_role: "buyer" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.creator_role === "buyer"
                      ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">💰</span>
                    <p className="font-semibold text-sm">I&apos;m the Buyer</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">I pay. The other party delivers.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, creator_role: "seller" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.creator_role === "seller"
                      ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🛠️</span>
                    <p className="font-semibold text-sm">I&apos;m the Seller</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">I deliver. The other party pays.</p>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAIOptimize}
                  disabled={aiOptimizing || (!formData.title.trim() && !formData.description.trim())}
                  className="h-7 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                >
                  {aiOptimizing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  {aiOptimizing ? "Enhancing..." : "AI Enhance"}
                </Button>
              </div>
              <Textarea
                id="description"
                placeholder="Describe the goods or service in detail — deliverables, timelines, conditions..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="resize-none bg-white/[0.04] border-white/[0.08]"
              />
              <p className="text-[11px] text-muted-foreground">Be specific to avoid misunderstandings and protect both parties.</p>
            </div>

            <Button
              type="button"
              onClick={() => {
                if (!formData.title.trim()) { toast.error("Title is required"); return }
                if (!formData.amount || Number(formData.amount) <= 0) { toast.error("Amount is required"); return }
                if (!formData.description.trim()) { toast.error("Description is required"); return }
                setStep(2)
              }}
              className="w-full"
              size="lg"
            >
              Continue to Media & Extras
            </Button>
          </GlassCard>
        )}

        {/* ─── STEP 2: Media & Extras ─── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Images */}
            <GlassCard className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-primary" /> Photos
                  <span className="text-xs text-muted-foreground font-normal">(Optional — up to 3)</span>
                </h3>
                <p className="text-xs text-muted-foreground">Add photos of the product, mockup, or reference material</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />

              <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/[0.08]">
                    <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}

                {images.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Add Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </GlassCard>

            {/* Category */}
            <GlassCard className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Category
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: prev.category === cat.value ? "" : cat.value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      formData.category === cat.value
                        ? "bg-primary/15 text-primary border border-primary/25 shadow-[0_0_12px_rgba(16,185,129,0.08)]"
                        : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08] hover:text-foreground"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Delivery + Expiry */}
            <GlassCard className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Delivery Timeline */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Delivery Timeline
                  </Label>
                  <Select value={formData.delivery_days} onValueChange={v => setFormData({ ...formData, delivery_days: v })}>
                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} — {opt.sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Offer Expiry */}
                <div className="space-y-2">
                  <Label htmlFor="expires" className="flex items-center gap-1.5 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Offer Expires
                  </Label>
                  <Input
                    id="expires"
                    type="date"
                    value={formData.expires_at}
                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="bg-white/[0.04] border-white/[0.08]"
                  />
                </div>
              </div>
            </GlassCard>

            {/* Preview Strip */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  {images[0] && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/[0.08]">
                      <img src={images[0].preview || images[0].url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium line-clamp-1">{formData.title || "Untitled Offer"}</p>
                    <p className="text-xs text-muted-foreground">{currencySymbol}{Number(formData.amount || 0).toLocaleString()} · {formData.creator_role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {formData.category && <span className="px-2 py-0.5 rounded-full bg-white/[0.06]">{categories.find(c => c.value === formData.category)?.emoji} {categories.find(c => c.value === formData.category)?.label}</span>}
                  {formData.delivery_days && <span className="px-2 py-0.5 rounded-full bg-white/[0.06]">{formData.delivery_days}d</span>}
                </div>
              </div>
            </GlassCard>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1" size="lg">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Create Offer</>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

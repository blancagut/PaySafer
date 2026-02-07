"use client"

import { useState } from "react"
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
import { createOffer } from "@/lib/actions/offers"
import { toast } from "sonner"

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
]

export default function CreateOfferPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "USD",
    creator_role: "buyer" as "buyer" | "seller",
  })
  const [submitting, setSubmitting] = useState(false)
  const [createdOffer, setCreatedOffer] = useState<{ token: string; id: string } | null>(null)
  const [copied, setCopied] = useState(false)

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

  const copyLink = () => {
    navigator.clipboard.writeText(offerLink)
    setCopied(true)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  // Success state — show the shareable link
  if (createdOffer) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Offer Created</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Share this link with the other party. When they accept, a transaction will be created automatically.
          </p>
        </div>

        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Shareable Offer Link</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono text-foreground break-all">
                  {offerLink}
                </div>
                <Button onClick={copyLink} variant="outline" className="shrink-0">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium text-foreground">{formData.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">{formData.currency} {Number(formData.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Role</span>
                <span className="font-medium text-foreground capitalize">{formData.creator_role}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-400">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>This is a single-use link. Once accepted, it cannot be used again.</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button onClick={() => { setCreatedOffer(null); setFormData({ title: "", description: "", amount: "", currency: "USD", creator_role: "buyer" }) }}>
            Create Another Offer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Link2 className="w-6 h-6 text-primary" /> Create Offer
        </h1>
        <p className="text-muted-foreground mt-1">
          Create an escrow offer and share the link with the other party.
        </p>
      </div>

      {/* How it works */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">1. Create Offer</p>
              <p className="text-xs text-muted-foreground mt-0.5">Set terms and your role</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">2. Share Link</p>
              <p className="text-xs text-muted-foreground mt-0.5">Send to the other party</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">3. Transaction Created</p>
              <p className="text-xs text-muted-foreground mt-0.5">Once accepted by the other party</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Offer Details</CardTitle>
          <CardDescription>This information will be visible to the other party</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Website Development Project"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-foreground">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-foreground">Currency</Label>
                <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label className="text-foreground">Your Role</Label>
              <p className="text-xs text-muted-foreground">What is your role in this transaction?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, creator_role: "buyer" })}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    formData.creator_role === "buyer"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">I am the Buyer</p>
                  <p className="text-xs text-muted-foreground mt-1">I will pay. The other party delivers.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, creator_role: "seller" })}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    formData.creator_role === "seller"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">I am the Seller</p>
                  <p className="text-xs text-muted-foreground mt-1">I will deliver. The other party pays.</p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the goods or service in detail to avoid misunderstandings..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">Be specific about deliverables, timelines, and conditions.</p>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Creating..." : "Create Offer & Get Link"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

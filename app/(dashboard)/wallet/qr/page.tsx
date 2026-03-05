"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import jsQR from "jsqr"
import {
  QrCode,
  Download,
  Copy,
  Share2,
  Camera,
  SwitchCamera,
  ArrowLeft,
  Check,
  Wallet,
  Smartphone,
  Zap,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { haptic } from "@/lib/haptics"

// ─── Main QR Page ───

export default function QRPaymentPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("receive")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .single()
      if (data) setProfile(data)
    })
  }, [])

  const qrUrl = profile?.username
    ? `https://paysafer.me/pay/${profile.username}${amount ? `?amount=${amount}` : ""}${note ? `${amount ? "&" : "?"}note=${encodeURIComponent(note)}` : ""}`
    : ""

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    haptic("success")
    toast.success("Link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Pay me on PaySafer",
        text: `Send me money securely via PaySafer`,
        url: qrUrl,
      })
      haptic("success")
    } else {
      handleCopy()
    }
  }

  const handleDownload = () => {
    const svg = document.querySelector("#qr-code-svg svg")
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = "#0a0f1a"
      ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)
      const link = document.createElement("a")
      link.download = `paysafer-qr-${profile?.username || "code"}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      haptic("success")
      toast.success("QR Code downloaded!")
    }
    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR Payments</h1>
          <p className="text-sm text-muted-foreground">
            Receive or scan to pay — no app install required
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="receive" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <QrCode className="w-4 h-4" />
            My QR Code
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Camera className="w-4 h-4" />
            Scan to Pay
          </TabsTrigger>
        </TabsList>

        {/* ─── Receive Tab ─── */}
        <TabsContent value="receive" className="mt-6 space-y-6">
          {/* QR Code Display */}
          <GlassCard className="p-8 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/10 rounded-2xl blur-xl" />
              <div id="qr-code-svg" className="relative bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08]">
                <QRCodeSVG
                  value={qrUrl || "https://paysafer.me"}
                  size={220}
                  fgColor="#10b981"
                  bgColor="transparent"
                  level="M"
                  imageSettings={{
                    src: "",
                    height: 0,
                    width: 0,
                    excavate: false,
                  }}
                />
              </div>
            </div>

            {profile?.username && (
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">${profile.username}</p>
                <p className="text-sm text-muted-foreground">{profile.full_name}</p>
              </div>
            )}

            {/* Quick amount presets */}
            <div className="w-full space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Amount (optional)</Label>
              <div className="grid grid-cols-4 gap-2">
                {["5", "10", "25", "50"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setAmount(amount === preset ? "" : preset); haptic("light") }}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      amount === preset
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-foreground"
                    }`}
                  >
                    €{preset}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Custom amount..."
                value={!["5", "10", "25", "50"].includes(amount) ? amount : ""}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            <div className="w-full space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Note (optional)</Label>
              <Input
                placeholder="What's this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-3 w-full">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3 bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3 bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                <span className="text-xs">Share</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3 bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                <span className="text-xs">Save</span>
              </Button>
            </div>
          </GlassCard>

          {/* How it works */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              How QR Payments Work
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: QrCode, title: "Show QR", desc: "Display your code to the payer" },
                { icon: Smartphone, title: "They Scan", desc: "Payer scans with any camera app" },
                { icon: Wallet, title: "Instant Pay", desc: "Money arrives in your wallet" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <step.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        {/* ─── Scan Tab ─── */}
        <TabsContent value="scan" className="mt-6 space-y-6">
          <ScannerPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Camera Scanner Component ───

function ScannerPanel() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    scanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startScanner = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setScanning(true)
        scanningRef.current = true
        setError(null)

        // Use jsQR for universal browser support (works in Safari, Firefox, Chrome, etc.)
        const canvas = canvasRef.current!
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!

        const scanFrame = () => {
          if (!scanningRef.current || !videoRef.current) return
          const video = videoRef.current
          if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(scanFrame)
            return
          }
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          })
          if (code?.data) {
            const url = code.data
            if (url.includes("paysafer.me/pay/") || url.includes("/pay/")) {
              haptic("success")
              stopStream()
              try {
                const path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname
                router.push(path)
              } catch {
                toast.error("Invalid QR code URL")
              }
              return
            }
          }
          requestAnimationFrame(scanFrame)
        }
        requestAnimationFrame(scanFrame)
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions to scan QR codes.")
    }
  }, [router, stopStream])

  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  return (
    <GlassCard className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <Camera className="w-10 h-10 text-primary mx-auto" />
        <h3 className="text-lg font-semibold">Scan QR Code</h3>
        <p className="text-sm text-muted-foreground">
          Point your camera at a PaySafer QR code to send money instantly
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black/40 border border-white/[0.08]">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan overlay */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner accents */}
            <div className="absolute top-4 left-4 w-10 h-10 border-l-2 border-t-2 border-primary rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-10 h-10 border-r-2 border-t-2 border-primary rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-10 h-10 border-l-2 border-b-2 border-primary rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-10 h-10 border-r-2 border-b-2 border-primary rounded-br-lg" />

            {/* Scanning line */}
            <div className="absolute left-4 right-4 h-0.5 bg-primary/60 animate-scan-line" style={{
              animation: 'scanLine 2.5s ease-in-out infinite',
            }} />
          </div>
        )}

        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Button onClick={startScanner} className="gap-2 bg-primary hover:bg-primary/90">
              <Camera className="w-4 h-4" />
              Start Camera
            </Button>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Or enter a payment link manually
        </p>
        <div className="mt-2 flex gap-2 max-w-sm mx-auto">
          <Input
            placeholder="paysafer.me/pay/username"
            className="bg-white/[0.04] border-white/[0.08] text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value
                if (val.includes("/pay/")) {
                  try {
                    const path = new URL(val.startsWith("http") ? val : `https://${val}`).pathname
                    router.push(path)
                  } catch {
                    toast.error("Invalid payment link")
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes scanLine {
          0%, 100% { top: 15%; }
          50% { top: 80%; }
        }
      `}</style>
    </GlassCard>
  )
}

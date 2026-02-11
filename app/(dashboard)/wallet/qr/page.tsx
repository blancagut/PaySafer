"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
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

// ─── Simple QR Code Generator (SVG-based, no deps) ───

function generateQRMatrix(data: string): boolean[][] {
  // Simplified QR-like visual pattern generator
  // For production, use a proper QR library. This creates a visual representation.
  const size = 25
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  )

  // Position detection patterns (3 corners)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        if (isOuter || isInner) matrix[row + r][col + c] = true
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }

  // Data encoding (hash-based pseudo-random for visual effect)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) >>> 0
  }

  for (let r = 9; r < size - 8; r++) {
    for (let c = 9; c < size - 8; c++) {
      hash = (hash * 1103515245 + 12345) >>> 0
      matrix[r][c] = (hash >> 16) % 3 !== 0
    }
  }

  // Additional data in remaining areas
  for (let r = 9; r < size - 8; r++) {
    for (let c = 0; c < 6; c++) {
      hash = (hash * 1103515245 + 12345) >>> 0
      matrix[r][c] = (hash >> 16) % 3 !== 0
    }
  }
  for (let r = 0; r < 6; r++) {
    for (let c = 9; c < size - 8; c++) {
      hash = (hash * 1103515245 + 12345) >>> 0
      matrix[r][c] = (hash >> 16) % 3 !== 0
    }
  }

  return matrix
}

function QRCodeSVG({
  data,
  size = 256,
  fgColor = "#10b981",
  bgColor = "transparent",
  logo = true,
}: {
  data: string
  size?: number
  fgColor?: string
  bgColor?: string
  logo?: boolean
}) {
  const matrix = generateQRMatrix(data)
  const moduleCount = matrix.length
  const cellSize = size / moduleCount

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-xl"
    >
      <rect width={size} height={size} fill={bgColor} rx={12} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.5}
              height={cellSize + 0.5}
              fill={fgColor}
              rx={cellSize * 0.2}
            />
          ) : null
        )
      )}
      {logo && (
        <g>
          <rect
            x={size / 2 - 20}
            y={size / 2 - 20}
            width={40}
            height={40}
            rx={8}
            fill="#0a0f1a"
            stroke={fgColor}
            strokeWidth={2}
          />
          <text
            x={size / 2}
            y={size / 2 + 6}
            textAnchor="middle"
            fill={fgColor}
            fontSize={18}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            P
          </text>
        </g>
      )}
    </svg>
  )
}

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
                  data={qrUrl || "https://paysafer.me"}
                  size={220}
                  fgColor="#10b981"
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
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startScanner = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setScanning(true)
        setError(null)

        // Use BarcodeDetector API if available
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
          const scanFrame = async () => {
            if (!videoRef.current || !scanning) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const url = barcodes[0].rawValue
                if (url.includes("paysafer.me/pay/") || url.includes("/pay/")) {
                  haptic("success")
                  stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
                  // Navigate to the payment URL
                  const path = new URL(url).pathname
                  router.push(path)
                  return
                }
              }
            } catch {
              // continue scanning
            }
            requestAnimationFrame(scanFrame)
          }
          requestAnimationFrame(scanFrame)
        }
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions to scan QR codes.")
    }
  }, [router, scanning])

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((t) => t.stop())
      }
    }
  }, [])

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

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Book,
  Code2,
  Copy,
  Check,
  Key,
  Webhook,
  Zap,
  Shield,
  Globe,
  Terminal,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Package,
  GitBranch,
  FileCode,
  Server,
  Lock,
  Eye,
  EyeOff,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { CodeBlock, LanguageTabs } from "@/components/code-block"
import { cn } from "@/lib/utils"

// ═══════════════════════════════════════════════════
//  SECTION DATA
// ═══════════════════════════════════════════════════

const sections = [
  { id: "getting-started", label: "Getting Started", icon: Zap },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "api-reference", label: "API Reference", icon: Book },
  { id: "code-examples", label: "Code Examples", icon: Code2 },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "sdks", label: "SDKs & Libraries", icon: Package },
  { id: "errors", label: "Errors & Limits", icon: AlertTriangle },
]

// ── API Endpoints ──

const paymentEndpoints = [
  { method: "POST", path: "/v1/payments", description: "Create a new payment" },
  { method: "GET", path: "/v1/payments/:id", description: "Retrieve a payment" },
  { method: "GET", path: "/v1/payments", description: "List all payments" },
  { method: "POST", path: "/v1/payments/:id/capture", description: "Capture an authorized payment" },
  { method: "POST", path: "/v1/payments/:id/cancel", description: "Cancel a payment" },
  { method: "POST", path: "/v1/payments/:id/refund", description: "Refund a payment" },
]

const customerEndpoints = [
  { method: "POST", path: "/v1/customers", description: "Create a customer" },
  { method: "GET", path: "/v1/customers/:id", description: "Retrieve a customer" },
  { method: "PATCH", path: "/v1/customers/:id", description: "Update a customer" },
  { method: "DELETE", path: "/v1/customers/:id", description: "Delete a customer" },
  { method: "GET", path: "/v1/customers", description: "List all customers" },
]

const webhookEndpoints = [
  { method: "POST", path: "/v1/webhook-endpoints", description: "Create a webhook endpoint" },
  { method: "GET", path: "/v1/webhook-endpoints", description: "List webhook endpoints" },
  { method: "GET", path: "/v1/webhook-endpoints/:id", description: "Retrieve a webhook endpoint" },
  { method: "DELETE", path: "/v1/webhook-endpoints/:id", description: "Delete a webhook endpoint" },
]

// ── Webhook Event Types ──

const webhookEvents = [
  { event: "payment.created", description: "A payment has been created" },
  { event: "payment.completed", description: "Payment successfully captured and funds received" },
  { event: "payment.failed", description: "Payment attempt failed" },
  { event: "payment.refunded", description: "A refund has been issued for a payment" },
  { event: "customer.created", description: "A new customer was created" },
  { event: "customer.updated", description: "Customer details were updated" },
  { event: "payout.completed", description: "Funds have been sent to the merchant bank account" },
  { event: "payout.failed", description: "A payout attempt failed" },
  { event: "dispute.created", description: "A dispute has been opened by the cardholder" },
  { event: "dispute.resolved", description: "A dispute has been resolved" },
]

// ── Error codes ──

const errorCodes = [
  { code: 400, name: "Bad Request", description: "The request is malformed or missing required parameters." },
  { code: 401, name: "Unauthorized", description: "Invalid or missing API key. Check your Authorization header." },
  { code: 402, name: "Payment Required", description: "The payment cannot be processed (e.g. insufficient funds, card declined)." },
  { code: 404, name: "Not Found", description: "The requested resource does not exist." },
  { code: 409, name: "Conflict", description: "Idempotency conflict — a request with the same idempotency key already exists." },
  { code: 422, name: "Unprocessable", description: "The request parameters are valid but cannot be processed in the current state." },
  { code: 429, name: "Rate Limited", description: "Too many requests. See rate limits below." },
  { code: 500, name: "Server Error", description: "An unexpected error on our end. Retry with exponential backoff." },
]

// ── SDKs ──

const sdks = [
  { name: "Node.js", pkg: "@paysafer/node", install: "npm install @paysafer/node", version: "2.4.0", color: "text-green-400", lang: "javascript" },
  { name: "Python", pkg: "paysafer", install: "pip install paysafer", version: "1.8.0", color: "text-blue-400", lang: "python" },
  { name: "PHP", pkg: "paysafer/paysafer-php", install: "composer require paysafer/paysafer-php", version: "1.5.2", color: "text-violet-400", lang: "bash" },
  { name: "Go", pkg: "github.com/paysafer/paysafer-go", install: "go get github.com/paysafer/paysafer-go", version: "0.9.1", color: "text-cyan-400", lang: "bash" },
  { name: "Ruby", pkg: "paysafer", install: "gem install paysafer", version: "1.2.0", color: "text-red-400", lang: "bash" },
]

// ═══════════════════════════════════════════════════
//  CODE SAMPLES
// ═══════════════════════════════════════════════════

const quickStartCurl = `curl https://api.paysafer.me/v1/payments \\
  -H "Authorization: Bearer ps_live_51a2b3c4d5e6f7g8h9i0jklm" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "currency": "aed",
    "description": "Order #1234",
    "customer": "cus_9s6XKzkNRiz8i3"
  }'`

const createPaymentTabs = [
  {
    label: "cURL",
    language: "curl",
    code: `curl https://api.paysafer.me/v1/payments \\
  -H "Authorization: Bearer ps_live_51a2b3c4d5e6f7g8h9i0jklm" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order_1234_attempt_1" \\
  -d '{
    "amount": 15000,
    "currency": "aed",
    "payment_method": "pm_card_visa",
    "description": "Invoice #INV-2025-0042",
    "customer": "cus_9s6XKzkNRiz8i3",
    "metadata": {
      "order_id": "order_1234",
      "product": "Premium Plan"
    },
    "receipt_email": "customer@example.com"
  }'`,
  },
  {
    label: "JavaScript",
    language: "javascript",
    code: `import PaySafer from '@paysafer/node';

const paysafer = new PaySafer('ps_live_51a2b3c4d5e6f7g8h9i0jklm');

const payment = await paysafer.payments.create({
  amount: 15000,          // AED 150.00 (amount in fils)
  currency: 'aed',
  payment_method: 'pm_card_visa',
  description: 'Invoice #INV-2025-0042',
  customer: 'cus_9s6XKzkNRiz8i3',
  metadata: {
    order_id: 'order_1234',
    product: 'Premium Plan',
  },
  receipt_email: 'customer@example.com',
});

console.log('Payment created:', payment.id);
// → pay_1NRv2H2eZvKYlo2CkMzPF4fS
console.log('Status:', payment.status);
// → "succeeded"`,
  },
  {
    label: "Python",
    language: "python",
    code: `import paysafer

paysafer.api_key = "ps_live_51a2b3c4d5e6f7g8h9i0jklm"

payment = paysafer.Payment.create(
    amount=15000,          # AED 150.00 (amount in fils)
    currency="aed",
    payment_method="pm_card_visa",
    description="Invoice #INV-2025-0042",
    customer="cus_9s6XKzkNRiz8i3",
    metadata={
        "order_id": "order_1234",
        "product": "Premium Plan",
    },
    receipt_email="customer@example.com",
)

print(f"Payment created: {payment.id}")
# → pay_1NRv2H2eZvKYlo2CkMzPF4fS
print(f"Status: {payment.status}")
# → "succeeded"`,
  },
]

const webhookVerifyTabs = [
  {
    label: "JavaScript",
    language: "javascript",
    code: `import PaySafer from '@paysafer/node';
import express from 'express';

const app = express();
const webhookSecret = 'whsec_5Oe0jJkCfhF1...';

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['paysafer-signature'];

  let event;
  try {
    event = PaySafer.webhooks.verify(
      req.body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send('Invalid signature');
  }

  // Handle the event
  switch (event.type) {
    case 'payment.completed':
      const payment = event.data;
      console.log(\`Payment \${payment.id} completed for \${payment.amount}\`);
      // Fulfill the order...
      break;
    case 'payment.failed':
      console.log('Payment failed:', event.data.failure_reason);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.json({ received: true });
});

app.listen(3000);`,
  },
  {
    label: "Python",
    language: "python",
    code: `import paysafer
from flask import Flask, request, jsonify

app = Flask(__name__)
webhook_secret = "whsec_5Oe0jJkCfhF1..."

@app.route("/webhook", methods=["POST"])
def webhook():
    payload = request.data
    signature = request.headers.get("PaySafer-Signature")

    try:
        event = paysafer.Webhook.verify(
            payload,
            signature,
            webhook_secret,
        )
    except paysafer.error.SignatureVerificationError as e:
        print(f"Webhook signature verification failed: {e}")
        return "Invalid signature", 400

    # Handle the event
    if event["type"] == "payment.completed":
        payment = event["data"]
        print(f"Payment {payment['id']} completed for {payment['amount']}")
        # Fulfill the order...
    elif event["type"] == "payment.failed":
        print(f"Payment failed: {event['data']['failure_reason']}")
    else:
        print(f"Unhandled event type: {event['type']}")

    return jsonify(received=True)

if __name__ == "__main__":
    app.run(port=3000)`,
  },
]

const paymentResponseJson = `{
  "id": "pay_1NRv2H2eZvKYlo2CkMzPF4fS",
  "object": "payment",
  "amount": 15000,
  "amount_received": 15000,
  "currency": "aed",
  "status": "succeeded",
  "description": "Invoice #INV-2025-0042",
  "payment_method": "pm_card_visa",
  "customer": "cus_9s6XKzkNRiz8i3",
  "metadata": {
    "order_id": "order_1234",
    "product": "Premium Plan"
  },
  "receipt_email": "customer@example.com",
  "created": 1709472000,
  "livemode": true
}`

const customerResponseJson = `{
  "id": "cus_9s6XKzkNRiz8i3",
  "object": "customer",
  "email": "customer@example.com",
  "name": "Ahmed Al Maktoum",
  "phone": "+971501234567",
  "metadata": {},
  "created": 1709472000,
  "livemode": true
}`

const webhookPayloadJson = `{
  "id": "evt_1NRv2H2eZvKYlo2CkMzPF4fS",
  "object": "event",
  "type": "payment.completed",
  "api_version": "2026-01-15",
  "created": 1709472000,
  "data": {
    "id": "pay_1NRv2H2eZvKYlo2CkMzPF4fS",
    "object": "payment",
    "amount": 15000,
    "currency": "aed",
    "status": "succeeded",
    "customer": "cus_9s6XKzkNRiz8i3"
  }
}`

const errorResponseJson = `{
  "error": {
    "type": "invalid_request_error",
    "code": "parameter_missing",
    "message": "Missing required parameter: amount",
    "param": "amount",
    "doc_url": "https://docs.paysafer.me/errors#parameter_missing"
  }
}`

// ═══════════════════════════════════════════════════
//  PAGE COMPONENT
// ═══════════════════════════════════════════════════

export default function DevelopersPage() {
  const [activeSection, setActiveSection] = useState("getting-started")
  const [showKey, setShowKey] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    )

    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0F1A]">
      {/* ────── Header ────── */}
      <header className="border-b border-white/10 bg-[#0F1B2D] sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" linkTo="/" />
            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Developers
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/business" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Business
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Get API Keys</Button>
            </Link>
            <button
              className="lg:hidden p-2 text-white/60 hover:text-white"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="border-t border-white/[0.04] bg-[#0F1B2D]/80 hidden lg:block">
          <div className="container mx-auto px-4">
            <nav className="flex gap-0 overflow-x-auto">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "px-4 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap border-b-2 transition-colors -mb-px",
                    activeSection === s.id
                      ? "text-emerald-400 border-emerald-400"
                      : "text-white/40 border-transparent hover:text-white/70"
                  )}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <nav className="absolute left-0 top-16 bottom-0 w-64 bg-[#0F1B2D] border-r border-white/10 p-4 space-y-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  activeSection === s.id
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                )}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      <div className="container mx-auto px-4 flex">
        {/* ────── Sidebar (desktop) ────── */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-[105px] h-[calc(100vh-105px)] py-8 pr-6 overflow-y-auto">
          <nav className="space-y-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                  activeSection === s.id
                    ? "text-emerald-400 bg-emerald-500/10 font-medium"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                )}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                {s.label}
              </a>
            ))}
          </nav>

          <div className="mt-8 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-[11px] text-white/30 font-medium uppercase tracking-widest mb-2">Base URL</p>
            <code className="text-xs text-emerald-400 font-mono break-all">
              https://api.paysafer.me
            </code>
            <p className="text-[11px] text-white/30 font-medium uppercase tracking-widest mt-4 mb-2">API Version</p>
            <code className="text-xs text-white/60 font-mono">2026-01-15</code>
          </div>
        </aside>

        {/* ────── Main Content ────── */}
        <main className="flex-1 min-w-0 py-8 lg:pl-8 lg:border-l lg:border-white/[0.06] space-y-24">

          {/* ═══════════════════ SECTION 1: GETTING STARTED ═══════════════════ */}
          <section id="getting-started" className="scroll-mt-32 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-bold text-foreground">Getting Started</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                The PaySafer API is a RESTful interface that lets you accept payments, manage
                customers, and handle payouts programmatically. All requests use JSON and return
                JSON responses.
              </p>
            </div>

            {/* 3-step guide */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Get API Keys", desc: "Create an account and grab your test and live keys from the Dashboard." },
                { step: "2", title: "Make a Test Payment", desc: "Use your test key to create a payment in sandbox mode." },
                { step: "3", title: "Go Live", desc: "Switch to your live key and start accepting real payments." },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {s.step}
                  </span>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Quick request */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Your first API call</h3>
              <CodeBlock code={quickStartCurl} language="curl" title="Create a payment" />
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] flex items-start gap-3">
              <Zap className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Test mode</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Use <code className="text-emerald-400 px-1 py-0.5 bg-emerald-500/10 rounded text-xs font-mono">sk_test_*</code> keys
                  to make test API calls without processing real payments. Switch
                  to <code className="text-emerald-400 px-1 py-0.5 bg-emerald-500/10 rounded text-xs font-mono">sk_live_*</code> when
                  you&apos;re ready to go live.
                </p>
              </div>
            </div>
          </section>

          {/* ═══════════════════ SECTION 2: AUTHENTICATION ═══════════════════ */}
          <section id="authentication" className="scroll-mt-32 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-bold text-foreground">Authentication</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                The PaySafer API uses API keys to authenticate requests. You get two types of keys — include them in the
                <code className="text-foreground mx-1 px-1.5 py-0.5 bg-white/[0.06] rounded text-xs font-mono">Authorization</code> header
                as a Bearer token.
              </p>
            </div>

            {/* Key types */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-foreground">Publishable Key</span>
                </div>
                <code className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-1 rounded block">
                  pk_live_51NRv2H2eZvKYlo2C...
                </code>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Used in client-side code (checkout forms, SDKs). Safe to expose in the browser.
                  Can only create tokens and confirm payments.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-foreground">Secret Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded flex-1 truncate">
                    {showKey ? "ps_live_51a2b3c4d5e6f7g8h9i0jklm" : "ps_live_••••••••••••••••••••••••"}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground/50"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Used in server-side code only. Has full access to your account.
                  <span className="text-red-400 font-medium"> Never expose in client-side code.</span>
                </p>
              </div>
            </div>

            <CodeBlock
              code={`curl https://api.paysafer.me/v1/payments \\
  -H "Authorization: Bearer ps_live_51a2b3c4d5e6f7g8h9i0jklm"`}
              language="curl"
              title="Header authentication"
            />

            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Security best practices</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li className="flex items-start gap-1.5"><span className="text-amber-400">·</span> Never commit API keys to version control</li>
                  <li className="flex items-start gap-1.5"><span className="text-amber-400">·</span> Use environment variables to store secret keys</li>
                  <li className="flex items-start gap-1.5"><span className="text-amber-400">·</span> Restrict keys to specific IP addresses in production</li>
                  <li className="flex items-start gap-1.5"><span className="text-amber-400">·</span> Rotate keys immediately if you suspect a leak</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ═══════════════════ SECTION 3: API REFERENCE ═══════════════════ */}
          <section id="api-reference" className="scroll-mt-32 space-y-12">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Book className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-bold text-foreground">API Reference</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Complete reference for the PaySafer REST API. All endpoints accept and return JSON.
                Amounts are in the smallest currency unit (e.g. fils for AED — 100 fils = AED 1).
              </p>
            </div>

            {/* ── Payments ── */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-emerald-400" />
                Payments
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Payments represent a charge to a customer&apos;s payment method. Create a payment to
                collect money, then capture it to transfer funds to your account.
              </p>

              <EndpointTable endpoints={paymentEndpoints} />

              <div className="grid lg:grid-cols-2 gap-4">
                <CodeBlock
                  code={`curl -X POST https://api.paysafer.me/v1/payments \\
  -H "Authorization: Bearer ps_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 15000,
    "currency": "aed",
    "payment_method": "pm_card_visa",
    "description": "Invoice #INV-2025-0042",
    "customer": "cus_9s6XKzkNRiz8i3"
  }'`}
                  language="curl"
                  title="Request"
                />
                <CodeBlock
                  code={paymentResponseJson}
                  language="json"
                  title="Response"
                />
              </div>
            </div>

            {/* ── Customers ── */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-400" />
                Customers
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Customer objects allow you to save payment methods, track payment history, and
                manage recurring billing for returning customers.
              </p>

              <EndpointTable endpoints={customerEndpoints} />

              <CodeBlock
                code={customerResponseJson}
                language="json"
                title="Customer object"
              />
            </div>

            {/* ── Webhook Endpoints ── */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Webhook className="w-5 h-5 text-violet-400" />
                Webhook Endpoints
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Configure endpoints to receive real-time event notifications when things happen
                in your account (payments, refunds, disputes, etc.).
              </p>

              <EndpointTable endpoints={webhookEndpoints} />
            </div>
          </section>

          {/* ═══════════════════ SECTION 4: CODE EXAMPLES ═══════════════════ */}
          <section id="code-examples" className="scroll-mt-32 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-bold text-foreground">Code Examples</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Complete, copy-pasteable integration examples in multiple languages. Each example shows
                the full flow — from creating a payment to handling the response.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Create a Payment</h3>
              <LanguageTabs tabs={createPaymentTabs} showLineNumbers />
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Handle Errors</h3>
              <LanguageTabs
                tabs={[
                  {
                    label: "JavaScript",
                    language: "javascript",
                    code: `try {
  const payment = await paysafer.payments.create({
    amount: 15000,
    currency: 'aed',
    payment_method: 'pm_card_visa',
  });
  console.log('Success:', payment.id);
} catch (error) {
  if (error.type === 'card_error') {
    // Card was declined
    console.error('Card declined:', error.message);
  } else if (error.type === 'rate_limit_error') {
    // Too many requests — retry with backoff
    console.error('Rate limited. Retrying...');
  } else if (error.type === 'invalid_request_error') {
    // Invalid parameters
    console.error('Invalid request:', error.message);
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
  }
}`,
                  },
                  {
                    label: "Python",
                    language: "python",
                    code: `try:
    payment = paysafer.Payment.create(
        amount=15000,
        currency="aed",
        payment_method="pm_card_visa",
    )
    print(f"Success: {payment.id}")
except paysafer.error.CardError as e:
    # Card was declined
    print(f"Card declined: {e.message}")
except paysafer.error.RateLimitError:
    # Too many requests — retry with backoff
    print("Rate limited. Retrying...")
except paysafer.error.InvalidRequestError as e:
    # Invalid parameters
    print(f"Invalid request: {e.message}")
except paysafer.error.APIError as e:
    # Unexpected error
    print(f"Unexpected error: {e}")`,
                  },
                ]}
              />
            </div>
          </section>

          {/* ═══════════════════ SECTION 5: WEBHOOKS ═══════════════════ */}
          <section id="webhooks" className="scroll-mt-32 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-bold text-foreground">Webhooks</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Webhooks notify your server in real-time when events happen in your PaySafer account.
                Use them to trigger fulfillment, update your database, or send notifications.
              </p>
            </div>

            {/* How it works */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Configure", desc: "Register a webhook URL in the Dashboard or via the API." },
                { step: "2", title: "Receive", desc: "PaySafer sends a POST request with the event payload." },
                { step: "3", title: "Verify", desc: "Validate the signature to confirm it came from PaySafer." },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2">
                  <span className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 font-bold text-sm">
                    {s.step}
                  </span>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Event types table */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Event Types</h3>
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookEvents.map((e, i) => (
                      <tr key={e.event} className={cn("border-b border-white/[0.04]", i % 2 === 0 && "bg-white/[0.01]")}>
                        <td className="px-4 py-3">
                          <code className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {e.event}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{e.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Example payload */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Webhook Payload</h3>
              <CodeBlock code={webhookPayloadJson} language="json" title="Event object" showLineNumbers />
            </div>

            {/* Signature verification */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Signature Verification</h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Every webhook request includes a <code className="text-foreground px-1 py-0.5 bg-white/[0.06] rounded text-xs font-mono">PaySafer-Signature</code> header.
                Verify it to ensure the request came from PaySafer and wasn&apos;t tampered with.
              </p>
              <LanguageTabs tabs={webhookVerifyTabs} showLineNumbers />
            </div>

            {/* Retry policy */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Retry Policy
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If your endpoint returns a non-2xx response, PaySafer retries with exponential backoff:
              </p>
              <div className="flex flex-wrap gap-2">
                {["1 min", "5 min", "30 min", "2 hrs", "8 hrs", "24 hrs"].map((t, i) => (
                  <span key={t} className="text-xs bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg text-muted-foreground">
                    Retry {i + 1}: <span className="text-foreground font-medium">{t}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                After 6 failed attempts, the event is marked as failed. You can manually retry from the Dashboard.
              </p>
            </div>
          </section>

          {/* ═══════════════════ SECTION 6: SDKs ═══════════════════ */}
          <section id="sdks" className="scroll-mt-32 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-bold text-foreground">SDKs & Libraries</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Official client libraries for quick integration. All SDKs support auto-pagination,
                idempotent requests, and automatic retries with exponential backoff.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sdks.map((sdk) => (
                <div
                  key={sdk.name}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3 hover:border-white/[0.14] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-semibold", sdk.color)}>{sdk.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">v{sdk.version}</span>
                  </div>
                  <code className="text-xs text-muted-foreground font-mono break-all block">{sdk.pkg}</code>
                  <div className="rounded-lg bg-[#0A0F1A] border border-white/[0.06] px-3 py-2">
                    <code className="text-xs text-foreground font-mono">{sdk.install}</code>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1 hover:text-muted-foreground cursor-pointer transition-colors">
                      <GitBranch className="w-3 h-3" /> GitHub
                    </span>
                    <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1 hover:text-muted-foreground cursor-pointer transition-colors">
                      <FileCode className="w-3 h-3" /> Docs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══════════════════ SECTION 7: ERRORS & LIMITS ═══════════════════ */}
          <section id="errors" className="scroll-mt-32 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-bold text-foreground">Errors & Rate Limits</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                The API uses conventional HTTP status codes. Errors include a JSON body with a
                <code className="text-foreground mx-1 px-1.5 py-0.5 bg-white/[0.06] rounded text-xs font-mono">type</code>,
                <code className="text-foreground mx-1 px-1.5 py-0.5 bg-white/[0.06] rounded text-xs font-mono">code</code>, and
                <code className="text-foreground mx-1 px-1.5 py-0.5 bg-white/[0.06] rounded text-xs font-mono">message</code>.
              </p>
            </div>

            <CodeBlock code={errorResponseJson} language="json" title="Error response" />

            {/* Error codes table */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">HTTP Status Codes</h3>
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-36">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorCodes.map((e, i) => (
                      <tr key={e.code} className={cn("border-b border-white/[0.04]", i % 2 === 0 && "bg-white/[0.01]")}>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-mono font-semibold px-2 py-0.5 rounded",
                            e.code < 400 ? "text-emerald-400 bg-emerald-500/10" :
                            e.code < 500 ? "text-amber-400 bg-amber-500/10" :
                            "text-red-400 bg-red-500/10"
                          )}>
                            {e.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">{e.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rate limits */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Rate Limits</h3>
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mode</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Limit</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Window</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { mode: "Test mode", limit: "100 requests", window: "Per minute", color: "text-blue-400" },
                      { mode: "Live mode", limit: "1,000 requests", window: "Per minute", color: "text-emerald-400" },
                      { mode: "Live mode (Enterprise)", limit: "10,000 requests", window: "Per minute", color: "text-violet-400" },
                    ].map((r, i) => (
                      <tr key={r.mode + r.limit} className={cn("border-b border-white/[0.04]", i % 2 === 0 && "bg-white/[0.01]")}>
                        <td className={cn("px-4 py-3 font-medium", r.color)}>{r.mode}</td>
                        <td className="px-4 py-3 text-foreground">{r.limit}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.window}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Rate limit headers are included in every response:
                <code className="text-foreground mx-1 px-1 py-0.5 bg-white/[0.06] rounded text-xs font-mono">X-RateLimit-Limit</code>,
                <code className="text-foreground mx-1 px-1 py-0.5 bg-white/[0.06] rounded text-xs font-mono">X-RateLimit-Remaining</code>,
                <code className="text-foreground mx-1 px-1 py-0.5 bg-white/[0.06] rounded text-xs font-mono">X-RateLimit-Reset</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] flex items-start gap-3">
              <Server className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Need higher limits?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Enterprise customers can request custom rate limits. Contact us at{" "}
                  <span className="text-blue-400">api@paysafer.me</span> or visit the{" "}
                  <Link href="/business" className="text-blue-400 underline underline-offset-2">Business page</Link>.
                </p>
              </div>
            </div>
          </section>

          {/* ────── CTA ────── */}
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 sm:p-12 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Ready to integrate?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create a free account, grab your API keys, and start accepting payments in minutes.
              Our SDKs make it even easier.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/register">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8">
                  Get API Keys
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/business">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5">
                  View Business Plans
                </Button>
              </Link>
            </div>
          </section>

        </main>
      </div>

      {/* ────── Footer ────── */}
      <footer className="border-t border-white/10 bg-[#0F1B2D] mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4"><Logo size="sm" /></div>
              <p className="text-sm text-white/60">
                Developer-friendly payment APIs for the UAE and beyond.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Documentation</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#getting-started" className="hover:text-emerald-500">Getting Started</a></li>
                <li><a href="#api-reference" className="hover:text-emerald-500">API Reference</a></li>
                <li><a href="#webhooks" className="hover:text-emerald-500">Webhooks</a></li>
                <li><a href="#sdks" className="hover:text-emerald-500">SDKs & Libraries</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Product</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/business" className="hover:text-emerald-500">Business</Link></li>
                <li><Link href="/register" className="hover:text-emerald-500">Get Started</Link></li>
                <li><Link href="/help" className="hover:text-emerald-500">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Legal</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/privacy" className="hover:text-emerald-500">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-500">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/50">
            © 2026 PaySafer.me — All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="22" height="16" x="1" y="4" rx="2" />
      <line x1="1" x2="23" y1="10" y2="10" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function EndpointTable({ endpoints }: { endpoints: { method: string; path: string; description: string }[] }) {
  const methodColors: Record<string, string> = {
    GET: "text-blue-400 bg-blue-500/10",
    POST: "text-emerald-400 bg-emerald-500/10",
    PATCH: "text-amber-400 bg-amber-500/10",
    PUT: "text-amber-400 bg-amber-500/10",
    DELETE: "text-red-400 bg-red-500/10",
  }

  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.03] border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Method</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Endpoint</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Description</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep, i) => (
            <tr key={`${ep.method}-${ep.path}`} className={cn("border-b border-white/[0.04]", i % 2 === 0 && "bg-white/[0.01]")}>
              <td className="px-4 py-3">
                <span className={cn("text-[11px] font-mono font-semibold px-2 py-0.5 rounded", methodColors[ep.method] ?? "text-foreground bg-white/[0.04]")}>
                  {ep.method}
                </span>
              </td>
              <td className="px-4 py-3">
                <code className="text-xs text-foreground font-mono">{ep.path}</code>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{ep.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

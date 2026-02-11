# Stripe API Integration Setup

## ✅ Connected Keys

All Stripe API keys have been successfully configured in your `.env.local` file:

### 1. **Server-Side Secret Key** (LIVE MODE)
```
STRIPE_SECRET_KEY=sk_live_51SmWpGCCo4W6Mp46...
```
**Usage:**
- [lib/stripe/server.ts](lib/stripe/server.ts) - Main Stripe server instance
- [lib/stripe/checkout.ts](lib/stripe/checkout.ts) - Checkout session creation
- All server-side Stripe API operations

**Security:** ⚠️ NEVER expose this key in client-side code or version control

---

### 2. **Client-Side Publishable Key** (LIVE MODE)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51SmWpGCCo4W6Mp46...
```
**Usage:**
- [lib/stripe/client.ts](lib/stripe/client.ts) - Client-side Stripe.js initialization
- Payment forms, card elements, and other Stripe Elements
- Client-side components that interact with Stripe

**Security:** ✅ Safe to expose in browser (public key)

---

### 3. **Webhook Signature Secret**
```
STRIPE_WEBHOOK_SECRET=whsec_EAib31M6Ger8X9ZcNzgbRSxLQYYuhdTS
```
**Usage:**
- [app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts) - Webhook endpoint
- [lib/webhooks/config.ts](lib/webhooks/config.ts) - Webhook configuration
- Webhook signature verification and validation

**Security:** ⚠️ Keep secret - used for cryptographic verification

---

## 📁 File Structure

```
lib/
├── stripe/
│   ├── server.ts          → Server-side Stripe instance (uses STRIPE_SECRET_KEY)
│   ├── client.ts          → Client-side Stripe.js loader (uses NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
│   ├── checkout.ts        → Checkout session creation
│   └── webhook-processor.ts → Webhook event processing
│
└── webhooks/
    ├── config.ts          → Webhook config (uses STRIPE_WEBHOOK_SECRET)
    ├── signature.ts       → Signature verification
    └── crypto.ts          → Cryptographic utilities

app/
└── api/
    └── webhooks/
        └── stripe/
            └── route.ts   → Webhook intake endpoint
```

---

## 🚀 Quick Start

### Server-Side Usage
```typescript
import { stripe } from '@/lib/stripe/server'

// Example: Create a charge
const charge = await stripe.charges.create({
  amount: 2000,
  currency: 'usd',
  source: 'tok_visa',
})
```

### Client-Side Usage
```typescript
import { getStripe } from '@/lib/stripe/client'

// Example: Initialize Stripe Elements
const stripe = await getStripe()
const elements = stripe?.elements()
```

### Webhook Handling
The webhook endpoint at `/api/webhooks/stripe` automatically:
1. ✅ Verifies webhook signatures using `STRIPE_WEBHOOK_SECRET`
2. ✅ Validates timestamp freshness
3. ✅ Logs verification results
4. ✅ Returns appropriate HTTP status codes

---

## ⚙️ Configuration

### Environment Variables
All keys are configured in `.env.local`:

| Variable | Type | Usage |
|----------|------|-------|
| `STRIPE_SECRET_KEY` | Server | Server-side API calls |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Browser-side Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | Server | Webhook verification |
| `WEBHOOK_TIMESTAMP_TOLERANCE` | Server | Webhook time window (300s) |

### Development vs Production

**Current Setup: LIVE MODE** 🔴
- Keys start with `sk_live_*` and `pk_live_*`
- *Processes real payments*
- *Charges real cards*

**For Testing/Development:**
Use TEST mode keys instead:
- `sk_test_*` (secret key)
- `pk_test_*` (publishable key)
- `whsec_test_*` (webhook secret)

---

## 🔐 Security Notes

1. **Secret Key Protection**
   - Never commit `STRIPE_SECRET_KEY` to git
   - Never send to client-side code
   - Use only in server-side files

2. **Webhook Secret**
   - Required for signature verification
   - Get from [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
   - Regenerate if compromised

3. **Environment Files**
   - `.env.local` is gitignored ✅
   - `.env.example` has placeholders only ✅
   - Production keys set in Vercel/hosting platform

---

## 🔗 Stripe Dashboard Links

- **API Keys**: https://dashboard.stripe.com/apikeys
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Test Mode**: Toggle in top-left of dashboard
- **Logs**: https://dashboard.stripe.com/logs

---

## ✅ Status

- [x] Server-side secret key configured
- [x] Client-side publishable key configured
- [x] Webhook secret configured
- [x] Client-side Stripe.js helper created
- [x] Server-side Stripe instance configured
- [x] Webhook verification configured
- [x] Documentation complete

**All Stripe APIs are now connected and ready to use! 🎉**

# PaySafer — Deployment Checklist

Everything code-related is ready. Follow these steps in order to go live.

---

## Step 1: Run the AML SQL Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file `supabase/DEPLOY_AML_ALL.sql` (copy the entire content)
3. Paste it in the SQL Editor and click **Run**
4. You should see "Success. No rows returned." — that means it worked

> This creates the AML compliance tables and storage bucket. It's safe to run multiple times (idempotent).

---

## Step 2: Create the Treasury User

This is the PAYSAFERME LLC account that receives confiscated funds.

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **Add User** → **Create New User**
   - Email: `treasury@paysafer.site` (or your company email)
   - Password: (strong password — save it somewhere safe)
3. After creation, click on the user → copy the **User UID** (a long UUID like `a1b2c3d4-e5f6-...`)
4. Save this UUID — you'll need it for Step 3

---

## Step 3: Set Environment Variables

### For local development (.env.local)

Create a file called `.env.local` in the project root. Use `.env.example` as template:

```bash
# Supabase (get from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=https://www.paysafer.site

# Stripe (get from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_live_your-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Resend (get from resend.com → API Keys)
RESEND_API_KEY=re_your-key
RESEND_FROM_EMAIL=PaySafer <notifications@paysafer.site>

# OpenAI (get from platform.openai.com → API Keys)
OPENAI_API_KEY=sk-your-openai-key

# Web Push VAPID (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_EMAIL=mailto:support@paysafer.site

# Admin & Treasury
SUPER_ADMIN_EMAIL=renzocarlosme@gmail.com
PAYSAFER_TREASURY_USER_ID=paste-the-uuid-from-step-2
```

### For Vercel production

Go to **Vercel Dashboard** → your project → **Settings** → **Environment Variables**
Add ALL the same variables from above (use production/live keys, not test keys).

---

## Step 4: Configure Stripe Webhooks

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://www.paysafer.site/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`
   - `charge.dispute.closed`
   - `transfer.created`
   - `payout.paid`
   - `payout.failed`
5. Click **Add endpoint**
6. Copy the **Signing Secret** (starts with `whsec_`) → put it in `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Configure Resend (Email)

1. Go to **resend.com** → **Domains**
2. Add `paysafer.site` and verify DNS records
3. After verification, emails will send from `notifications@paysafer.site`

---

## Step 6: Generate VAPID Keys (Push Notifications)

Run this command once:
```bash
npx web-push generate-vapid-keys
```
Copy the Public Key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
Copy the Private Key → `VAPID_PRIVATE_KEY`

---

## Step 7: Deploy to Vercel

### Option A: Via Git (recommended)
1. Push your code to GitHub
2. Go to **vercel.com** → **New Project** → Import your repo
3. Framework: Next.js (auto-detected)
4. Make sure all env vars from Step 3 are set
5. Click **Deploy**

### Option B: Via CLI
```bash
npm install -g vercel
vercel --prod
```

---

## Step 8: Post-Deploy Verification

Test these 10 critical flows:

| # | Test | How |
|---|------|-----|
| 1 | Landing page loads | Visit `https://www.paysafer.site` |
| 2 | Registration works | Create a new account |
| 3 | Login works | Log in with the new account |
| 4 | Dashboard loads | Should redirect to `/dashboard` after login |
| 5 | Wallet page works | Go to `/wallet` |
| 6 | Create offer works | Go to `/transactions/new`, fill out form |
| 7 | Messages load | Go to `/messages` |
| 8 | Admin panel loads | Log in as `renzocarlosme@gmail.com`, go to `/admin` |
| 9 | AML tab works | In admin, click the "AML Review" tab |
| 10 | Push notifications | Enable notifications when prompted |

---

## Quick Reference

| Item | Value |
|------|-------|
| Domain | `www.paysafer.site` |
| Super Admin | `renzocarlosme@gmail.com` |
| Treasury Account | `treasury@paysafer.site` (UUID in env var) |
| Webhook URL | `https://www.paysafer.site/api/webhooks/stripe` |
| SQL Migration | `supabase/DEPLOY_AML_ALL.sql` |

---

## If Something Goes Wrong

- **Build fails on Vercel**: Check that ALL env vars are set (especially `SUPABASE_SERVICE_ROLE_KEY`)
- **Pages show "Server Error"**: Check Vercel logs → Function Logs
- **Emails not sending**: Make sure Resend domain is verified + `RESEND_API_KEY` is set
- **Push not working**: Regenerate VAPID keys and update both env vars
- **Stripe not receiving webhooks**: Check endpoint URL in Stripe dashboard is correct
- **Admin panel "Not authorized"**: Make sure you're logged in as `renzocarlosme@gmail.com` (or the email in `SUPER_ADMIN_EMAIL`)

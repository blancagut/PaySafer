# 🚀 NEXT STEPS - Complete Supabase Setup

## ✅ What's Done

- ✅ Supabase packages installed
- ✅ Environment variables configured
- ✅ Auth pages wired (login, register, forgot-password)
- ✅ Middleware for route protection
- ✅ Server actions for transactions, disputes, profiles
- ✅ Database schema ready to deploy
- ✅ Dev server running successfully

## 🔴 CRITICAL: Run Database Schema

**YOU MUST DO THIS NOW** to make the app functional:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ecnbuxadkxnfdoahmblx
2. Click **SQL Editor** in the left sidebar
3. Open the file `supabase/schema.sql` in this project
4. Copy the ENTIRE contents (Ctrl+A, Ctrl+C)
5. Paste into the SQL Editor
6. Click **Run** or press Ctrl+Enter
7. Wait for "Success. No rows returned" message

This will create:
- All tables (profiles, transactions, disputes, etc.)
- Row-level security policies
- Triggers for auto-profile creation
- Storage buckets for evidence files

## 📝 Test the App

### 1. Create an Account
- Go to: http://localhost:3000/register
- Sign up with your email
- Check email for verification link (Supabase will send it)
- Verify your email

### 2. Login
- Go to: http://localhost:3000/login
- Use your credentials
- You'll be redirected to /dashboard

### 3. Create a Transaction
- Click "New Transaction" in sidebar
- Fill in:
  - Amount: 100
  - Currency: USD
  - Seller Email: test@example.com (can be any email)
  - Description: Test transaction
- Click through the wizard

### 4. View Dashboard
- Check dashboard shows your transaction
- Profile page shows your info
- Settings page works

## 🔧 Wiring Real Data to Pages

The app is now functional, but some pages still show mock data. Here's what needs updating:

### Priority 1 - Core Functionality (DONE ✅)
- ✅ Login/Register/Forgot Password
- ✅ Dashboard layout with user info
- ✅ Route protection
- ✅ Server actions created

### Priority 2 - Wire Dashboard Pages
These pages need to call the server actions instead of using mock data:

1. **Dashboard page** (`app/(dashboard)/dashboard/page.tsx`)
   - Call `getTransactionStats()` for stats cards
   - Call `getUserTransactions()` for recent transactions

2. **Transactions list** (`app/(dashboard)/transactions/page.tsx`)
   - Call `getUserTransactions()` with filters

3. **Transaction detail** (`app/(dashboard)/transactions/[id]/page.tsx`)
   - Call `getTransaction(id)`
   - Wire up status update buttons to `updateTransactionStatus()`

4. **New transaction** (`app/(dashboard)/transactions/new/page.tsx`)
   - Wire form submission to `createTransaction()`

5. **Disputes list** (`app/(dashboard)/disputes/page.tsx`)
   - Call `getUserDisputes()`

6. **Profile page** (`app/(dashboard)/profile/page.tsx`)
   - Call `getProfile()`
   - Wire update form to `updateProfile()`

7. **Settings page** (`app/(dashboard)/settings/page.tsx`)
   - Wire password change to `updatePassword()`

## 🎨 Example: Wiring Dashboard Page

Here's how to replace mock data in dashboard:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getTransactionStats, getUserTransactions } from '@/lib/actions/transactions'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const [statsRes, transactionsRes] = await Promise.all([
        getTransactionStats(),
        getUserTransactions()
      ])
      
      if (statsRes.data) setStats(statsRes.data)
      if (transactionsRes.data) setTransactions(transactionsRes.data)
      setLoading(false)
    }
    
    loadData()
  }, [])

  if (loading) return <div>Loading...</div>

  // ... rest of your component using real data
}
```

## 🌐 Deploy to Vercel

Once you're ready:

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Supabase integration complete"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to https://vercel.com
2. Import your GitHub repository
3. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ecnbuxadkxnfdoahmblx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```
4. Deploy!

### 3. Update Supabase Settings
In Supabase Dashboard → Authentication → URL Configuration:
- Add your Vercel URL to **Site URL**
- Add to **Redirect URLs**: `https://your-app.vercel.app/**`

## 🔮 Future Enhancements (After Basic Wiring)

1. **Stripe Integration**
   - Add actual payment processing
   - Webhook handlers for payment events

2. **Email Notifications**
   - Transaction status changes
   - Dispute updates
   - Welcome emails

3. **File Uploads**
   - Evidence uploads for disputes
   - Profile avatars
   - Wire to Supabase Storage

4. **Admin Dashboard**
   - Dispute resolution interface
   - Transaction monitoring
   - User management

## 📚 Useful Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [shadcn/ui](https://ui.shadcn.com/)

## 🐛 Troubleshooting

### "Not authenticated" errors
- Make sure you're logged in
- Check browser console for errors
- Verify environment variables are set

### Database errors
- Ensure you ran the schema.sql
- Check Supabase Dashboard → Database → Tables
- Look at RLS policies

### Build errors
- Run `npm install --legacy-peer-deps` again
- Delete `.next` folder and rebuild
- Check for TypeScript errors

## 📞 Need Help?

The backend structure is complete and functional. The remaining work is mostly:
1. Running the schema.sql (critical!)
2. Replacing mock data with server action calls
3. Testing each flow end-to-end

All the hard parts (auth, middleware, RLS, server actions) are done! 🎉

---

## 🤖 AI Features Setup (OpenAI)

### 1. Add your OpenAI API key

Add this to your `.env.local`:

```
OPENAI_API_KEY=sk-...your-key-here...
```

Get a key from https://platform.openai.com/api-keys

### 2. Run AI database tables

In the Supabase SQL Editor, run these files **in order**:

1. `supabase/ai_usage.sql` — AI usage logging table
2. `supabase/translations.sql` — Translation cache table
3. `supabase/scam_flags.sql` — Scam detection flags table
4. `supabase/ai_tables.sql` — Support messages AI flag

### 3. What's included

| Feature | Model | Where |
|---------|-------|-------|
| Scam Detection | GPT-4o-mini | Background, every 5th chat message |
| AI Support Agent | GPT-4o-mini / GPT-4o | Support chat widget (FAQ → AI → Live) |
| Translation (16 languages) | GPT-4o-mini | User-triggered, cached in DB |
| Offer Optimizer | GPT-4o-mini | Button-triggered on offer creation |

### 4. Cost estimate per 1,000 active users/month

| Feature | Calls/mo | Tokens/call | Model | Est. cost |
|---------|----------|-------------|-------|-----------|
| Scam Detection | ~2,000 | ~800 | 4o-mini | ~$0.24 |
| Support Agent | ~1,500 | ~1,200 | 4o-mini | ~$0.27 |
| Translation | ~3,000 | ~200 | 4o-mini | ~$0.09 |
| Offer Optimizer | ~500 | ~600 | 4o-mini | ~$0.05 |
| **Total** | | | | **~$0.65/mo** |

All usage is logged to `ai_usage_logs` table for monitoring.


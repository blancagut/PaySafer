# SecureEscrow - Escrow Platform

A secure escrow platform for transactions between buyers and sellers, built with Next.js, Supabase, and deployed on Vercel.

## 🚀 Features

- **Authentication**: Email/password signup, login, password reset via Supabase Auth
- **Transactions**: Create, track, and manage escrow transactions
- **Disputes**: Open and manage disputes with evidence uploads
- **Real-time**: Live auth state and data updates
- **Secure**: Row-level security policies, protected routes
- **Responsive**: Mobile-friendly UI with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Styling**: Tailwind CSS, shadcn/ui components
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account and project
- Vercel account (for deployment)

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
cd secureescrow.me
npm install --legacy-peer-deps
```

### 2. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and run the SQL to create tables, policies, and triggers

### 3. Environment Variables

Your `.env.local` file is already configured with:
```
NEXT_PUBLIC_SUPABASE_URL=https://ecnbuxadkxnfdoahmblx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
app/
├── (dashboard)/          # Protected dashboard routes
│   ├── dashboard/        # Main dashboard
│   ├── transactions/     # Transaction management
│   ├── disputes/         # Dispute handling
│   ├── profile/          # User profile
│   └── settings/         # Account settings
├── login/                # Login page
├── register/             # Registration page
└── forgot-password/      # Password reset

lib/
├── supabase/             # Supabase client utilities
│   ├── client.ts         # Browser client
│   ├── server.ts         # Server client
│   └── middleware.ts     # Auth middleware
└── actions/              # Server actions
    ├── transactions.ts   # Transaction operations
    ├── disputes.ts       # Dispute operations
    └── profile.ts        # Profile operations

middleware.ts             # Route protection
```

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Auth Middleware**: Automatic route protection
- **Server Actions**: Server-side data mutations
- **Secure Storage**: Evidence files with access control

## 📊 Database Schema

### Tables
- **profiles**: User metadata (extends auth.users)
- **transactions**: Escrow transactions with status tracking
- **disputes**: Dispute cases with resolution tracking
- **dispute_messages**: Threaded dispute communication
- **files**: Evidence and document uploads
- **notifications**: User notification system

### Key Features
- Automatic profile creation on signup
- Status transition validation
- Timestamp tracking (created_at, updated_at, etc.)
- Foreign key constraints
- Indexes for performance

## 🌐 Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit with Supabase integration"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and import your repository
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy!

### 3. Configure Supabase Auth

In your Supabase project settings:
1. Go to **Authentication** → **URL Configuration**
2. Add your Vercel domain to **Site URL** and **Redirect URLs**:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/auth/callback`

## 🔄 Transaction Flow

1. **Create**: Buyer creates transaction with seller email
2. **Payment**: Status changes to `awaiting_payment` → `in_escrow`
3. **Delivery**: Seller marks as `delivered`
4. **Release**: Buyer confirms and funds move to `released`
5. **Dispute**: Either party can open dispute at escrow/delivered stage

## 📝 Status Transitions

```
draft → awaiting_payment → in_escrow → delivered → released
                              ↓            ↓
                           dispute ← ─ ─ ─ ┘
```

## 🚧 TODO - Future Enhancements

- [ ] Stripe payment integration
- [ ] Email notifications
- [ ] Admin dashboard for dispute resolution
- [ ] Transaction templates
- [ ] Multi-currency support
- [ ] Webhook integrations
- [ ] Activity logs
- [ ] 2FA authentication

## 🐛 Known Issues

- date-fns peer dependency conflict (resolved with --legacy-peer-deps)
- Next.js 16.0.7 security notice (update when patched version available)

## 📚 API Routes & Server Actions

### Transactions
- `getUserTransactions()` - Get all user transactions with filters
- `getTransaction(id)` - Get single transaction
- `createTransaction()` - Create new transaction
- `updateTransactionStatus()` - Update status with validation
- `getTransactionStats()` - Get dashboard statistics

### Disputes
- `getUserDisputes()` - Get all user disputes
- `createDispute()` - Open new dispute
- `getDisputeMessages()` - Get dispute thread
- `addDisputeMessage()` - Add message to dispute

### Profile
- `getProfile()` - Get user profile
- `updateProfile()` - Update profile data
- `updateEmail()` - Change email address
- `updatePassword()` - Change password

## 📄 License

MIT

## 👥 Support

For issues or questions, contact: support@secureescrow.com

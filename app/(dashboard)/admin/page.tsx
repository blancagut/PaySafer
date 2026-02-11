"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Shield,
  Users,
  DollarSign,
  AlertTriangle,
  History,
  BarChart3,
  Settings,
  FileText,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  Ban,
  UserCog,
  Trash2,
  Copy,
  Check,
  Loader2,
  Link2,
  Gavel,
  Server,
  Database,
  Wallet,
  Crown,
  ArrowUpRight,
  Fingerprint,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
} from "lucide-react"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge, statusBadgeMap, offerStatusBadgeMap } from "@/components/glass"
import { GlassInput } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { createClient } from "@/lib/supabase/client"
import {
  verifyAdmin,
  getAdminStats,
  getAdminTransactions,
  getAdminDisputes,
  getAdminUsers,
  getAdminAuditLogs,
  getAdminOffers,
  getAdminRevenueMetrics,
  adminReleaseTransaction,
  adminRefundTransaction,
  adminResolveDispute,
  adminUpdateUserRole,
  adminCancelOffer,
  adminBanUser,
  adminUnbanUser,
  type TransactionStatus,
  type DisputeResolution,
  type AdminTransactionFilters,
  type AdminDisputeFilters,
  type AdminUserFilters,
  type AdminAuditLogFilters,
  type AdminOfferFilters,
} from "@/lib/actions/admin"

/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
   Utilities
   в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-US").format(n)
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-[hsl(222,47%,8%)]/95 border border-white/[0.08] px-4 py-3 shadow-2xl backdrop-blur-2xl">
      <p className="text-[11px] font-medium text-muted-foreground mb-2 tracking-wide uppercase">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex items-center gap-2.5 text-[13px]">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color || e.fill }} />
          <span className="text-muted-foreground">{e.name}</span>
          <span className="font-semibold text-foreground ml-auto tabular-nums">
            {typeof e.value === "number" ? (e.value >= 1000 ? `$${(e.value / 1000).toFixed(1)}k` : `$${e.value}`) : e.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* в”Ђв”Ђв”Ђ Tab Config в”Ђв”Ђв”Ђ */

type AdminTab = "overview" | "revenue" | "transactions" | "disputes" | "users" | "offers" | "audit" | "config"

type TabItem = { key: AdminTab; label: string; icon: React.ReactNode; warn?: boolean }
type TabGroup = { group: string; tabs: TabItem[] }

const tabGroups: TabGroup[] = [
  {
    group: "Monitor",
    tabs: [
      { key: "overview",     label: "Overview",      icon: <LayoutDashboard className="w-4 h-4" /> },
      { key: "revenue",      label: "Revenue",       icon: <DollarSign className="w-4 h-4" /> },
    ],
  },
  {
    group: "Operations",
    tabs: [
      { key: "transactions", label: "Transactions",  icon: <History className="w-4 h-4" /> },
      { key: "disputes",     label: "Disputes",      icon: <AlertTriangle className="w-4 h-4" /> },
      { key: "users",        label: "Users",         icon: <Users className="w-4 h-4" /> },
      { key: "offers",       label: "Offers",        icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    group: "System",
    tabs: [
      { key: "audit",        label: "Audit Log",     icon: <Fingerprint className="w-4 h-4" /> },
      { key: "config",       label: "Config",        icon: <Settings className="w-4 h-4" />, warn: true },
    ],
  },
]

/* в”Ђв”Ђв”Ђ Pagination в”Ђв”Ђв”Ђ */

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
      <p className="text-[11px] text-muted-foreground tabular-nums">
        Page <span className="font-semibold text-foreground">{page}</span> of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-2 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 text-muted-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {totalPages <= 5 && Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-[11px] font-medium transition-colors ${
              p === page ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/[0.06]"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 text-muted-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* в”Ђв”Ђв”Ђ Section Header в”Ђв”Ђв”Ђ */

function SectionHeader({ title, description, count }: { title: string; description?: string; count?: number }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {count !== undefined && (
          <span className="text-xs font-medium tabular-nums text-muted-foreground bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5">
            {fmtNum(count)}
          </span>
        )}
      </div>
      {description && <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
  )
}

/* в”Ђв”Ђв”Ђ Filter Pill Bar в”Ђв”Ђв”Ђ */

function FilterBar<T extends string | undefined>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
}) {
  return (
    <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06] overflow-x-auto">
      {options.map(opt => (
        <button
          key={String(opt.key ?? "all")}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md whitespace-nowrap transition-all duration-200 ${
            value === opt.key
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* в”Ђв”Ђв”Ђ Skeleton Row в”Ђв”Ђв”Ђ */

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-48 bg-white/[0.04] rounded animate-pulse" />
            <div className="h-2.5 w-32 bg-white/[0.03] rounded animate-pulse" />
          </div>
          <div className="h-6 w-20 bg-white/[0.04] rounded-full animate-pulse" />
        </div>
      ))}
    </>
  )
}

/* в”Ђв”Ђв”Ђ Empty State в”Ђв”Ђв”Ђ */

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-[12px] text-muted-foreground/60 mt-1">{description}</p>}
    </div>
  )
}

/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
   MAIN ADMIN PAGE
   в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [loading, setLoading] = useState(true)

  // shared data
  const [stats, setStats] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)

  // tab data
  const [transactions, setTransactions] = useState<any[]>([])
  const [txnPagination, setTxnPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [txnFilter, setTxnFilter] = useState<AdminTransactionFilters>({ page: 1, pageSize: 15 })

  const [disputes, setDisputes] = useState<any[]>([])
  const [disputePagination, setDisputePagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [disputeFilter, setDisputeFilter] = useState<AdminDisputeFilters>({ page: 1, pageSize: 15 })

  const [users, setUsers] = useState<any[]>([])
  const [userPagination, setUserPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [userFilter, setUserFilter] = useState<AdminUserFilters>({ page: 1, pageSize: 20 })

  const [offers, setOffers] = useState<any[]>([])
  const [offerPagination, setOfferPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [offerFilter, setOfferFilter] = useState<AdminOfferFilters>({ page: 1, pageSize: 15 })

  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditPagination, setAuditPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [auditFilter, setAuditFilter] = useState<AdminAuditLogFilters>({ page: 1, pageSize: 25 })

  // dialogs
  const [actionDialog, setActionDialog] = useState<{ type: string; id: string; status?: string } | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  /* в”Ђв”Ђв”Ђ Auth check в”Ђв”Ђв”Ђ */
  useEffect(() => {
    verifyAdmin().then((res) => setAuthorized(!res.error))
  }, [])

  /* в”Ђв”Ђв”Ђ Data Loaders в”Ђв”Ђв”Ђ */
  const loadOverview = useCallback(async () => {
    const [s, r] = await Promise.all([getAdminStats(), getAdminRevenueMetrics()])
    if (s.data) setStats(s.data)
    if (r.data) setRevenue(r.data)
  }, [])

  const loadTransactions = useCallback(async () => {
    const res = await getAdminTransactions(txnFilter)
    if (res.data) { setTransactions(res.data); setTxnPagination(res.pagination!) }
  }, [txnFilter])

  const loadDisputes = useCallback(async () => {
    const res = await getAdminDisputes(disputeFilter)
    if (res.data) { setDisputes(res.data); setDisputePagination(res.pagination!) }
  }, [disputeFilter])

  const loadUsers = useCallback(async () => {
    const res = await getAdminUsers(userFilter)
    if (res.data) { setUsers(res.data); setUserPagination(res.pagination!) }
  }, [userFilter])

  const loadOffers = useCallback(async () => {
    const res = await getAdminOffers(offerFilter)
    if (res.data) { setOffers(res.data); setOfferPagination(res.pagination!) }
  }, [offerFilter])

  const loadAudit = useCallback(async () => {
    const res = await getAdminAuditLogs(auditFilter)
    if (res.data) { setAuditLogs(res.data); setAuditPagination(res.pagination!) }
  }, [auditFilter])

  useEffect(() => {
    if (!authorized) return
    setLoading(true)
    loadOverview().finally(() => setLoading(false))
  }, [authorized, loadOverview])

  useEffect(() => { if (authorized && activeTab === "transactions") loadTransactions() }, [authorized, activeTab, loadTransactions])
  useEffect(() => { if (authorized && activeTab === "disputes")     loadDisputes()     }, [authorized, activeTab, loadDisputes])
  useEffect(() => { if (authorized && activeTab === "users")        loadUsers()        }, [authorized, activeTab, loadUsers])
  useEffect(() => { if (authorized && activeTab === "offers")       loadOffers()       }, [authorized, activeTab, loadOffers])
  useEffect(() => { if (authorized && activeTab === "audit")        loadAudit()        }, [authorized, activeTab, loadAudit])

  /* в”Ђв”Ђв”Ђ Admin Actions в”Ђв”Ђв”Ђ */
  const refreshAll = () => {
    loadOverview()
    if (activeTab === "transactions") loadTransactions()
    if (activeTab === "disputes") loadDisputes()
    if (activeTab === "users") loadUsers()
    if (activeTab === "offers") loadOffers()
    if (activeTab === "audit") loadAudit()
  }

  const handleRelease = async (txnId: string) => {
    setActionLoading(true)
    const res = await adminReleaseTransaction(txnId, actionReason || undefined)
    setActionLoading(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Transaction released")
    setActionDialog(null); setActionReason("")
    loadTransactions(); loadOverview()
  }

  const handleRefund = async (txnId: string) => {
    setActionLoading(true)
    const res = await adminRefundTransaction(txnId, actionReason || undefined)
    setActionLoading(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Transaction refunded")
    setActionDialog(null); setActionReason("")
    loadTransactions(); loadOverview()
  }

  const handleResolveDispute = async (disputeId: string, resolution: DisputeResolution) => {
    if (!actionReason.trim()) { toast.error("Reason is required for all dispute actions"); return }
    setActionLoading(true)
    const res = await adminResolveDispute(disputeId, resolution, actionReason)
    setActionLoading(false)
    if (res.error) { toast.error(res.error); return }
    const msgs: Record<string, string> = {
      release_to_seller: "Funds released to seller",
      refund_to_buyer: "Funds refunded to buyer",
      hold_funds: "Funds frozen вЂ” held in platform",
      ban_both_hold: "Both parties banned вЂ” funds frozen",
      escalate_authorities: "Escalated to authorities вЂ” funds frozen, users banned",
    }
    toast.success(msgs[resolution] || "Dispute action completed")
    setActionDialog(null); setActionReason("")
    loadDisputes(); loadOverview(); loadUsers()
  }

  const handleRoleChange = async (userId: string, newRole: "user" | "admin") => {
    const res = await adminUpdateUserRole(userId, newRole)
    if (res.error) { toast.error(res.error); return }
    toast.success(`User ${newRole === "admin" ? "promoted to admin" : "demoted to user"}`)
    loadUsers()
  }

  const handleBanUser = async (userId: string) => {
    if (!actionReason.trim()) { toast.error("Reason is required to ban a user"); return }
    setActionLoading(true)
    const res = await adminBanUser(userId, actionReason)
    setActionLoading(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("User banned")
    setActionDialog(null); setActionReason("")
    loadUsers()
  }

  const handleUnbanUser = async (userId: string) => {
    const res = await adminUnbanUser(userId)
    if (res.error) { toast.error(res.error); return }
    toast.success("User unbanned")
    loadUsers()
  }

  const handleCancelOffer = async (offerId: string) => {
    setActionLoading(true)
    const res = await adminCancelOffer(offerId, actionReason || undefined)
    setActionLoading(false)
    if (res.error) { toast.error(res.error); return }
    toast.success("Offer cancelled")
    setActionDialog(null); setActionReason("")
    loadOffers()
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  /* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ Auth Gate в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
          <p className="text-[13px] text-muted-foreground">Verifying access&hellip;</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-5">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Shield className="w-9 h-9 text-red-400" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Access Denied</h2>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            You need super admin privileges to access this console.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    )
  }

  /* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ Rendered Page в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */

  return (
    <div className="space-y-8 pb-20 md:pb-0">

      {/* в”Ђв”Ђв”Ђ Page Header в”Ђв”Ђв”Ђ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[hsl(222,47%,6%)]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Admin Console
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20 rounded-md">
                Super Admin
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Full platform oversight &amp; control
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-all w-fit gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* в”Ђв”Ђв”Ђ Tab Navigation в”Ђв”Ђв”Ђ */}
      <nav className="flex items-center bg-white/[0.02] rounded-xl p-1.5 border border-white/[0.06] overflow-x-auto scrollbar-none">
        {tabGroups.map((group, gi) => (
          <React.Fragment key={group.group}>
            {/* Group divider */}
            {gi > 0 && (
              <div className="flex items-center px-1 shrink-0 self-stretch">
                <div className="w-px h-6 bg-white/[0.08]" />
              </div>
            )}

            {/* Group label + tabs */}
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 px-2 select-none">
                {group.group}
              </span>
              {group.tabs.map((tab) => {
                const isActive = activeTab === tab.key
                const disputeCount = stats?.activeDisputes
                const showBadge = tab.key === "disputes" && disputeCount > 0
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? tab.warn
                          ? "bg-amber-500/10 text-amber-300 shadow-sm ring-1 ring-amber-500/20"
                          : "bg-white/[0.08] text-foreground shadow-sm"
                        : tab.warn
                          ? "text-muted-foreground hover:text-amber-300 hover:bg-amber-500/[0.06]"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className={isActive ? (tab.warn ? "text-amber-400" : "text-primary") : ""}>
                      {tab.icon}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    {showBadge && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 rounded-md tabular-nums">
                        {disputeCount}
                      </span>
                    )}
                    {tab.warn && !isActive && (
                      <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-amber-500/60 ml-0.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </React.Fragment>
        ))}
      </nav>

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ OVERVIEW TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fade-in">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[110px] rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassStat
                  label="Total Users"
                  value={fmtNum(stats?.totalUsers ?? 0)}
                  icon={<Users className="w-5 h-5" />}
                  glowColor="blue"
                />
                <GlassStat
                  label="Platform Volume"
                  value={fmt(stats?.totalVolume ?? 0)}
                  icon={<DollarSign className="w-5 h-5" />}
                  glowColor="emerald"
                  trend={revenue?.volumeChange ? { value: revenue.volumeChange, label: "vs prev 30d" } : undefined}
                />
                <GlassStat
                  label="Held in Escrow"
                  value={fmt(stats?.escrowVolume ?? 0)}
                  icon={<Lock className="w-5 h-5" />}
                  glowColor="blue"
                />
                <GlassStat
                  label="All Transactions"
                  value={fmtNum(stats?.totalTransactions ?? 0)}
                  icon={<History className="w-5 h-5" />}
                  glowColor="purple"
                />
                <GlassStat
                  label="Active Transactions"
                  value={stats?.activeTransactions ?? 0}
                  icon={<Activity className="w-5 h-5" />}
                  glowColor="amber"
                />
                <GlassStat
                  label="Open Disputes"
                  value={stats?.activeDisputes ?? 0}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  glowColor="red"
                />
                <GlassStat
                  label="Resolved Disputes"
                  value={stats?.resolvedDisputes ?? 0}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  glowColor="emerald"
                />
                <GlassStat
                  label="Success Rate"
                  value={`${revenue?.successRate ?? 0}%`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  glowColor="emerald"
                />
              </div>

              {/* Volume Chart */}
              {revenue?.monthlyData?.length > 0 && (
                <GlassCard padding="none">
                  <div className="px-6 pt-6 pb-1">
                    <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                      Platform Volume
                    </h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Monthly transaction volume &amp; releases
                    </p>
                  </div>
                  <div className="h-[280px] px-3 pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenue.monthlyData}>
                        <defs>
                          <linearGradient id="adminAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(160,84%,45%)" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="hsl(160,84%,45%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "hsl(215,15%,50%)" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(215,15%,50%)" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="volume"
                          name="Volume"
                          stroke="hsl(160,84%,45%)"
                          fill="url(#adminAreaGrad)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="released"
                          name="Released"
                          stroke="hsl(200,80%,55%)"
                          fill="none"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard variant="hover" padding="sm" className="cursor-pointer group" onClick={() => setActiveTab("disputes")}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold tracking-tight text-foreground">
                        {stats?.activeDisputes ?? 0} Open Disputes
                      </p>
                      <p className="text-[12px] text-muted-foreground">Require your attention</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </GlassCard>

                <GlassCard variant="hover" padding="sm" className="cursor-pointer group" onClick={() => setActiveTab("users")}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold tracking-tight text-foreground">
                        {fmtNum(stats?.totalUsers ?? 0)} Users
                      </p>
                      <p className="text-[12px] text-muted-foreground">Manage accounts &amp; roles</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </GlassCard>

                <GlassCard variant="hover" padding="sm" className="cursor-pointer group" onClick={() => setActiveTab("audit")}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold tracking-tight text-foreground">
                        Audit Trail
                      </p>
                      <p className="text-[12px] text-muted-foreground">All actions logged &amp; traceable</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </GlassCard>
              </div>
            </>
          )}
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ REVENUE TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "revenue" && (
        <div className="space-y-6 animate-fade-in">
          <SectionHeader title="Revenue" description="Platform financial performance &amp; currency breakdown" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassStat
              label="Total Volume"
              value={fmt(revenue?.totalVolume ?? 0)}
              icon={<DollarSign className="w-5 h-5" />}
              glowColor="emerald"
            />
            <GlassStat
              label="Released"
              value={fmt(revenue?.releasedVolume ?? 0)}
              icon={<Unlock className="w-5 h-5" />}
              glowColor="emerald"
            />
            <GlassStat
              label="Last 30d Volume"
              value={fmt(revenue?.last30Volume ?? 0)}
              icon={<TrendingUp className="w-5 h-5" />}
              glowColor="blue"
              trend={revenue?.volumeChange ? { value: revenue.volumeChange, label: "vs prev period" } : undefined}
            />
            <GlassStat
              label="Last 30d Txns"
              value={revenue?.last30Transactions ?? 0}
              icon={<Activity className="w-5 h-5" />}
              glowColor="purple"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Monthly bar chart */}
            <GlassCard padding="none" className="xl:col-span-2">
              <div className="px-6 pt-6 pb-1">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">Monthly Revenue</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Volume processed per month</p>
              </div>
              <div className="h-[300px] px-3 pb-4">
                {(revenue?.monthlyData?.length ?? 0) === 0 ? (
                  <EmptyState icon={BarChart3} title="No revenue data yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenue.monthlyData}>
                      <defs>
                        <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(160,84%,45%)" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="hsl(160,84%,45%)" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215,15%,50%)" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(215,15%,50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="volume" name="Volume" fill="url(#revBarGrad)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>

            {/* Currency breakdown */}
            <GlassCard padding="none">
              <div className="px-6 pt-6 pb-4">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">By Currency</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Volume distribution</p>
              </div>
              <div className="px-6 pb-6 space-y-4">
                {(revenue?.currencyBreakdown || []).map((c: any) => {
                  const pct = revenue.totalVolume > 0 ? (c.amount / revenue.totalVolume * 100).toFixed(1) : "0"
                  return (
                    <div key={c.currency}>
                      <div className="flex justify-between text-[12px] mb-1.5">
                        <span className="text-foreground font-semibold">{c.currency}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {fmt(c.amount, c.currency)} В· {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/80 to-primary/40 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {(revenue?.currencyBreakdown?.length ?? 0) === 0 && (
                  <EmptyState icon={DollarSign} title="No currency data" />
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ TRANSACTIONS TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "transactions" && (
        <div className="space-y-5 animate-fade-in">
          <SectionHeader
            title="Transactions"
            description="All platform transactions вЂ” release or refund from here"
            count={txnPagination.total}
          />

          <div className="flex flex-col md:flex-row gap-3">
            <GlassInput
              placeholder="Search description, email..."
              icon={<Search className="w-3.5 h-3.5" />}
              value={txnFilter.search || ""}
              onChange={(e) => setTxnFilter({ ...txnFilter, search: e.target.value, page: 1 })}
              className="md:w-72"
            />
            <FilterBar
              options={[
                { key: undefined, label: "All" },
                { key: "in_escrow" as const, label: "Escrow" },
                { key: "delivered" as const, label: "Delivered" },
                { key: "dispute" as const, label: "Dispute" },
                { key: "released" as const, label: "Released" },
                { key: "cancelled" as const, label: "Cancelled" },
              ]}
              value={txnFilter.status}
              onChange={(s) => setTxnFilter({ ...txnFilter, status: s, page: 1 })}
            />
          </div>

          <GlassCard padding="none">
            {/* Table Header */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Transaction</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-28">Amount</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-48">Status &amp; Actions</span>
            </div>

            {transactions.length === 0 ? (
              <EmptyState icon={History} title="No transactions found" description="Try adjusting your filters" />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {transactions.map(txn => {
                  const cfg = statusBadgeMap[txn.status] || { label: txn.status, variant: "muted" as const }
                  const canRelease = ["delivered", "dispute"].includes(txn.status)
                  const canRefund = ["in_escrow", "dispute"].includes(txn.status)
                  return (
                    <div key={txn.id} className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_auto] gap-3 lg:gap-4 p-5 hover:bg-white/[0.015] transition-colors items-center">
                      <div className="min-w-0 w-full">
                        <p className="text-[14px] font-semibold tracking-tight text-foreground truncate">
                          {txn.description}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-1">
                          <span className="text-foreground/60">Buyer</span> {txn.buyer?.email || "вЂ”"}
                          <span className="mx-1.5 text-white/10">|</span>
                          <span className="text-foreground/60">Seller</span> {txn.seller?.email || txn.seller_email || "вЂ”"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => copyId(txn.id)}
                            className="text-[11px] text-muted-foreground hover:text-foreground font-mono inline-flex items-center gap-1 transition-colors"
                          >
                            {copiedId === txn.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {txn.id.slice(0, 8)}
                          </button>
                          <span className="text-white/10">В·</span>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(txn.created_at)}</span>
                        </div>
                      </div>

                      <span className="text-[15px] font-bold tabular-nums text-foreground w-28 text-right">
                        {fmt(Number(txn.amount), txn.currency)}
                      </span>

                      <div className="flex items-center gap-2 w-48 justify-end flex-wrap">
                        <GlassBadge variant={cfg.variant} dot={cfg.dot} pulse={cfg.pulse}>{cfg.label}</GlassBadge>
                        {canRelease && (
                          <button
                            onClick={() => setActionDialog({ type: "release", id: txn.id, status: txn.status })}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 transition-all"
                          >
                            Release
                          </button>
                        )}
                        {canRefund && (
                          <button
                            onClick={() => setActionDialog({ type: "refund", id: txn.id, status: txn.status })}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-all"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="px-5 pb-4">
              <Pagination page={txnPagination.page} totalPages={txnPagination.totalPages} onPage={(p) => setTxnFilter({ ...txnFilter, page: p })} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ DISPUTES TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "disputes" && (
        <div className="space-y-5 animate-fade-in">
          <SectionHeader
            title="Disputes"
            description="Admin-only resolution вЂ” you decide where every dollar goes"
            count={disputePagination.total}
          />

          {/* Policy Banner */}
          <div className="relative overflow-hidden rounded-xl border border-red-500/15 bg-gradient-to-r from-red-500/[0.06] to-transparent p-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Gavel className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold tracking-tight text-foreground">
                  Admin-Only Resolution Policy
                </p>
                <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
                  Only you decides where funds go. Not Stripe, not any user. Funds remain frozen in the platform
                  until you make a decision. Options: release to seller, refund to buyer, hold indefinitely,
                  ban both parties, or escalate to law enforcement.
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <GlassInput
              placeholder="Search reason..."
              icon={<Search className="w-3.5 h-3.5" />}
              value={disputeFilter.search || ""}
              onChange={(e) => setDisputeFilter({ ...disputeFilter, search: e.target.value, page: 1 })}
              className="md:w-72"
            />
            <FilterBar
              options={[
                { key: undefined, label: "All" },
                { key: "under_review" as const, label: "Under Review" },
                { key: "resolved" as const, label: "Resolved" },
                { key: "closed" as const, label: "Closed / Held" },
              ]}
              value={disputeFilter.status}
              onChange={(s) => setDisputeFilter({ ...disputeFilter, status: s, page: 1 })}
            />
          </div>

          <GlassCard padding="none">
            {disputes.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No disputes found" description="All clear for now" />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {disputes.map(d => {
                  const isActive = d.status === "under_review"
                  const isClosed = d.status === "closed"
                  const badgeVariant = isActive ? "amber" : isClosed ? "red" : "emerald"
                  const badgeLabel = isActive ? "Under Review" : isClosed ? "Closed / Held" : "Resolved"
                  return (
                    <div key={d.id} className="p-5 hover:bg-white/[0.015] transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? "bg-red-500/10 border border-red-500/15" : isClosed ? "bg-amber-500/10 border border-amber-500/15" : "bg-white/[0.04] border border-white/[0.06]"
                          }`}>
                            {isActive ? <AlertTriangle className="w-4.5 h-4.5 text-red-400" /> : isClosed ? <Lock className="w-4.5 h-4.5 text-amber-400" /> : <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold tracking-tight text-foreground truncate">
                              {d.transaction?.description || "Dispute"}
                            </p>
                            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{d.reason}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground">
                                Filed by <span className="text-foreground/70">{d.opener?.email || "вЂ”"}</span>
                              </span>
                              <span className="text-white/10">В·</span>
                              <span className="text-[11px] text-muted-foreground">{timeAgo(d.created_at)}</span>
                              {d.transaction && (
                                <>
                                  <span className="text-white/10">В·</span>
                                  <span className="text-[13px] font-bold tabular-nums text-foreground">
                                    {fmt(Number(d.transaction.amount), d.transaction.currency)}
                                  </span>
                                </>
                              )}
                            </div>
                            {d.resolution && (
                              <p className="text-[11px] text-amber-400/80 mt-1.5 font-medium">
                                Resolution: {d.resolution}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <GlassBadge variant={badgeVariant} dot pulse={isActive}>{badgeLabel}</GlassBadge>
                        </div>
                      </div>

                      {/* Admin action buttons вЂ” only for active disputes */}
                      {isActive && (
                        <div className="flex flex-wrap items-center gap-2 mt-4 ml-14">
                          <button onClick={() => setActionDialog({ type: "resolve_release", id: d.id })} className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 transition-all">
                            Release to Seller
                          </button>
                          <button onClick={() => setActionDialog({ type: "resolve_refund", id: d.id })} className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/10 transition-all">
                            Refund to Buyer
                          </button>
                          <button onClick={() => setActionDialog({ type: "resolve_hold", id: d.id })} className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/10 transition-all flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> Hold Funds
                          </button>
                          <button onClick={() => setActionDialog({ type: "resolve_ban_both", id: d.id })} className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-all flex items-center gap-1.5">
                            <Ban className="w-3 h-3" /> Ban Both + Hold
                          </button>
                          <button onClick={() => setActionDialog({ type: "resolve_authorities", id: d.id })} className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/10 transition-all flex items-center gap-1.5">
                            <Shield className="w-3 h-3" /> Escalate to Authorities
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="px-5 pb-4">
              <Pagination page={disputePagination.page} totalPages={disputePagination.totalPages} onPage={(p) => setDisputeFilter({ ...disputeFilter, page: p })} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ USERS TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "users" && (
        <div className="space-y-5 animate-fade-in">
          <SectionHeader
            title="Users"
            description="Manage accounts, roles &amp; access"
            count={userPagination.total}
          />

          <div className="flex flex-col md:flex-row gap-3">
            <GlassInput
              placeholder="Search email, name..."
              icon={<Search className="w-3.5 h-3.5" />}
              value={userFilter.search || ""}
              onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value, page: 1 })}
              className="md:w-72"
            />
            <FilterBar
              options={[
                { key: undefined, label: "All" },
                { key: "user" as const, label: "Users" },
                { key: "admin" as const, label: "Admins" },
              ]}
              value={userFilter.role}
              onChange={(r) => setUserFilter({ ...userFilter, role: r, page: 1 })}
            />
          </div>

          <GlassCard padding="none">
            {/* Table Header */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">User</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-56">Role &amp; Actions</span>
            </div>

            {users.length === 0 ? (
              <EmptyState icon={Users} title="No users found" description="Try adjusting your search" />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {users.map(u => {
                  const initials = (u.full_name || u.email || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  const isAdmin = u.role === "admin"
                  const isBanned = u.role === "banned"
                  return (
                    <div key={u.id} className="flex flex-col md:grid md:grid-cols-[1fr_auto] gap-3 md:gap-4 p-5 hover:bg-white/[0.015] transition-colors items-center">
                      <div className="flex items-center gap-4 min-w-0 w-full">
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback className={`text-[12px] font-bold ${
                            isBanned ? "bg-red-500/15 text-red-400" : isAdmin ? "bg-primary/15 text-primary" : "bg-white/[0.06] text-muted-foreground"
                          }`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold tracking-tight text-foreground truncate">
                              {u.full_name || "No name"}
                            </p>
                            {isAdmin && <GlassBadge variant="blue" size="sm">Admin</GlassBadge>}
                            {isBanned && <GlassBadge variant="red" size="sm">Banned</GlassBadge>}
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-0.5">{u.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => copyId(u.id)}
                              className="text-[11px] text-muted-foreground hover:text-foreground font-mono inline-flex items-center gap-1 transition-colors"
                            >
                              {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {u.id.slice(0, 8)}
                            </button>
                            <span className="text-white/10">В·</span>
                            <span className="text-[11px] text-muted-foreground">Joined {timeAgo(u.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-56 justify-end flex-wrap">
                        {isBanned ? (
                          <button
                            onClick={() => handleUnbanUser(u.id)}
                            className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 transition-all"
                          >
                            Unban
                          </button>
                        ) : isAdmin ? (
                          <button
                            onClick={() => handleRoleChange(u.id, "user")}
                            className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/10 transition-all"
                          >
                            Demote to User
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRoleChange(u.id, "admin")}
                              className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10 transition-all flex items-center gap-1.5"
                            >
                              <Crown className="w-3 h-3" /> Promote
                            </button>
                            <button
                              onClick={() => setActionDialog({ type: "ban_user", id: u.id })}
                              className="px-3 py-2 text-[12px] font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-all flex items-center gap-1.5"
                            >
                              <Ban className="w-3 h-3" /> Ban
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="px-5 pb-4">
              <Pagination page={userPagination.page} totalPages={userPagination.totalPages} onPage={(p) => setUserFilter({ ...userFilter, page: p })} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ OFFERS TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "offers" && (
        <div className="space-y-5 animate-fade-in">
          <SectionHeader
            title="Offers"
            description="All payment link offers created on the platform"
            count={offerPagination.total}
          />

          <div className="flex flex-col md:flex-row gap-3">
            <GlassInput
              placeholder="Search title..."
              icon={<Search className="w-3.5 h-3.5" />}
              value={offerFilter.search || ""}
              onChange={(e) => setOfferFilter({ ...offerFilter, search: e.target.value, page: 1 })}
              className="md:w-72"
            />
            <FilterBar
              options={[
                { key: undefined, label: "All" },
                { key: "pending" as const, label: "Pending" },
                { key: "accepted" as const, label: "Accepted" },
                { key: "expired" as const, label: "Expired" },
                { key: "cancelled" as const, label: "Cancelled" },
              ]}
              value={offerFilter.status}
              onChange={(s) => setOfferFilter({ ...offerFilter, status: s, page: 1 })}
            />
          </div>

          <GlassCard padding="none">
            {/* Table Header */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Offer</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-40">Status &amp; Actions</span>
            </div>

            {offers.length === 0 ? (
              <EmptyState icon={FileText} title="No offers found" description="Try adjusting your filters" />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {offers.map(o => {
                  const cfg = offerStatusBadgeMap[o.status] || { label: o.status, variant: "muted" as const }
                  return (
                    <div key={o.id} className="flex flex-col md:grid md:grid-cols-[1fr_auto] gap-3 md:gap-4 p-5 hover:bg-white/[0.015] transition-colors items-center">
                      <div className="flex items-center gap-4 min-w-0 w-full">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                          <Link2 className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold tracking-tight text-foreground truncate">{o.title}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5">
                            <span className="font-semibold tabular-nums text-foreground/80">{fmt(Number(o.amount), o.currency)}</span>
                            <span className="mx-1.5 text-white/10">|</span>
                            {o.creator_role}
                            <span className="mx-1.5 text-white/10">|</span>
                            {o.creator?.email || "вЂ”"}
                          </p>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(o.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-40 justify-end">
                        <GlassBadge variant={cfg.variant} dot={cfg.dot} pulse={cfg.pulse}>{cfg.label}</GlassBadge>
                        {o.status === "pending" && (
                          <button
                            onClick={() => setActionDialog({ type: "cancel_offer", id: o.id })}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="px-5 pb-4">
              <Pagination page={offerPagination.page} totalPages={offerPagination.totalPages} onPage={(p) => setOfferFilter({ ...offerFilter, page: p })} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ AUDIT LOG TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "audit" && (
        <div className="space-y-5 animate-fade-in">
          <SectionHeader
            title="Audit Log"
            description="Every admin action recorded &amp; traceable"
            count={auditPagination.total}
          />

          <FilterBar
            options={[
              { key: undefined, label: "All Events" },
              { key: "admin.transaction.release", label: "Releases" },
              { key: "admin.transaction.refund", label: "Refunds" },
              { key: "admin.dispute.resolve", label: "Dispute Resolutions" },
              { key: "admin.user.promote", label: "Promotions" },
              { key: "admin.offer.cancel", label: "Offer Cancels" },
            ]}
            value={auditFilter.eventType}
            onChange={(evt) => setAuditFilter({ ...auditFilter, eventType: evt, page: 1 })}
          />

          <GlassCard padding="none">
            {auditLogs.length === 0 ? (
              <EmptyState icon={Fingerprint} title="No audit logs found" description="Actions will appear here as they happen" />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-5 hover:bg-white/[0.015] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[13px] font-semibold text-foreground font-mono">
                            {log.event_type}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(log.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">
                            Target: <span className="font-mono text-foreground/60">{log.target_table}/{log.target_id?.slice(0, 8)}</span>
                          </span>
                          <span className="text-white/10">В·</span>
                          <span className="text-[11px] text-muted-foreground">
                            Actor: <span className="font-mono text-foreground/60">{log.actor_id?.slice(0, 8)}</span>
                          </span>
                        </div>
                        {log.new_values && (
                          <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                            <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-5 pb-4">
              <Pagination page={auditPagination.page} totalPages={auditPagination.totalPages} onPage={(p) => setAuditFilter({ ...auditFilter, page: p })} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ CONFIG TAB в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      {activeTab === "config" && (
        <div className="space-y-6 animate-fade-in">
          <SectionHeader title="Configuration" description="Platform-wide settings &amp; system health" />

          <GlassContainer header={{ title: "Platform Controls", description: "Toggle features across the platform" }}>
            <div className="space-y-3">
              {[
                { title: "Maintenance Mode", desc: "Disable user actions during maintenance", key: "maintenance", danger: true },
                { title: "New Registrations", desc: "Allow new user sign-ups", key: "registrations" },
                { title: "Offer Creation", desc: "Allow users to create new payment offers", key: "offers" },
                { title: "Dispute Filing", desc: "Allow users to open disputes", key: "disputes" },
              ].map(item => (
                <div key={item.key} className={`flex items-center justify-between py-4 px-4 rounded-xl border transition-colors ${
                  item.danger ? "bg-red-500/[0.03] border-red-500/10 hover:bg-red-500/[0.05]" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                }`}>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    defaultChecked={item.key !== "maintenance"}
                    onCheckedChange={() => toast.success(`${item.title} toggled (save to DB pending)`)}
                  />
                </div>
              ))}
            </div>
          </GlassContainer>

          <GlassContainer header={{ title: "Fee Structure", description: "Current platform fee configuration" }}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Escrow Fee
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-foreground mt-2">2.9%</p>
                  <p className="text-[12px] text-muted-foreground mt-1">+ $0.30 per transaction</p>
                </div>
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Payout Fee
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-foreground mt-2">0.25%</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Min $0.25 per payout</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-2 px-1">
                <Lock className="w-3 h-3 shrink-0" />
                Fee changes require Stripe dashboard update + code deploy. Contact engineering.
              </p>
            </div>
          </GlassContainer>

          <GlassContainer header={{ title: "System Health", description: "Real-time infrastructure status" }}>
            <div className="space-y-2">
              {[
                { name: "Next.js Application", icon: Server, status: "Operational", color: "emerald" },
                { name: "Supabase Database", icon: Database, status: "Operational", color: "emerald" },
                { name: "Supabase Auth", icon: Shield, status: "Operational", color: "emerald" },
                { name: "Supabase Realtime", icon: Activity, status: "Operational", color: "emerald" },
                { name: "Stripe Payments", icon: Wallet, status: "Operational", color: "emerald" },
                { name: "Webhook Pipeline", icon: Link2, status: "Operational", color: "emerald" },
              ].map(svc => (
                <div key={svc.name} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <svc.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[13px] font-medium text-foreground">{svc.name}</span>
                  </div>
                  <GlassBadge variant={svc.color as any} dot size="sm">{svc.status}</GlassBadge>
                </div>
              ))}
            </div>
          </GlassContainer>

          <GlassCard variant="gradient" padding="sm">
            <div className="flex items-start gap-4 p-1">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold tracking-tight text-foreground">Database Schema</p>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                  Tables: profiles, transactions, disputes, dispute_messages, offers, notifications, files, audit_logs.
                  All tables are protected by Row Level Security (RLS) policies.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ ACTION DIALOG в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setActionReason("") }}>
        <DialogContent className="bg-[hsl(222,47%,8%)] border-white/[0.08] max-w-md rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-[18px] font-bold tracking-tight text-foreground">
              {actionDialog?.type === "release"              && "Release Transaction"}
              {actionDialog?.type === "refund"               && "Refund Transaction"}
              {actionDialog?.type === "resolve_release"      && "Release Funds to Seller"}
              {actionDialog?.type === "resolve_refund"       && "Refund Funds to Buyer"}
              {actionDialog?.type === "resolve_hold"         && "Hold Funds in Platform"}
              {actionDialog?.type === "resolve_ban_both"     && "Ban Both Parties + Freeze"}
              {actionDialog?.type === "resolve_authorities"  && "Escalate to Authorities"}
              {actionDialog?.type === "cancel_offer"         && "Cancel Offer"}
              {actionDialog?.type === "ban_user"             && "Ban User"}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
              {actionDialog?.type === "resolve_hold"         && "Funds will stay frozen in the platform. No money moves until you make a final decision."}
              {actionDialog?.type === "resolve_ban_both"     && "Both buyer AND seller will be banned. Funds remain frozen. Use for suspected money laundering or fraud."}
              {actionDialog?.type === "resolve_authorities"  && "Both parties will be banned and funds frozen. This flags the case for law enforcement review. This is the nuclear option."}
              {actionDialog?.type === "ban_user"             && "This user will be immediately banned from the platform. They will be signed out and unable to access their account."}
              {!["resolve_hold", "resolve_ban_both", "resolve_authorities", "ban_user"].includes(actionDialog?.type || "") && "This action is irreversible and will be recorded in the audit trail."}
            </DialogDescription>
          </DialogHeader>

          {/* Severity indicator for dangerous actions */}
          {["resolve_ban_both", "resolve_authorities"].includes(actionDialog?.type || "") && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/15">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400 font-medium">
                {actionDialog?.type === "resolve_authorities"
                  ? "Nuclear option вЂ” involves law enforcement. Make sure you have evidence."
                  : "High severity вЂ” both parties will lose platform access."}
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            <Label className="text-[13px] font-semibold text-foreground">
              Reason <span className="text-muted-foreground font-normal">(required)</span>
            </Label>
            <Textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={
                actionDialog?.type === "resolve_authorities"
                  ? "Describe suspected violation, evidence, and relevant transaction IDs..."
                  : "Describe the reason for this action..."
              }
              className="bg-white/[0.03] border-white/[0.08] focus:border-white/[0.15] min-h-[100px] text-[13px] placeholder:text-muted-foreground/50 rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setActionDialog(null); setActionReason("") }}
              className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-[13px]"
            >
              Cancel
            </Button>
            <Button
              disabled={actionLoading || !actionReason.trim()}
              onClick={() => {
                if (!actionDialog) return
                if (actionDialog.type === "release")              handleRelease(actionDialog.id)
                if (actionDialog.type === "refund")               handleRefund(actionDialog.id)
                if (actionDialog.type === "resolve_release")      handleResolveDispute(actionDialog.id, "release_to_seller")
                if (actionDialog.type === "resolve_refund")       handleResolveDispute(actionDialog.id, "refund_to_buyer")
                if (actionDialog.type === "resolve_hold")         handleResolveDispute(actionDialog.id, "hold_funds")
                if (actionDialog.type === "resolve_ban_both")     handleResolveDispute(actionDialog.id, "ban_both_hold")
                if (actionDialog.type === "resolve_authorities")  handleResolveDispute(actionDialog.id, "escalate_authorities")
                if (actionDialog.type === "cancel_offer")         handleCancelOffer(actionDialog.id)
                if (actionDialog.type === "ban_user")             handleBanUser(actionDialog.id)
              }}
              className={`text-[13px] font-semibold transition-all ${
                ["resolve_refund", "resolve_ban_both", "resolve_authorities", "cancel_offer", "ban_user", "refund"].includes(actionDialog?.type || "")
                  ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                  : actionDialog?.type === "resolve_hold"
                    ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-600"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {actionDialog?.type === "resolve_authorities" ? "Escalate" :
               actionDialog?.type === "resolve_ban_both"   ? "Ban & Freeze" :
               actionDialog?.type === "ban_user"           ? "Ban User" :
               "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

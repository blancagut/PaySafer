"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  getAdminStats,
  getAdminTransactions,
  getAdminDisputes,
  getAdminUsers,
  getAdminAuditLogs,
  adminReleaseTransaction,
  adminRefundTransaction,
  adminResolveDispute,
  getAdminAllowedActions,
  type TransactionStatus,
  type AdminTransactionFilters,
  type AdminDisputeFilters,
  type AdminUserFilters,
  type AdminAuditLogFilters,
} from "@/lib/actions/admin"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Shield,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Lock,
  Mail,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Gavel,
  Ban,
  CheckCircle2,
  Clock,
} from "lucide-react"

const txnStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  awaiting_payment: { label: "Awaiting Payment", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  in_escrow: { label: "In Escrow", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  delivered: { label: "Delivered", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  released: { label: "Released", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  dispute: { label: "Dispute", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
}

const disputeStatusConfig: Record<string, { label: string; className: string }> = {
  under_review: { label: "Under Review", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; className: string }> }) {
  const cfg = config[status] || { label: status, className: "bg-muted text-muted-foreground" }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

function PaginationControls({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function StatCard({ icon, bgColor, value, label, isString }: { icon: React.ReactNode; bgColor: string; value: number | string; label: string; isString?: boolean }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground truncate">{isString ? value : typeof value === "number" ? value.toLocaleString() : value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [stats, setStats] = useState<{
    totalUsers: number; totalTransactions: number; activeTransactions: number;
    totalVolume: number; escrowVolume: number; activeDisputes: number;
    resolvedDisputes: number; totalDisputes: number;
  } | null>(null)

  const [transactions, setTransactions] = useState<any[]>([])
  const [txnPagination, setTxnPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [txnFilters, setTxnFilters] = useState<AdminTransactionFilters>({})
  const [txnSearch, setTxnSearch] = useState("")
  const [txnLoading, setTxnLoading] = useState(false)

  const [disputes, setDisputes] = useState<any[]>([])
  const [disputePagination, setDisputePagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [disputeFilters, setDisputeFilters] = useState<AdminDisputeFilters>({})
  const [disputeSearch, setDisputeSearch] = useState("")
  const [disputeLoading, setDisputeLoading] = useState(false)

  const [users, setUsers] = useState<any[]>([])
  const [userPagination, setUserPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [userFilters, setUserFilters] = useState<AdminUserFilters>({})
  const [userSearch, setUserSearch] = useState("")
  const [userLoading, setUserLoading] = useState(false)

  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditPagination, setAuditPagination] = useState({ page: 1, pageSize: 30, total: 0, totalPages: 0 })
  const [auditFilters, setAuditFilters] = useState<AdminAuditLogFilters>({})
  const [auditLoading, setAuditLoading] = useState(false)

  const [actionDialog, setActionDialog] = useState<{
    open: boolean; type: "release" | "refund" | null; transactionId: string;
    transactionDesc: string; transactionAmount: number; transactionStatus: string;
  }>({ open: false, type: null, transactionId: "", transactionDesc: "", transactionAmount: 0, transactionStatus: "" })
  const [actionReason, setActionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean; disputeId: string; disputeReason: string; transactionAmount: number;
  }>({ open: false, disputeId: "", disputeReason: "", transactionAmount: 0 })
  const [resolveDecision, setResolveDecision] = useState<"release_to_seller" | "refund_to_buyer">("refund_to_buyer")
  const [resolveReason, setResolveReason] = useState("")
  const [resolveLoading, setResolveLoading] = useState(false)

  const [user, setUser] = useState<any>(null)
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" })
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false })
  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)

  const [globalLoading, setGlobalLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const statsResult = await getAdminStats()
        if (statsResult.error) {
          setIsAdmin(false)
          setAuthError(statsResult.error)
          setGlobalLoading(false)
          return
        }
        setIsAdmin(true)
        setStats(statsResult.data!)
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
      } catch {
        setIsAdmin(false)
        setAuthError("Failed to verify admin access")
      } finally {
        setGlobalLoading(false)
      }
    }
    init()
  }, [])

  const loadStats = useCallback(async () => {
    const result = await getAdminStats()
    if (result.data) setStats(result.data)
  }, [])

  const loadTransactions = useCallback(async (filters: AdminTransactionFilters = {}) => {
    setTxnLoading(true)
    try {
      const result = await getAdminTransactions(filters)
      if (result.error) { toast.error(result.error); return }
      setTransactions(result.data || [])
      if (result.pagination) setTxnPagination(result.pagination)
    } catch { toast.error("Failed to load transactions") }
    finally { setTxnLoading(false) }
  }, [])

  const loadDisputes = useCallback(async (filters: AdminDisputeFilters = {}) => {
    setDisputeLoading(true)
    try {
      const result = await getAdminDisputes(filters)
      if (result.error) { toast.error(result.error); return }
      setDisputes(result.data || [])
      if (result.pagination) setDisputePagination(result.pagination)
    } catch { toast.error("Failed to load disputes") }
    finally { setDisputeLoading(false) }
  }, [])

  const loadUsers = useCallback(async (filters: AdminUserFilters = {}) => {
    setUserLoading(true)
    try {
      const result = await getAdminUsers(filters)
      if (result.error) { toast.error(result.error); return }
      setUsers(result.data || [])
      if (result.pagination) setUserPagination(result.pagination)
    } catch { toast.error("Failed to load users") }
    finally { setUserLoading(false) }
  }, [])

  const loadAuditLogs = useCallback(async (filters: AdminAuditLogFilters = {}) => {
    setAuditLoading(true)
    try {
      const result = await getAdminAuditLogs(filters)
      if (result.error) { toast.error(result.error); return }
      setAuditLogs(result.data || [])
      if (result.pagination) setAuditPagination(result.pagination)
    } catch { toast.error("Failed to load audit logs") }
    finally { setAuditLoading(false) }
  }, [])

  const handleTabChange = (tab: string) => {
    if (tab === "transactions" && transactions.length === 0) loadTransactions(txnFilters)
    if (tab === "disputes" && disputes.length === 0) loadDisputes(disputeFilters)
    if (tab === "users" && users.length === 0) loadUsers(userFilters)
    if (tab === "audit" && auditLogs.length === 0) loadAuditLogs(auditFilters)
  }

  const openActionDialog = (type: "release" | "refund", txn: any) => {
    setActionDialog({ open: true, type, transactionId: txn.id, transactionDesc: txn.description, transactionAmount: txn.amount, transactionStatus: txn.status })
    setActionReason("")
  }

  const executeAction = async () => {
    if (!actionDialog.type || !actionDialog.transactionId) return
    setActionLoading(true)
    try {
      const result = actionDialog.type === "release"
        ? await adminReleaseTransaction(actionDialog.transactionId, actionReason || undefined)
        : await adminRefundTransaction(actionDialog.transactionId, actionReason || undefined)
      if (result.error) { toast.error(result.error); return }
      toast.success(actionDialog.type === "release" ? "Funds released to seller" : "Transaction refunded to buyer")
      setActionDialog({ open: false, type: null, transactionId: "", transactionDesc: "", transactionAmount: 0, transactionStatus: "" })
      loadTransactions(txnFilters)
      loadStats()
    } catch { toast.error("Action failed") }
    finally { setActionLoading(false) }
  }

  const openResolveDialog = (dispute: any) => {
    setResolveDialog({ open: true, disputeId: dispute.id, disputeReason: dispute.reason, transactionAmount: dispute.transaction?.amount || 0 })
    setResolveDecision("refund_to_buyer")
    setResolveReason("")
  }

  const executeResolve = async () => {
    if (!resolveDialog.disputeId || !resolveReason.trim()) { toast.error("Resolution reason is required"); return }
    setResolveLoading(true)
    try {
      const result = await adminResolveDispute(resolveDialog.disputeId, resolveDecision, resolveReason)
      if (result.error) { toast.error(result.error); return }
      toast.success("Dispute resolved")
      setResolveDialog({ open: false, disputeId: "", disputeReason: "", transactionAmount: 0 })
      loadDisputes(disputeFilters)
      loadTransactions(txnFilters)
      loadStats()
    } catch { toast.error("Failed to resolve dispute") }
    finally { setResolveLoading(false) }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Passwords do not match"); return }
    if (passwordForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return }
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
      if (error) { toast.error(error.message); return }
      toast.success("Password updated")
      setPasswordForm({ newPassword: "", confirmPassword: "" })
    } catch { toast.error("Failed to update password") }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) { toast.error(error.message); return }
      toast.success("Verification email sent to new address")
      setNewEmail("")
    } catch { toast.error("Failed to update email") }
    finally { setEmailLoading(false) }
  }

  const refreshAll = async () => {
    setGlobalLoading(true)
    await loadStats()
    setGlobalLoading(false)
    toast.success("Dashboard refreshed")
  }

  if (globalLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-destructive max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Access Denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {authError || "You do not have admin privileges. Admin access is controlled by the role field in the profiles table."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">Platform management and oversight</p>
        </div>
        <Button variant="outline" onClick={refreshAll} disabled={globalLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${globalLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} bgColor="bg-blue-100" value={stats.totalUsers} label="Total Users" />
          <StatCard icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} bgColor="bg-emerald-100" value={stats.totalTransactions} label="Total Transactions" />
          <StatCard icon={<Clock className="w-5 h-5 text-amber-600" />} bgColor="bg-amber-100" value={stats.activeTransactions} label="Active" />
          <StatCard icon={<DollarSign className="w-5 h-5 text-purple-600" />} bgColor="bg-purple-100" value={formatCurrency(stats.totalVolume)} label="Total Volume" isString />
          <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-600" />} bgColor="bg-red-100" value={stats.activeDisputes} label="Active Disputes" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} bgColor="bg-emerald-100" value={stats.resolvedDisputes} label="Resolved Disputes" />
        </div>
      )}

      <Tabs defaultValue="transactions" onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Description or seller email..." value={txnSearch}
                      onChange={e => setTxnSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { const f = { ...txnFilters, search: txnSearch || undefined, page: 1 }; setTxnFilters(f); loadTransactions(f) } }}
                    />
                  </div>
                </div>
                <div className="w-[160px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                  <Select value={txnFilters.status || "all"} onValueChange={v => { const f = { ...txnFilters, status: v === "all" ? undefined : v as TransactionStatus, page: 1 }; setTxnFilters(f); loadTransactions(f) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                      <SelectItem value="in_escrow">In Escrow</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="dispute">Dispute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[120px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Min Amount</Label>
                  <Input type="number" placeholder="0" min={0} value={txnFilters.minAmount || ""} onChange={e => setTxnFilters({ ...txnFilters, minAmount: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="w-[120px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Max Amount</Label>
                  <Input type="number" placeholder="∞" min={0} value={txnFilters.maxAmount || ""} onChange={e => setTxnFilters({ ...txnFilters, maxAmount: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
                  <Input type="date" value={txnFilters.dateFrom || ""} onChange={e => setTxnFilters({ ...txnFilters, dateFrom: e.target.value || undefined })} />
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
                  <Input type="date" value={txnFilters.dateTo || ""} onChange={e => setTxnFilters({ ...txnFilters, dateTo: e.target.value || undefined })} />
                </div>
                <Button onClick={() => { const f = { ...txnFilters, search: txnSearch || undefined, page: 1 }; setTxnFilters(f); loadTransactions(f) }}>Apply Filters</Button>
                <Button variant="ghost" onClick={() => { setTxnSearch(""); setTxnFilters({}); loadTransactions({}) }}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>{txnPagination.total} total transactions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadTransactions(txnFilters)} disabled={txnLoading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${txnLoading ? "animate-spin" : ""}`} /> Reload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {txnLoading && transactions.length === 0 ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No transactions found</p>
                  <p className="text-sm text-muted-foreground mt-1">Adjust your filters or wait for new activity</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map(txn => {
                    const allowedActions = getAdminAllowedActions(txn.status as TransactionStatus)
                    const canRelease = allowedActions.includes("released")
                    const canRefund = allowedActions.includes("cancelled")
                    return (
                      <div key={txn.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{txn.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>Buyer: {txn.buyer?.full_name || txn.buyer?.email || "N/A"}</span>
                            <span>·</span>
                            <span>Seller: {txn.seller?.full_name || txn.seller?.email || txn.seller_email}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(txn.created_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-foreground">{formatCurrency(Number(txn.amount), txn.currency)}</p>
                        </div>
                        <div className="shrink-0"><StatusBadge status={txn.status} config={txnStatusConfig} /></div>
                        <div className="flex items-center gap-1 shrink-0">
                          {canRelease && (
                            <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => openActionDialog("release", txn)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Release
                            </Button>
                          )}
                          {canRefund && (
                            <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => openActionDialog("refund", txn)}>
                              <Ban className="w-3.5 h-3.5 mr-1" /> Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <PaginationControls page={txnPagination.page} totalPages={txnPagination.totalPages} onPageChange={p => { const f = { ...txnFilters, page: p }; setTxnFilters(f); loadTransactions(f) }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISPUTES TAB */}
        <TabsContent value="disputes" className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Reason or description..." value={disputeSearch}
                      onChange={e => setDisputeSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { const f = { ...disputeFilters, search: disputeSearch || undefined, page: 1 }; setDisputeFilters(f); loadDisputes(f) } }}
                    />
                  </div>
                </div>
                <div className="w-[160px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                  <Select value={disputeFilters.status || "all"} onValueChange={v => { const f = { ...disputeFilters, status: v === "all" ? undefined : v as any, page: 1 }; setDisputeFilters(f); loadDisputes(f) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => { const f = { ...disputeFilters, search: disputeSearch || undefined, page: 1 }; setDisputeFilters(f); loadDisputes(f) }}>Apply</Button>
                <Button variant="ghost" onClick={() => { setDisputeSearch(""); setDisputeFilters({}); loadDisputes({}) }}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Disputes</CardTitle>
                  <CardDescription>{disputePagination.total} total disputes</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadDisputes(disputeFilters)} disabled={disputeLoading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${disputeLoading ? "animate-spin" : ""}`} /> Reload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {disputeLoading && disputes.length === 0 ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : disputes.length === 0 ? (
                <div className="text-center py-12">
                  <Gavel className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No disputes found</p>
                  <p className="text-sm text-muted-foreground mt-1">No disputes match your current filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {disputes.map(dispute => {
                    const txn = dispute.transaction
                    const isActionable = dispute.status === "under_review"
                    return (
                      <div key={dispute.id} className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{dispute.reason}</p>
                            <p className="text-sm text-muted-foreground mt-1">{dispute.description}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                              <span>Opened by: {dispute.opener?.full_name || dispute.opener?.email || "Unknown"}</span>
                              <span>·</span>
                              <span>Transaction: {formatCurrency(Number(txn?.amount || 0), txn?.currency)} — {txn?.description || "N/A"}</span>
                              <span>·</span>
                              <span>{formatDate(dispute.created_at)}</span>
                            </div>
                            {dispute.resolution && (
                              <div className="mt-2 p-2 bg-background rounded border text-sm">
                                <span className="font-medium">Resolution:</span> {dispute.resolution}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={dispute.status} config={disputeStatusConfig} />
                            {isActionable && (
                              <Button size="sm" onClick={() => openResolveDialog(dispute)}>
                                <Gavel className="w-3.5 h-3.5 mr-1" /> Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <PaginationControls page={disputePagination.page} totalPages={disputePagination.totalPages} onPageChange={p => { const f = { ...disputeFilters, page: p }; setDisputeFilters(f); loadDisputes(f) }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Name or email..." value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { const f = { ...userFilters, search: userSearch || undefined, page: 1 }; setUserFilters(f); loadUsers(f) } }}
                    />
                  </div>
                </div>
                <div className="w-[140px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                  <Select value={userFilters.role || "all"} onValueChange={v => { const f = { ...userFilters, role: v === "all" ? undefined : v as any, page: 1 }; setUserFilters(f); loadUsers(f) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => { const f = { ...userFilters, search: userSearch || undefined, page: 1 }; setUserFilters(f); loadUsers(f) }}>Apply</Button>
                <Button variant="ghost" onClick={() => { setUserSearch(""); setUserFilters({}); loadUsers({}) }}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>{userPagination.total} registered users</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadUsers(userFilters)} disabled={userLoading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${userLoading ? "animate-spin" : ""}`} /> Reload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {userLoading && users.length === 0 ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No users found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map(profile => (
                    <div key={profile.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{profile.full_name || "—"}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={profile.role === "admin" ? "default" : "secondary"}>{profile.role || "user"}</Badge>
                        <p className="text-xs text-muted-foreground">Joined {formatDate(profile.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <PaginationControls page={userPagination.page} totalPages={userPagination.totalPages} onPageChange={p => { const f = { ...userFilters, page: p }; setUserFilters(f); loadUsers(f) }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT LOG TAB */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[180px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Event Type</Label>
                  <Select value={auditFilters.eventType || "all"} onValueChange={v => { const f = { ...auditFilters, eventType: v === "all" ? undefined : v, page: 1 }; setAuditFilters(f); loadAuditLogs(f) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="admin.transaction.release">Transaction Release</SelectItem>
                      <SelectItem value="admin.transaction.refund">Transaction Refund</SelectItem>
                      <SelectItem value="admin.dispute.resolve">Dispute Resolve</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[160px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Target Table</Label>
                  <Select value={auditFilters.targetTable || "all"} onValueChange={v => { const f = { ...auditFilters, targetTable: v === "all" ? undefined : v, page: 1 }; setAuditFilters(f); loadAuditLogs(f) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tables</SelectItem>
                      <SelectItem value="transactions">Transactions</SelectItem>
                      <SelectItem value="disputes">Disputes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
                  <Input type="date" value={auditFilters.dateFrom || ""} onChange={e => setAuditFilters({ ...auditFilters, dateFrom: e.target.value || undefined })} />
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
                  <Input type="date" value={auditFilters.dateTo || ""} onChange={e => setAuditFilters({ ...auditFilters, dateTo: e.target.value || undefined })} />
                </div>
                <Button onClick={() => loadAuditLogs({ ...auditFilters, page: 1 })}>Apply</Button>
                <Button variant="ghost" onClick={() => { setAuditFilters({}); loadAuditLogs({}) }}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Audit Log</CardTitle>
                  <CardDescription>{auditPagination.total} entries — read-only, immutable</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadAuditLogs(auditFilters)} disabled={auditLoading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${auditLoading ? "animate-spin" : ""}`} /> Reload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading && auditLogs.length === 0 ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No audit log entries</p>
                  <p className="text-sm text-muted-foreground mt-1">Admin actions will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{log.event_type}</Badge>
                          <span className="text-xs text-muted-foreground">on</span>
                          <Badge variant="secondary" className="text-xs">{log.target_table}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Actor: {log.actor_id ? log.actor_id.substring(0, 8) + "..." : "system"}</span>
                        <span>Role: {log.actor_role}</span>
                        <span>Target: {log.target_id.substring(0, 8)}...</span>
                      </div>
                      {(log.old_values || log.new_values) && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {log.old_values && (
                            <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900/30">
                              <span className="font-medium text-red-700 dark:text-red-400">Before:</span>
                              <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(log.old_values, null, 1)}</pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded border border-emerald-200 dark:border-emerald-900/30">
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">After:</span>
                              <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(log.new_values, null, 1)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <PaginationControls page={auditPagination.page} totalPages={auditPagination.totalPages} onPageChange={p => { const f = { ...auditFilters, page: p }; setAuditFilters(f); loadAuditLogs(f) }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</CardTitle>
                <CardDescription>Update your admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input id="new-password" type={showPasswords.new ? "text" : "password"} value={passwordForm.newPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="pr-10" required minLength={8} />
                      <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input id="confirm-password" type={showPasswords.confirm ? "text" : "password"} value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="pr-10" required minLength={8} />
                      <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Update Password</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Mail className="w-5 h-5" /> Change Email</CardTitle>
                <CardDescription>Update your admin email address</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-email">Current Email</Label>
                    <Input id="current-email" type="email" value={user?.email || ""} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">New Email</Label>
                    <Input id="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={emailLoading} className="w-full">
                    {emailLoading ? "Sending verification..." : "Update Email"}
                  </Button>
                  <p className="text-xs text-muted-foreground">A verification link will be sent to the new email address</p>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Admin Access</p>
                  <p className="text-muted-foreground mt-1">
                    You have full access to all platform data and actions. All administrative actions are recorded in the immutable audit log.
                    Changes to email or password will require re-authentication.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* TRANSACTION ACTION CONFIRMATION */}
      <AlertDialog open={actionDialog.open} onOpenChange={open => !open && setActionDialog({ ...actionDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionDialog.type === "release"
                ? <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Release Funds</>
                : <><Ban className="w-5 h-5 text-red-600" /> Refund Transaction</>}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {actionDialog.type === "release"
                    ? "This will release the escrowed funds to the seller. This action is irreversible."
                    : "This will cancel the transaction and initiate a refund to the buyer. This action is irreversible."}
                </p>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium text-foreground">{actionDialog.transactionDesc}</p>
                  <p className="text-muted-foreground mt-1">Amount: {formatCurrency(actionDialog.transactionAmount)} · Current status: {actionDialog.transactionStatus}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Reason (recorded in audit log)</Label>
                  <Textarea value={actionReason} onChange={e => setActionReason(e.target.value)} rows={2} className="text-foreground" />
                </div>
                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>This action cannot be undone. The transaction will reach a terminal state.</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); executeAction() }} disabled={actionLoading}
              className={actionDialog.type === "release" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
              {actionLoading ? "Processing..." : actionDialog.type === "release" ? "Confirm Release" : "Confirm Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DISPUTE RESOLUTION DIALOG */}
      <Dialog open={resolveDialog.open} onOpenChange={open => !open && setResolveDialog({ ...resolveDialog, open: false })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gavel className="w-5 h-5" /> Resolve Dispute</DialogTitle>
            <DialogDescription>Review the dispute and make a binding resolution decision. This action is irreversible and recorded in the audit log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium text-foreground">{resolveDialog.disputeReason}</p>
              <p className="text-muted-foreground mt-1">Disputed amount: {formatCurrency(resolveDialog.transactionAmount)}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Decision</Label>
              <Select value={resolveDecision} onValueChange={v => setResolveDecision(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund_to_buyer">Refund to Buyer</SelectItem>
                  <SelectItem value="release_to_seller">Release to Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Resolution Reason (required)</Label>
              <Textarea value={resolveReason} onChange={e => setResolveReason(e.target.value)} rows={3} required />
            </div>
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>This resolution is final. Funds will be transferred based on your decision.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog({ ...resolveDialog, open: false })} disabled={resolveLoading}>Cancel</Button>
            <Button onClick={executeResolve} disabled={resolveLoading || !resolveReason.trim()}
              className={resolveDecision === "release_to_seller" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
              {resolveLoading ? "Processing..." : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

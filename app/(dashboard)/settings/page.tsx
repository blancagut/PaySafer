"use client"

import React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Eye,
  EyeOff,
  Lock,
  Globe,
  Bell,
  BellRing,
  BellOff,
  Loader2,
  Palette,
  Monitor,
  Moon,
  Sun,
  Shield,
  Smartphone,
  Download,
  Trash2,
  Info,
  Activity,
  LogOut,
  Fingerprint,
  EyeIcon,
  CreditCard,
  FileText,
  AlertTriangle,
  Zap,
  Hash,
  Link2,
  MessageCircle,
  Volume2,
  VolumeX,
  Mail,
  MailX,
  Megaphone,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassInput } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { toast } from "sonner"
import { updatePassword } from "@/lib/actions/profile"
import {
  getUserSettings,
  updateUserSettings,
  exportTransactionsCSV,
  exportOffersCSV,
  exportAccountData,
  deleteAccount,
  signOutAllSessions,
  type UserSettings,
} from "@/lib/actions/settings"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"

type SettingsSection = "security" | "notifications" | "appearance" | "preferences" | "privacy" | "sessions" | "connected" | "advanced"

// ─── Helpers ───

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SettingsSection>("security")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [passwordData, setPasswordData] = useState({ new: "", confirm: "" })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Settings state – loaded from Supabase
  const [settings, setSettings] = useState<UserSettings | null>(null)

  // Debounce ref for auto-save
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  // ─── Load Settings from Supabase ───
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await getUserSettings()
      if (!cancelled) {
        if (error) {
          toast.error("Failed to load settings")
          console.error(error)
        }
        if (data) setSettings(data)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ─── Persist a partial update to Supabase with debounce ───
  const persistSettings = useCallback(
    (patch: Partial<Omit<UserSettings, "id" | "created_at" | "updated_at">>) => {
      // Optimistically update local state
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev))

      // Debounce the actual API call
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(async () => {
        const { error } = await updateUserSettings(patch)
        if (error) {
          toast.error("Failed to save setting")
          console.error(error)
        }
      }, 400)
    },
    []
  )

  // ─── Password Change ───
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.new.length < 6) { toast.error("Password must be at least 6 characters"); return }
    if (passwordData.new !== passwordData.confirm) { toast.error("Passwords do not match"); return }
    setSaving(true)
    try {
      const result = await updatePassword(passwordData.new)
      if (result.error) toast.error(result.error)
      else { toast.success("Password updated successfully"); setPasswordData({ new: "", confirm: "" }) }
    } catch { toast.error("Failed to update password") }
    finally { setSaving(false) }
  }

  // ─── Export helpers ───
  const handleExportTransactions = async () => {
    setExporting("transactions")
    try {
      const { csv, error } = await exportTransactionsCSV()
      if (error) { toast.error(error); return }
      if (csv) {
        downloadFile(csv, `paysafer-transactions-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv")
        toast.success("Transactions exported")
      }
    } catch { toast.error("Export failed") }
    finally { setExporting(null) }
  }

  const handleExportOffers = async () => {
    setExporting("offers")
    try {
      const { csv, error } = await exportOffersCSV()
      if (error) { toast.error(error); return }
      if (csv) {
        downloadFile(csv, `paysafer-offers-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv")
        toast.success("Offers exported")
      }
    } catch { toast.error("Export failed") }
    finally { setExporting(null) }
  }

  const handleExportAccountData = async () => {
    setExporting("account")
    try {
      const { json, error } = await exportAccountData()
      if (error) { toast.error(error); return }
      if (json) {
        downloadFile(json, `paysafer-account-data-${new Date().toISOString().slice(0, 10)}.json`, "application/json")
        toast.success("Account data exported")
      }
    } catch { toast.error("Export failed") }
    finally { setExporting(null) }
  }

  // ─── Delete Account ───
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return
    setDeleting(true)
    try {
      const { success, error } = await deleteAccount()
      if (error) { toast.error(error); return }
      if (success) {
        toast.success("Account scheduled for deletion. Signing out…")
        router.push("/login")
      }
    } catch { toast.error("Delete failed") }
    finally { setDeleting(false); setShowDeleteDialog(false) }
  }

  // ─── Sign Out All ───
  const handleSignOutAll = async () => {
    setSigningOut(true)
    try {
      const { success, error } = await signOutAllSessions()
      if (error) toast.error(error)
      else if (success) toast.success("All other sessions have been revoked")
    } catch { toast.error("Failed to sign out sessions") }
    finally { setSigningOut(false) }
  }

  const sections: { key: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { key: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { key: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { key: "preferences", label: "Preferences", icon: <Globe className="w-4 h-4" /> },
    { key: "privacy", label: "Privacy", icon: <EyeIcon className="w-4 h-4" /> },
    { key: "sessions", label: "Sessions", icon: <Smartphone className="w-4 h-4" /> },
    { key: "connected", label: "Connected Apps", icon: <Link2 className="w-4 h-4" /> },
    { key: "advanced", label: "Advanced", icon: <Shield className="w-4 h-4" /> },
  ]

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Sidebar Nav ─── */}
        <div className="lg:w-56 shrink-0">
          <GlassCard padding="none" className="sticky top-20">
            <div className="p-2">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === s.key
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 max-w-2xl space-y-6">

          {/* ═══ SECURITY ═══ */}
          {activeSection === "security" && (
            <div className="space-y-6 animate-fade-in">
              <GlassContainer header={{ title: "Change Password", description: "Update your password to keep your account secure" }}>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-foreground text-sm">New Password</Label>
                    <div className="relative">
                      <GlassInput id="newPassword" type={showNewPassword ? "text" : "password"} value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} placeholder="At least 6 characters" icon={<Lock className="w-3.5 h-3.5" />} required />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground text-sm">Confirm Password</Label>
                    <div className="relative">
                      <GlassInput id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} placeholder="Re-enter new password" icon={<Lock className="w-3.5 h-3.5" />} required />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={saving || !passwordData.new || !passwordData.confirm} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update Password"}
                  </Button>
                </form>
              </GlassContainer>

              <GlassContainer header={{ title: "Authentication", description: "Additional security measures" }}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Fingerprint className="w-4 h-4 text-primary" /></div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add an authenticator app for extra security</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Coming soon</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Activity className="w-4 h-4 text-amber-400" /></div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Login Alerts</p>
                        <p className="text-xs text-muted-foreground">Get notified on new device logins</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.login_alerts ?? true}
                      onCheckedChange={(checked) => persistSettings({ login_alerts: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Shield className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Require Password on Actions</p>
                        <p className="text-xs text-muted-foreground">Confirm password for releases &gt; $500</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.require_password_actions ?? true}
                      onCheckedChange={(checked) => persistSettings({ require_password_actions: checked })}
                    />
                  </div>
                </div>
              </GlassContainer>
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {activeSection === "notifications" && (
            <div className="space-y-6 animate-fade-in">
              {/* ── Delivery Channels ── */}
              <GlassContainer header={{ title: "Delivery Channels", description: "How you receive notifications" }}>
                <div className="space-y-1">
                  {([
                    {
                      key: "notify_realtime" as const,
                      title: "In-App Notifications",
                      desc: "Real-time alerts inside the dashboard",
                      icon: <BellRing className="w-4 h-4" />,
                      color: "bg-primary/10 text-primary",
                    },
                    {
                      key: "notify_sound" as const,
                      title: "Notification Sounds",
                      desc: "Play a sound when new notifications arrive",
                      icon: settings?.notify_sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />,
                      color: "bg-violet-500/10 text-violet-500",
                    },
                    {
                      key: "notify_email" as const,
                      title: "Email Notifications",
                      desc: "Receive alerts for critical events via email",
                      icon: settings?.notify_email ? <Mail className="w-4 h-4" /> : <MailX className="w-4 h-4" />,
                      color: "bg-blue-500/10 text-blue-500",
                    },
                  ] as const).map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.[item.key] ?? false}
                        onCheckedChange={(checked) => persistSettings({ [item.key]: checked })}
                      />
                    </div>
                  ))}
                </div>
              </GlassContainer>

              {/* ── Activity Types ── */}
              <GlassContainer header={{ title: "Activity Types", description: "Choose which events trigger notifications" }}>
                <div className="space-y-1">
                  {([
                    {
                      key: "notify_transactions" as const,
                      title: "Transactions & Payments",
                      desc: "Escrow updates, payment confirmations, wallet top-ups, and P2P transfers",
                      icon: <CreditCard className="w-4 h-4" />,
                      color: "bg-green-500/10 text-green-500",
                    },
                    {
                      key: "notify_messages" as const,
                      title: "Messages",
                      desc: "Direct messages and transaction chat notifications",
                      icon: <MessageCircle className="w-4 h-4" />,
                      color: "bg-blue-500/10 text-blue-500",
                    },
                    {
                      key: "notify_disputes" as const,
                      title: "Disputes",
                      desc: "Dispute openings, messages, and resolution updates",
                      icon: <AlertTriangle className="w-4 h-4" />,
                      color: "bg-orange-500/10 text-orange-500",
                    },
                    {
                      key: "notify_offers" as const,
                      title: "Offers",
                      desc: "When someone sends, accepts, or cancels an offer",
                      icon: <Link2 className="w-4 h-4" />,
                      color: "bg-cyan-500/10 text-cyan-500",
                    },
                  ] as const).map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.[item.key] ?? false}
                        onCheckedChange={(checked) => persistSettings({ [item.key]: checked })}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">
                      Security alerts and scam warnings are always sent and cannot be turned off.
                    </p>
                  </div>
                </div>
              </GlassContainer>

              {/* ── Extras ── */}
              <GlassContainer header={{ title: "Extras", description: "Digest and promotional communications" }}>
                <div className="space-y-1">
                  {([
                    {
                      key: "notify_weekly_digest" as const,
                      title: "Weekly Digest",
                      desc: "Summary of your activity delivered every Monday",
                      icon: <FileText className="w-4 h-4" />,
                      color: "bg-amber-500/10 text-amber-500",
                    },
                    {
                      key: "notify_marketing" as const,
                      title: "Product Updates & Tips",
                      desc: "News, feature releases, and helpful tips from PaySafe",
                      icon: <Megaphone className="w-4 h-4" />,
                      color: "bg-pink-500/10 text-pink-500",
                    },
                  ] as const).map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.[item.key] ?? false}
                        onCheckedChange={(checked) => persistSettings({ [item.key]: checked })}
                      />
                    </div>
                  ))}
                </div>
              </GlassContainer>
            </div>
          )}

          {/* ═══ APPEARANCE ═══ */}
          {activeSection === "appearance" && (
            <GlassContainer header={{ title: "Appearance", description: "Customize how PaySafer looks" }} className="animate-fade-in">
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-foreground font-medium">Theme</Label>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {[
                      { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
                      { value: "light", label: "Light", icon: Sun, desc: "Classic look" },
                      { value: "system", label: "System", icon: Monitor, desc: "Match device" },
                    ].map((t) => (
                      <button key={t.value} onClick={() => setTheme(t.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${theme === t.value ? "border-primary/40 bg-primary/10 shadow-lg shadow-primary/5" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                        <t.icon className={`w-5 h-5 mb-2 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                        <p className={`text-sm font-semibold ${theme === t.value ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-foreground">Animations</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Enable motion effects and transitions</p>
                    </div>
                    <Switch
                      checked={settings?.animations ?? true}
                      onCheckedChange={(v) => persistSettings({ animations: v })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <Label className="text-sm text-foreground font-medium">Keyboard Shortcuts</Label>
                  <div className="mt-3 space-y-2">
                    {[
                      { keys: ["Ctrl", "K"], action: "Command palette" },
                      { keys: ["Ctrl", "B"], action: "Toggle sidebar" },
                      { keys: ["Ctrl", "N"], action: "New offer" },
                      { keys: ["Esc"], action: "Close modal / palette" },
                    ].map((shortcut, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
                        <span className="text-xs text-muted-foreground">{shortcut.action}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((k) => (
                            <kbd key={k} className="px-2 py-1 text-[10px] font-mono font-semibold rounded bg-white/[0.08] border border-white/[0.10] text-foreground">{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassContainer>
          )}

          {/* ═══ PREFERENCES ═══ */}
          {activeSection === "preferences" && (
            <GlassContainer header={{ title: "Preferences", description: "Customize your experience" }} className="animate-fade-in">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm text-foreground font-medium">Default Currency</Label>
                  <Select value={settings?.currency ?? "USD"} onValueChange={(v) => persistSettings({ currency: v })}>
                    <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD - US Dollar", "EUR - Euro", "GBP - British Pound", "CAD - Canadian Dollar", "AUD - Australian Dollar", "CHF - Swiss Franc", "JPY - Japanese Yen", "CNY - Chinese Yuan", "INR - Indian Rupee", "BRL - Brazilian Real"].map((c) => {
                        const code = c.split(" - ")[0]
                        return <SelectItem key={code} value={code}>{c}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground font-medium">Language</Label>
                  <Select value={settings?.language ?? "en"} onValueChange={(v) => persistSettings({ language: v })}>
                    <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[["en", "English"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"], ["pt", "Português"], ["ar", "Arabic"], ["zh", "Chinese"], ["ja", "Japanese"], ["ko", "Korean"], ["hi", "Hindi"]].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground font-medium">Timezone</Label>
                  <Select value={settings?.timezone ?? "UTC"} onValueChange={(v) => persistSettings({ timezone: v })}>
                    <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Shanghai", "Asia/Tokyo", "Asia/Kolkata", "Australia/Sydney"].map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground font-medium">Date Format</Label>
                  <Select value={settings?.date_format ?? "MM/DD/YYYY"} onValueChange={(v) => persistSettings({ date_format: v })}>
                    <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                      <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (DE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between py-3.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-foreground">Compact Mode</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Reduce spacing for denser display</p>
                    </div>
                    <Switch
                      checked={settings?.compact_mode ?? false}
                      onCheckedChange={(v) => persistSettings({ compact_mode: v })}
                    />
                  </div>
                </div>
              </div>
            </GlassContainer>
          )}

          {/* ═══ PRIVACY ═══ */}
          {activeSection === "privacy" && (
            <GlassContainer header={{ title: "Privacy", description: "Control who can see your information" }} className="animate-fade-in">
              <div className="space-y-1">
                {([
                  { key: "profile_visible" as const, title: "Public Profile", desc: "Allow others to view your profile page" },
                  { key: "show_full_name" as const, title: "Show Full Name", desc: "Display your name to counterparties" },
                  { key: "show_stats" as const, title: "Show Transaction Stats", desc: "Let others see your success rate and volume" },
                  { key: "show_activity" as const, title: "Show Online Status", desc: "Show when you were last active" },
                  { key: "allow_search_by_email" as const, title: "Discoverable by Email", desc: "Allow people to find you by email address" },
                ] as const).map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={settings?.[item.key] ?? false}
                      onCheckedChange={(checked) => persistSettings({ [item.key]: checked })}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Your email and user ID are never shared publicly. Only counterparties in active transactions see your email.
                </p>
              </div>
            </GlassContainer>
          )}

          {/* ═══ SESSIONS ═══ */}
          {activeSection === "sessions" && (
            <div className="space-y-6 animate-fade-in">
              <GlassContainer header={{ title: "Active Sessions", description: "Devices where you're currently logged in" }}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/[0.05] border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Monitor className="w-5 h-5 text-primary" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">This Device</p>
                          <GlassBadge variant="emerald" size="sm">Current</GlassBadge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) + "…" : "Unknown"} · Active now
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassContainer>

              <GlassCard padding="sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={signingOut}
                  onClick={handleSignOutAll}
                  className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300 w-full"
                >
                  {signingOut ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Signing out…</>
                  ) : (
                    <><LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign Out of All Other Devices</>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">This will invalidate all sessions except your current one.</p>
              </GlassCard>
            </div>
          )}

          {/* ═══ CONNECTED APPS ═══ */}
          {activeSection === "connected" && (
            <div className="space-y-6 animate-fade-in">
              <GlassContainer header={{ title: "Connected Services", description: "Third-party integrations and payment methods" }}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white tracking-wider">STRIPE</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Stripe Payment</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Process escrow payments securely</p>
                      </div>
                    </div>
                    <GlassBadge variant="amber" size="sm">Coming soon</GlassBadge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center text-lg font-bold text-foreground">G</div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Google Account</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sign in with Google for faster access</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-xs">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center"><Hash className="w-5 h-5 text-muted-foreground" /></div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Webhooks</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Receive real-time events to your server</p>
                      </div>
                    </div>
                    <GlassBadge variant="amber" size="sm">Coming soon</GlassBadge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">API Access</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Generate API keys for programmatic access</p>
                      </div>
                    </div>
                    <GlassBadge variant="amber" size="sm">Coming soon</GlassBadge>
                  </div>
                </div>
              </GlassContainer>
            </div>
          )}

          {/* ═══ ADVANCED ═══ */}
          {activeSection === "advanced" && (
            <div className="space-y-6 animate-fade-in">
              <GlassContainer header={{ title: "Data & Export", description: "Manage your data" }}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Export Transactions</p>
                        <p className="text-xs text-muted-foreground">Download CSV of all your transactions</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exporting === "transactions"}
                      onClick={handleExportTransactions}
                      className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]"
                    >
                      {exporting === "transactions" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Export CSV"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Export Offers</p>
                        <p className="text-xs text-muted-foreground">Download all your offer history</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exporting === "offers"}
                      onClick={handleExportOffers}
                      className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]"
                    >
                      {exporting === "offers" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Export"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Download Account Data</p>
                        <p className="text-xs text-muted-foreground">Get a copy of all your data (GDPR)</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exporting === "account"}
                      onClick={handleExportAccountData}
                      className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]"
                    >
                      {exporting === "account" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Request"}
                    </Button>
                  </div>
                </div>
              </GlassContainer>

              <GlassCard padding="sm" className="border-red-500/10">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5"><Trash2 className="w-4 h-4 text-red-400" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Danger Zone</p>
                    <p className="text-xs text-muted-foreground mt-1">Once you delete your account, all data will be permanently removed. This cannot be undone.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="mt-3 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

        </div>
      </div>

      {/* ─── Delete Account Confirmation Dialog ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action is <strong>irreversible</strong>. All your data, transactions, offers, and settings will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm text-foreground">
              Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm
            </Label>
            <GlassInput
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText("") }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

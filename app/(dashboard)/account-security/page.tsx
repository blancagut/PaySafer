"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  LogOut,
  Key,
  Fingerprint,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  MapPin,
  Clock,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { getUserSettings, updateUserSettings } from "@/lib/actions/settings"

// ─── Types ───

type Tab = "settings" | "sessions" | "history"

interface SessionInfo {
  id: string
  device: string
  browser: string
  location: string
  lastActive: string
  current: boolean
}

// ─── Helpers ───

function getBrowserInfo(): { device: string; browser: string } {
  if (typeof window === "undefined") return { device: "Unknown", browser: "Unknown" }
  const ua = navigator.userAgent
  const isMobile = /iPhone|iPad|Android/i.test(ua)
  const device = isMobile ? "Mobile Device" : "Desktop"
  const browsers = [
    { pattern: /Edg\//i, name: "Edge" },
    { pattern: /OPR\//i, name: "Opera" },
    { pattern: /Firefox\//i, name: "Firefox" },
    { pattern: /Chrome\//i, name: "Chrome" },
    { pattern: /Safari\//i, name: "Safari" },
  ]
  const match = browsers.find((b) => b.pattern.test(ua))
  return { device, browser: match?.name ?? "Browser" }
}

export default function SecurityPage() {
  // ─── State ───
  const [tab, setTab] = useState<Tab>("settings")
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [showRevokeAll, setShowRevokeAll] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Password fields
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Real settings from DB
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [requirePasswordActions, setRequirePasswordActions] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)

  // Local/UI preference settings (not yet stored in DB — device-level)
  const [biometric, setBiometric] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)
  const [stealthMode, setStealthMode] = useState(false)

  // Session data
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null)

  // ─── Load on mount ───
  const loadData = useCallback(async () => {
    setPageLoading(true)
    const supabase = createClient()

    try {
      // 1. Load real user settings
      const settingsResult = await getUserSettings()
      if (settingsResult.data) {
        setLoginAlerts(settingsResult.data.login_alerts)
        setRequirePasswordActions(settingsResult.data.require_password_actions)
      }

      // 2. Check MFA status
      const { data: mfaData } = await supabase.auth.mfa.listFactors()
      const hasTOTP = (mfaData?.totp ?? []).some((f: any) => f.status === "verified")
      setMfaEnabled(hasTOTP)

      // 3. Get current session info
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session) {
        const { device, browser } = getBrowserInfo()
        setCurrentSession({
          id: sessionData.session.access_token.slice(-8),
          device,
          browser,
          location: "Current Location",
          lastActive: "Now",
          current: true,
        })
      }

      // 4. Load local preferences
      if (typeof window !== "undefined") {
        setBiometric(localStorage.getItem("pref_biometric") === "true")
        setSessionTimeout(localStorage.getItem("pref_session_timeout") === "true")
        setHideBalance(localStorage.getItem("pref_hide_balance") === "true")
        setStealthMode(localStorage.getItem("pref_stealth") === "true")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load security settings")
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Settings toggles ───
  const handleToggleDB = async (field: "login_alerts" | "require_password_actions", value: boolean) => {
    const result = await updateUserSettings({ [field]: value })
    if (result.error) {
      toast.error(result.error)
      // Revert
      if (field === "login_alerts") setLoginAlerts(!value)
      if (field === "require_password_actions") setRequirePasswordActions(!value)
    }
  }

  const handleLocalPref = (key: string, value: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, String(value))
    }
  }

  // ─── Password change ───
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Password updated successfully")
      setShowChangePassword(false)
      setNewPassword("")
      setConfirmPassword("")
    }
    setLoading(false)
  }

  // ─── Revoke other sessions ───
  const handleRevokeAll = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut({ scope: "others" })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("All other sessions signed out")
    }
    setShowRevokeAll(false)
    setLoading(false)
  }

  // ─── Security score ───
  const protections = [loginAlerts, requirePasswordActions, mfaEnabled, biometric, sessionTimeout]
  const activeCount = protections.filter(Boolean).length

  const tabs: { key: Tab; label: string }[] = [
    { key: "settings", label: "Settings" },
    { key: "sessions", label: "Sessions" },
    { key: "history", label: "Login History" },
  ]

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Security</h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Protect your account & manage access
              </p>
            </div>
          </div>
          <Button onClick={() => setShowChangePassword(true)} variant="outline" className="text-sm">
            <Key className="w-4 h-4 mr-1.5" />
            Change Password
          </Button>
        </div>
      </div>

      {/* Security Score */}
      <div className="animate-fade-in" style={{ animationDelay: "80ms" }}>
        <GlassCard padding="md" variant="glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className={cn("w-6 h-6", activeCount >= 4 ? "text-emerald-400" : activeCount >= 2 ? "text-amber-400" : "text-red-400")} />
              <div>
                <span className="text-sm font-medium text-foreground">Security Score</span>
                <p className="text-xs text-muted-foreground">
                  {activeCount} / {protections.length} protections active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-24 sm:w-32 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    activeCount >= 4 ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : activeCount >= 2 ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : "bg-gradient-to-r from-red-500 to-red-400"
                  )}
                  style={{ width: `${(activeCount / protections.length) * 100}%` }}
                />
              </div>
              <span className={cn("text-xs font-mono", activeCount >= 4 ? "text-emerald-400" : activeCount >= 2 ? "text-amber-400" : "text-red-400")}>
                {Math.round((activeCount / protections.length) * 100)}%
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="animate-fade-in flex gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit" style={{ animationDelay: "120ms" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="animate-fade-in-up space-y-6" style={{ animationDelay: "180ms" }}>
          {/* Authentication */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-3">Authentication</h3>
            <div className="space-y-2">

              {/* 2FA — real status, managed via MFA flow */}
              <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Two-Factor Authentication</span>
                        {mfaEnabled
                          ? <GlassBadge variant="emerald" size="sm">Active</GlassBadge>
                          : <GlassBadge variant="red" size="sm">Inactive</GlassBadge>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground font-light">
                        {mfaEnabled ? "TOTP authenticator app is active" : "Set up an authenticator app for added security"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={mfaEnabled} disabled />
                </div>
              </GlassCard>

              {/* Biometric — local pref */}
              <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Fingerprint className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Biometric Login</span>
                      <p className="text-xs text-muted-foreground font-light">Use Face ID or fingerprint to access your account</p>
                    </div>
                  </div>
                  <Switch
                    checked={biometric}
                    onCheckedChange={(v) => {
                      setBiometric(v)
                      handleLocalPref("pref_biometric", v)
                      toast.success(`Biometric login ${v ? "enabled" : "disabled"}`)
                    }}
                  />
                </div>
              </GlassCard>

              {/* Login Alerts — real DB */}
              <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Login Alerts</span>
                      <p className="text-xs text-muted-foreground font-light">Get notified when your account is accessed from a new device</p>
                    </div>
                  </div>
                  <Switch
                    checked={loginAlerts}
                    onCheckedChange={(v) => {
                      setLoginAlerts(v)
                      handleToggleDB("login_alerts", v)
                      toast.success(`Login alerts ${v ? "enabled" : "disabled"}`)
                    }}
                  />
                </div>
              </GlassCard>

              {/* Session timeout — local pref */}
              <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Auto-Lock (5 min)</span>
                      <p className="text-xs text-muted-foreground font-light">Automatically lock the app after 5 minutes of inactivity</p>
                    </div>
                  </div>
                  <Switch
                    checked={sessionTimeout}
                    onCheckedChange={(v) => {
                      setSessionTimeout(v)
                      handleLocalPref("pref_session_timeout", v)
                      toast.success(`Auto-lock ${v ? "enabled" : "disabled"}`)
                    }}
                  />
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-3">Privacy</h3>
            <div className="space-y-2">

              {/* Hide balance — local pref */}
              <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <EyeOff className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Hide Balances by Default</span>
                      <p className="text-xs text-muted-foreground font-light">Conceal balances on dashboard until tapped</p>
                    </div>
                  </div>
                  <Switch
                    checked={hideBalance}
                    onCheckedChange={(v) => {
                      setHideBalance(v)
                      handleLocalPref("pref_hide_balance", v)
                      toast.success(`Balance visibility ${v ? "hidden" : "visible"}`)
                    }}
                  />
                </div>
              </GlassCard>

              {/* Stealth mode — local pref */}
              <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Eye className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Stealth Mode</span>
                      <p className="text-xs text-muted-foreground font-light">Hide transaction details in notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={stealthMode}
                    onCheckedChange={(v) => {
                      setStealthMode(v)
                      handleLocalPref("pref_stealth", v)
                      toast.success(`Stealth mode ${v ? "enabled" : "disabled"}`)
                    }}
                  />
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="animate-fade-in-up space-y-4" style={{ animationDelay: "180ms" }}>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeAll(true)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out All Other Devices
            </Button>
          </div>

          {currentSession && (
            <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <Monitor className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{currentSession.device}</span>
                    <GlassBadge variant="emerald" size="sm">Current</GlassBadge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{currentSession.browser}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{currentSession.location}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {currentSession.lastActive}
                  </span>
                </div>
              </div>
            </GlassCard>
          )}

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-muted-foreground/70">
              We only show your current active session. Use "Sign Out All Other Devices" to invalidate
              any sessions on devices you no longer use.
            </p>
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {tab === "history" && (
        <div className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Login history is available in full audit logs.</p>
            <p className="text-xs text-muted-foreground/60">
              Session events are recorded server-side. Contact support for a detailed activity report.
            </p>
          </div>
        </div>
      )}

      {/* Revoke All Dialog */}
      <Dialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Sign Out All Other Devices</DialogTitle>
            <DialogDescription>
              This will immediately sign out all other sessions. You&apos;ll remain logged in on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeAll(false)}>Cancel</Button>
            <Button onClick={handleRevokeAll} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Sign Out Others
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Change Password</DialogTitle>
            <DialogDescription>Enter a new password for your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
            <button onClick={() => setShowPassword(!showPassword)} className="text-xs text-primary flex items-center gap-1">
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPassword ? "Hide" : "Show"} passwords
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowChangePassword(false); setNewPassword(""); setConfirmPassword("") }}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
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
import { GlassCard, GlassContainer } from "@/components/glass"
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

// ─── Security Settings ───

interface SecuritySetting {
  id: string
  label: string
  description: string
  icon: typeof Shield
  enabled: boolean
  category: "auth" | "privacy"
}

const initialSettings: SecuritySetting[] = [
  { id: "2fa", label: "Two-Factor Authentication", description: "Require a code from your authenticator app when logging in", icon: Key, enabled: true, category: "auth" },
  { id: "biometric", label: "Biometric Login", description: "Use Face ID or fingerprint to access your account", icon: Fingerprint, enabled: true, category: "auth" },
  { id: "login_alerts", label: "Login Alerts", description: "Get notified when your account is accessed from a new device", icon: AlertTriangle, enabled: true, category: "auth" },
  { id: "session_timeout", label: "Auto-Lock (5 min)", description: "Automatically lock the app after 5 minutes of inactivity", icon: Lock, enabled: false, category: "auth" },
  { id: "hide_balance", label: "Hide Balances by Default", description: "Conceal balances on dashboard until tapped", icon: EyeOff, enabled: false, category: "privacy" },
  { id: "stealth", label: "Stealth Mode", description: "Hide transaction details in notifications", icon: Eye, enabled: false, category: "privacy" },
]

// ─── Active Sessions ───

interface Session {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastActive: string
  icon: typeof Smartphone
  current: boolean
}

const mockSessions: Session[] = [
  { id: "s1", device: "iPhone 15 Pro", browser: "PaySafer App", location: "Dubai, UAE", ip: "86.96.xxx.xxx", lastActive: "Now", icon: Smartphone, current: true },
  { id: "s2", device: "MacBook Pro", browser: "Chrome 122", location: "Dubai, UAE", ip: "86.96.xxx.xxx", lastActive: "2 min ago", icon: Laptop, current: false },
  { id: "s3", device: "Windows Desktop", browser: "Edge 122", location: "Abu Dhabi, UAE", ip: "94.56.xxx.xxx", lastActive: "3 hours ago", icon: Monitor, current: false },
  { id: "s4", device: "Unknown Device", browser: "Firefox 121", location: "Sharjah, UAE", ip: "176.12.xxx.xxx", lastActive: "2 days ago", icon: Globe, current: false },
]

// ─── Login History ───

interface LoginEvent {
  id: string
  action: string
  device: string
  location: string
  time: string
  success: boolean
}

const loginHistory: LoginEvent[] = [
  { id: "lh1", action: "Login", device: "iPhone 15 Pro", location: "Dubai", time: "Today, 10:24 AM", success: true },
  { id: "lh2", action: "Login", device: "MacBook Pro", location: "Dubai", time: "Today, 9:05 AM", success: true },
  { id: "lh3", action: "Password Changed", device: "iPhone 15 Pro", location: "Dubai", time: "Yesterday, 4:30 PM", success: true },
  { id: "lh4", action: "Failed Login", device: "Unknown", location: "Riyadh, SA", time: "Yesterday, 2:12 PM", success: false },
  { id: "lh5", action: "Login", device: "MacBook Pro", location: "Dubai", time: "Mar 1, 8:20 AM", success: true },
  { id: "lh6", action: "2FA Enabled", device: "iPhone 15 Pro", location: "Dubai", time: "Feb 28, 11:00 AM", success: true },
]

type Tab = "settings" | "sessions" | "history"

export default function SecurityPage() {
  const [settings, setSettings] = useState<SecuritySetting[]>(initialSettings)
  const [sessions, setSessions] = useState<Session[]>(mockSessions)
  const [tab, setTab] = useState<Tab>("settings")
  const [showRevokeAll, setShowRevokeAll] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleToggle = async (id: string) => {
    setSettings(settings.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s))
    const setting = settings.find((s) => s.id === id)!
    toast.success(`${setting.label} ${setting.enabled ? "disabled" : "enabled"}`)
  }

  const handleRevokeSession = async (sessionId: string) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    const session = sessions.find((s) => s.id === sessionId)!
    setSessions(sessions.filter((s) => s.id !== sessionId))
    toast.success(`Session revoked — ${session.device}`)
    setLoading(false)
  }

  const handleRevokeAll = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setSessions(sessions.filter((s) => s.current))
    toast.success("All other sessions revoked")
    setShowRevokeAll(false)
    setLoading(false)
  }

  const handleChangePassword = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    toast.success("Password changed successfully")
    setShowChangePassword(false)
    setLoading(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "settings", label: "Settings" },
    { key: "sessions", label: "Sessions" },
    { key: "history", label: "Login History" },
  ]

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
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Security
              </h2>
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
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <span className="text-sm font-medium text-foreground">Security Score</span>
                <p className="text-xs text-muted-foreground">
                  {settings.filter((s) => s.enabled).length} / {settings.length} protections active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-24 sm:w-32 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${(settings.filter((s) => s.enabled).length / settings.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {Math.round((settings.filter((s) => s.enabled).length / settings.length) * 100)}%
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
              {settings.filter((s) => s.category === "auth").map((s) => {
                const Icon = s.icon
                return (
                  <GlassCard key={s.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{s.label}</span>
                          <p className="text-xs text-muted-foreground font-light">{s.description}</p>
                        </div>
                      </div>
                      <Switch checked={s.enabled} onCheckedChange={() => handleToggle(s.id)} />
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-3">Privacy</h3>
            <div className="space-y-2">
              {settings.filter((s) => s.category === "privacy").map((s) => {
                const Icon = s.icon
                return (
                  <GlassCard key={s.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{s.label}</span>
                          <p className="text-xs text-muted-foreground font-light">{s.description}</p>
                        </div>
                      </div>
                      <Switch checked={s.enabled} onCheckedChange={() => handleToggle(s.id)} />
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="animate-fade-in-up space-y-4" style={{ animationDelay: "180ms" }}>
          {sessions.length > 1 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowRevokeAll(true)} className="text-red-400 hover:text-red-300 text-xs">
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Revoke All Other Sessions
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {sessions.map((session) => {
              const Icon = session.icon
              return (
                <GlassCard key={session.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Icon className={cn("w-5 h-5", session.current ? "text-emerald-400" : "text-muted-foreground")} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{session.device}</span>
                        {session.current && <GlassBadge variant="emerald" size="sm">Current</GlassBadge>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{session.browser}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{session.location}</span>
                        <span>·</span>
                        <span>{session.ip}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {session.lastActive}
                      </span>
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={loading}
                          className="text-xs text-red-400 hover:text-red-300 mt-1 h-7 px-2"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {tab === "history" && (
        <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "180ms" }}>
          {loginHistory.map((event) => (
            <GlassCard key={event.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  event.success ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  {event.success
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <AlertTriangle className="w-4 h-4 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{event.action}</span>
                    {!event.success && <GlassBadge variant="red" size="sm">Failed</GlassBadge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {event.device} · {event.location}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{event.time}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Revoke All Dialog */}
      <Dialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Revoke All Sessions</DialogTitle>
            <DialogDescription>
              This will sign out all other devices. You&apos;ll remain logged in on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeAll(false)}>Cancel</Button>
            <Button onClick={handleRevokeAll} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Revoke All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Change Password</DialogTitle>
            <DialogDescription>Enter your current password and a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Current Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button onClick={() => setShowPassword(!showPassword)} className="text-xs text-primary flex items-center gap-1">
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPassword ? "Hide" : "Show"} passwords
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePassword(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

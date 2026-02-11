"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Plus,
  History,
  AlertTriangle,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Shield,
  Search,
  BarChart3,
  Wallet,
  FileText,
  Menu,
  ChevronRight,
  Command,
  Banknote,
  MessageCircle,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { useNotificationSubscription } from "@/lib/supabase/realtime"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { LanguageSelector } from "@/components/language-selector"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { PushPermissionPrompt } from "@/components/notifications/push-permission-prompt"
import { playNotificationSound } from "@/lib/notifications/sound"
import { DashboardSidebar, allNavRoutes } from "@/components/dashboard-sidebar"

// ─── Main Layout ───
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()

  // State
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [latestNotif, setLatestNotif] = useState<Record<string, unknown> | null>(null)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(true)

  // Persist sidebar state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev))
      return !prev
    })
  }, [])

  // Auth + profile
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase
          .from("profiles").select("*").eq("id", user.id).single()
          .then(({ data }) => setProfile(data))
          .catch(() => {}) // Silently handle profile fetch errors

        // Get unread notification count
        supabase
          .from("notifications").select("*", { count: "exact", head: true })
          .eq("user_id", user.id).eq("read", false)
          .then(({ count }) => setNotifCount(count ?? 0))
          .catch(() => {}) // Silently handle notification fetch errors

        // Load notification sound preference
        supabase
          .from("user_settings").select("notify_sound")
          .eq("id", user.id).single()
          .then(({ data }) => {
            if (data) setNotifSoundEnabled(data.notify_sound !== false)
          })
          .catch(() => {})

        // Register service worker for push notifications
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.register("/sw.js").catch(() => {})
        }
      }
    }).catch(() => {}) // Silently handle auth errors

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => setProfile(data))
          .catch(() => {})
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Real-time notifications
  useNotificationSubscription(user?.id, (notification) => {
    setNotifCount((prev) => prev + 1)
    setLatestNotif(notification)

    // Rich toast with notification details
    const title = (notification as Record<string, unknown>).title as string || "New notification"
    const message = (notification as Record<string, unknown>).message as string || "You have a new update"
    toast.info(title, { description: message })

    // Play sound if enabled — pass type so the right MP3 plays
    if (notifSoundEnabled) {
      playNotificationSound((notification as Record<string, unknown>).type as string)
    }
  })

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCmdOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Signed out successfully")
    router.push("/login")
    router.refresh()
  }

  const userName = profile?.full_name || user?.email?.split("@")[0] || "User"
  const userInitials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] || "U").toUpperCase()

  // Find current page title
  const pageTitle = useMemo(() => {
    return (
      allNavRoutes.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.name ||
      "Dashboard"
    )
  }, [pathname])

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={cn(
          "hidden md:flex flex-col glass-sidebar transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        <DashboardSidebar
          profile={profile}
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      {/* ─── Mobile Sidebar Sheet ─── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-[hsl(222,47%,5%)] border-r border-white/[0.06] glass-sidebar">
          <div className="flex flex-col h-full">
            <DashboardSidebar
              profile={profile}
              collapsed={false}
              onToggleCollapse={toggleSidebar}
              mobile
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Main Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ─── Top Bar ─── */}
        <header className="h-16 glass-topbar flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search / Command Palette trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.07] transition-colors text-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Search...</span>
              <kbd className="hidden lg:inline-flex h-5 items-center gap-0.5 rounded border border-white/[0.12] bg-white/[0.04] px-1.5 text-[10px] font-medium text-muted-foreground">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            {/* Language Selector */}
            <LanguageSelector />

            {/* Notifications */}
            <NotificationDropdown
              count={notifCount}
              onCountChange={setNotifCount}
              newNotification={latestNotif}
            />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                  <Avatar className="w-8 h-8 border border-white/[0.10]">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-foreground">{userName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[hsl(222,47%,8%)] border-white/[0.10] backdrop-blur-xl"
              >
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <p className="text-sm font-medium text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="p-1">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wallet" className="flex items-center gap-2 cursor-pointer">
                      <Wallet className="w-4 h-4" />
                      Wallet
                    </Link>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <div className="p-1">
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-400 focus:text-red-400 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ─── Page Content ─── */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <PushPermissionPrompt />
          {children}
        </main>

        {/* ─── Mobile Bottom Nav ─── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-topbar flex items-center justify-around py-2 px-1 safe-area-bottom">
          {[
            { name: "Home", href: "/dashboard", icon: LayoutDashboard },
            { name: "Wallet", href: "/wallet", icon: Wallet },
            { name: "Create", href: "/transactions/new", icon: Plus, primary: true },
            { name: "Transactions", href: "/transactions", icon: History },
            { name: "More", href: "#", icon: Menu, action: () => setMobileOpen(true) },
          ].map((item) => {
            const isActive = item.href !== "#" && (pathname === item.href || pathname.startsWith(item.href + "/"))
            const handleClick = item.action
              ? (e: React.MouseEvent) => { e.preventDefault(); item.action() }
              : undefined
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleClick}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[56px]",
                  item.primary
                    ? "text-primary"
                    : isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                )}
              >
                {item.primary ? (
                  <div className="w-10 h-10 -mt-4 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                ) : (
                  <item.icon className="w-5 h-5" />
                )}
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ─── Command Palette ─── */}
      {cmdOpen && (
        <CommandPalette
          open={cmdOpen}
          onClose={() => setCmdOpen(false)}
          onNavigate={(href) => {
            setCmdOpen(false)
            router.push(href)
          }}
        />
      )}
    </div>
  )
}

// ─── Command Palette Component ───
function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate: (href: string) => void
}) {
  const [query, setQuery] = useState("")

  const allItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Home" },
    { name: "Create Offer", href: "/transactions/new", icon: Plus, group: "Actions" },
    { name: "Transactions", href: "/transactions", icon: History, group: "Money" },
    { name: "Offers", href: "/offers", icon: FileText, group: "Money" },
    { name: "Wallet", href: "/wallet", icon: Wallet, group: "Money" },
    { name: "Payouts", href: "/payouts", icon: Banknote, group: "Money" },
    { name: "Services", href: "/services", icon: Sparkles, group: "Services" },
    { name: "Disputes", href: "/disputes", icon: AlertTriangle, group: "Services" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, group: "Services" },
    { name: "Messages", href: "/messages", icon: MessageCircle, group: "Account" },
    { name: "Profile", href: "/profile", icon: User, group: "Account" },
    { name: "Settings", href: "/settings", icon: Settings, group: "Account" },
    { name: "Help Center", href: "/help", icon: HelpCircle, group: "Account" },
    { name: "Trust & Security", href: "/trust", icon: Shield, group: "Account" },
  ]

  const filtered = query
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : allItems

  const groups = filtered.reduce<Record<string, typeof allItems>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[95%] max-w-lg animate-scale-in">
        <div className="rounded-xl bg-[hsl(222,47%,8%)] border border-white/[0.10] shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, actions..."
              className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <kbd className="text-[10px] border border-white/[0.12] bg-white/[0.04] text-muted-foreground px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto py-2">
            {Object.keys(groups).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group}
                    </span>
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => onNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-white/[0.06] transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span>{item.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto" />
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

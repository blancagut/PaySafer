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
  Bell,
  Sparkles,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  BarChart3,
  Wallet,
  FileText,
  Menu,
  X,
  Check,
  ChevronRight,
  Command,
  Banknote,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { useNotificationSubscription } from "@/lib/supabase/realtime"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"

// ─── Navigation Config ───
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Offer", href: "/transactions/new", icon: Plus },
  { name: "Services", href: "/services", icon: Sparkles, badge: "NEW" },
  { name: "Transactions", href: "/transactions", icon: History },
  { name: "Offers", href: "/offers", icon: FileText },
  { name: "Disputes", href: "/disputes", icon: AlertTriangle },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Payouts", href: "/payouts", icon: Banknote },
]

const adminNavigation = [
  { name: "Admin Panel", href: "/admin", icon: Shield },
]

const accountNavigation = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
]

// ─── Sidebar Nav Link ───
function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: { name: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: string }
  isActive: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        isActive
          ? "bg-primary/10 text-primary border border-primary/20"
          : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground border border-transparent"
      )}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
      {!collapsed && (
        <>
          <span className="truncate">{item.name}</span>
          {item.badge && (
            <span className="ml-auto text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

// ─── Notification Bell ───
function NotificationBell({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 animate-scale-in">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

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
  const [cmdOpen, setCmdOpen] = useState(false)

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

        // Get unread notification count
        supabase
          .from("notifications").select("*", { count: "exact", head: true })
          .eq("user_id", user.id).eq("read", false)
          .then(({ count }) => setNotifCount(count ?? 0))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => setProfile(data))
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Real-time notifications
  useNotificationSubscription(user?.id, () => {
    setNotifCount((prev) => prev + 1)
    toast.info("New notification", { description: "You have a new update" })
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
    const allRoutes = [...navigation, ...adminNavigation, ...accountNavigation]
    return (
      allRoutes.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.name ||
      "Dashboard"
    )
  }, [pathname])

  // ─── Sidebar Content (shared between desktop and mobile) ───
  const sidebarContent = (mobile = false) => {
    const isCollapsed = mobile ? false : collapsed
    return (
      <>
        {/* Logo */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-white/[0.06] shrink-0",
            isCollapsed ? "justify-center px-3" : "px-5"
          )}
        >
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">P</span>
            </div>
          ) : (
            <Logo size="sm" linkTo="/dashboard" />
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
          {/* Main nav */}
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
              collapsed={isCollapsed}
            />
          ))}

          {/* Admin */}
          {profile?.role === "admin" && (
            <>
              <div className={cn("pt-5 pb-1", isCollapsed ? "px-0" : "px-1")}>
                {!isCollapsed && (
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Admin
                  </span>
                )}
                {isCollapsed && <div className="w-full h-px bg-white/[0.06]" />}
              </div>
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  collapsed={isCollapsed}
                />
              ))}
            </>
          )}

          {/* Account */}
          <div className={cn("pt-5 pb-1", isCollapsed ? "px-0" : "px-1")}>
            {!isCollapsed && (
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Account
              </span>
            )}
            {isCollapsed && <div className="w-full h-px bg-white/[0.06]" />}
          </div>
          {accountNavigation.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              collapsed={isCollapsed}
            />
          ))}
        </nav>

        {/* Bottom: Trust card + collapse toggle */}
        <div className="shrink-0 border-t border-white/[0.06]">
          {!isCollapsed && (
            <div className="p-3">
              <Link
                href="/trust"
                className="block p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Powered by Stripe</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Learn how we protect your money
                </p>
              </Link>
            </div>
          )}
          {!mobile && (
            <div className="p-2">
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4" />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={cn(
          "hidden md:flex flex-col glass-sidebar transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* ─── Mobile Sidebar Sheet ─── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-[hsl(222,47%,5%)] border-r border-white/[0.06]">
          <div className="flex flex-col h-full">{sidebarContent(true)}</div>
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

            {/* Notifications */}
            <NotificationBell
              count={notifCount}
              onClick={() => {
                router.push("/notifications")
              }}
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
          {children}
        </main>

        {/* ─── Mobile Bottom Nav ─── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-topbar flex items-center justify-around py-2 px-1 safe-area-bottom">
          {[
            { name: "Home", href: "/dashboard", icon: LayoutDashboard },
            { name: "Transactions", href: "/transactions", icon: History },
            { name: "Create", href: "/transactions/new", icon: Plus, primary: true },
            { name: "Disputes", href: "/disputes", icon: AlertTriangle },
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
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Pages" },
    { name: "Create Offer", href: "/transactions/new", icon: Plus, group: "Actions" },
    { name: "View Transactions", href: "/transactions", icon: History, group: "Pages" },
    { name: "View Disputes", href: "/disputes", icon: AlertTriangle, group: "Pages" },
    { name: "Manage Offers", href: "/offers", icon: FileText, group: "Pages" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, group: "Pages" },
    { name: "Wallet", href: "/wallet", icon: Wallet, group: "Pages" },
    { name: "Payouts", href: "/payouts", icon: Banknote, group: "Pages" },
    { name: "Services", href: "/services", icon: Sparkles, group: "Pages" },
    { name: "Profile", href: "/profile", icon: User, group: "Account" },
    { name: "Settings", href: "/settings", icon: Settings, group: "Account" },
    { name: "Help Center", href: "/help", icon: HelpCircle, group: "Account" },
    { name: "Trust & Security", href: "/trust", icon: Shield, group: "Pages" },
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

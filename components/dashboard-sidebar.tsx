"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Plus,
  History,
  AlertTriangle,
  User,
  Settings,
  HelpCircle,
  Sparkles,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Wallet,
  FileText,
  Banknote,
  MessageCircle,
  QrCode,
  Repeat,
  Award,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

// ─── Navigation Configuration ───

export const homeNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
]

export const moneyNavigation = [
  { name: "Transactions", href: "/transactions", icon: History },
  { name: "Offers", href: "/offers", icon: FileText },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "QR Pay", href: "/wallet/qr", icon: QrCode, badge: "NEW" as const },
  { name: "Recurring", href: "/wallet/recurring", icon: Repeat },
  { name: "Payouts", href: "/payouts", icon: Banknote },
]

export const servicesNavigation = [
  { name: "Services", href: "/services", icon: Sparkles, badge: "NEW" as const },
  { name: "Trust Score", href: "/trust", icon: Award },
  { name: "Disputes", href: "/disputes", icon: AlertTriangle },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export const accountNavigation = [
  { name: "Messages", href: "/messages", icon: MessageCircle },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
]

export const adminNavigation = [
  { name: "Admin Panel", href: "/admin", icon: Shield },
  { name: "Support", href: "/admin/chats", icon: MessageCircle },
]

/** Flat array of all routes — used for page title lookup */
export const allNavRoutes = [
  ...homeNavigation,
  ...moneyNavigation,
  ...servicesNavigation,
  ...accountNavigation,
  ...adminNavigation,
  { name: "Create Offer", href: "/transactions/new", icon: Plus },
]

// ─── NavLink ───

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
        "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
      )}
      title={collapsed ? item.name : undefined}
    >
      {/* Active left accent bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
      )}

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

// ─── Section Label ───

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div className={cn("pt-5 pb-1", collapsed ? "px-0" : "px-1")}>
      {!collapsed ? (
        <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
          {label}
        </span>
      ) : (
        <div className="w-full h-px bg-white/[0.06]" />
      )}
    </div>
  )
}

// ─── Sidebar Props ───

interface DashboardSidebarProps {
  profile: { role?: string; full_name?: string } | null
  collapsed: boolean
  onToggleCollapse: () => void
  mobile?: boolean
}

// ─── Sidebar Component ───

export function DashboardSidebar({
  profile,
  collapsed,
  onToggleCollapse,
  mobile = false,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const isCollapsed = mobile ? false : collapsed

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      {/* ── Logo ── */}
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

      {/* ── CTA: Create Offer (hidden for admins) ── */}
      {profile?.role !== "admin" && (
        <div className={cn("shrink-0", isCollapsed ? "px-2 pt-4" : "px-3 pt-4")}>
          <Link
            href="/transactions/new"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-all duration-200",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
              isCollapsed ? "w-10 h-10 mx-auto rounded-full p-0" : "w-full px-4 py-2.5"
            )}
          >
            <Plus className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!isCollapsed && <span>Create Offer</span>}
          </Link>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className={cn("flex-1 py-2 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
        {/* Home */}
        <div className="space-y-0.5">
          {homeNavigation.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={isCollapsed}
            />
          ))}
        </div>

        {/* Money (hidden for admins) */}
        {profile?.role !== "admin" && (
          <>
            <SectionLabel label="Money" collapsed={isCollapsed} />
            <div className="space-y-0.5">
              {moneyNavigation.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={isCollapsed}
                />
              ))}
            </div>
          </>
        )}

        {/* Services (hidden for admins) */}
        {profile?.role !== "admin" && (
          <>
            <SectionLabel label="Services" collapsed={isCollapsed} />
            <div className="space-y-0.5">
              {servicesNavigation.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={isCollapsed}
                />
              ))}
            </div>
          </>
        )}

        {/* Account */}
        <SectionLabel label="Account" collapsed={isCollapsed} />
        <div className="space-y-0.5">
          {accountNavigation
            .filter((item) => {
              if (profile?.role === "admin") {
                // Admins only see Settings
                return item.href === "/settings"
              }
              // Regular users see all except Help is already filtered
              return item.href !== "/help"
            })
            .map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={isCollapsed}
            />
          ))}
        </div>

        {/* Platform (admin-only) */}
        {profile?.role === "admin" && (
          <>
            <SectionLabel label="Platform" collapsed={isCollapsed} />
            <div className="space-y-0.5">
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  collapsed={isCollapsed}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* ── Bottom: Trust card + collapse toggle ── */}
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
              onClick={onToggleCollapse}
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

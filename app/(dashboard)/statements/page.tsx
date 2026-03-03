"use client"

import { useState } from "react"
import {
  FileText,
  Download,
  Calendar,
  ChevronDown,
  Search,
  Loader2,
  Filter,
  Eye,
  Mail,
  ArrowDownToLine,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Mock Data ───

interface Statement {
  id: string
  month: string
  year: number
  period: string
  type: "monthly" | "annual" | "tax"
  size: string
  transactions: number
  totalIn: number
  totalOut: number
  status: "ready" | "generating"
}

const mockStatements: Statement[] = [
  { id: "s1", month: "February", year: 2026, period: "Feb 1 – Feb 28, 2026", type: "monthly", size: "142 KB", transactions: 23, totalIn: 4250.00, totalOut: 2180.50, status: "ready" },
  { id: "s2", month: "January", year: 2026, period: "Jan 1 – Jan 31, 2026", type: "monthly", size: "198 KB", transactions: 31, totalIn: 6100.00, totalOut: 3420.75, status: "ready" },
  { id: "s3", month: "December", year: 2025, period: "Dec 1 – Dec 31, 2025", type: "monthly", size: "156 KB", transactions: 18, totalIn: 3800.00, totalOut: 2950.25, status: "ready" },
  { id: "s4", month: "November", year: 2025, period: "Nov 1 – Nov 30, 2025", type: "monthly", size: "134 KB", transactions: 15, totalIn: 2900.00, totalOut: 1650.00, status: "ready" },
  { id: "s5", month: "October", year: 2025, period: "Oct 1 – Oct 31, 2025", type: "monthly", size: "112 KB", transactions: 12, totalIn: 2100.00, totalOut: 1800.40, status: "ready" },
  { id: "s6", month: "Annual 2025", year: 2025, period: "Jan 1 – Dec 31, 2025", type: "annual", size: "1.2 MB", transactions: 187, totalIn: 45200.00, totalOut: 32100.90, status: "ready" },
  { id: "s7", month: "Tax Summary 2025", year: 2025, period: "Jan 1 – Dec 31, 2025", type: "tax", size: "98 KB", transactions: 187, totalIn: 45200.00, totalOut: 32100.90, status: "ready" },
]

const typeConfig: Record<string, { label: string; badge: "emerald" | "blue" | "purple" }> = {
  monthly: { label: "Monthly", badge: "emerald" },
  annual: { label: "Annual", badge: "blue" },
  tax: { label: "Tax", badge: "purple" },
}

export default function StatementsPage() {
  const [statements] = useState<Statement[]>(mockStatements)
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [downloading, setDownloading] = useState<string | null>(null)

  const years = [...new Set(statements.map((s) => s.year))].sort((a, b) => b - a)

  const filtered = statements.filter((s) => {
    if (yearFilter !== "all" && s.year !== Number(yearFilter)) return false
    if (typeFilter !== "all" && s.type !== typeFilter) return false
    return true
  })

  const handleDownload = async (statement: Statement) => {
    setDownloading(statement.id)
    await new Promise((r) => setTimeout(r, 1500))
    toast.success(`${statement.month} ${statement.year} statement downloaded`, {
      description: `PDF · ${statement.size}`,
    })
    setDownloading(null)
  }

  const handleEmailStatement = async (statement: Statement) => {
    toast.success("Statement sent to your email", {
      description: "Check your inbox in a few minutes.",
    })
  }

  const handleDownloadAll = async () => {
    setDownloading("all")
    await new Promise((r) => setTimeout(r, 2000))
    toast.success("All statements downloaded as ZIP")
    setDownloading(null)
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Statements
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Download monthly and annual account statements
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={downloading === "all"}
            className="text-sm font-medium"
          >
            {downloading === "all" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowDownToLine className="w-4 h-4 mr-2" />
            )}
            Download All
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md" className="border-emerald-500/20">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Statements are generated automatically on the 1st of each month. Annual and tax summaries
              are available after year-end. All statements are PDF format and suitable for tax filing.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="animate-fade-in flex items-center gap-3" style={{ animationDelay: "150ms" }}>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-white/[0.04] border-white/[0.10] text-sm">
            <Calendar className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-white/[0.04] border-white/[0.10] text-sm">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
            <SelectItem value="tax">Tax Summary</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} statement{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Statements List */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <div className="space-y-2">
          {filtered.map((statement) => {
            const tc = typeConfig[statement.type]
            return (
              <GlassCard key={statement.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-4 p-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {statement.month} {statement.type === "monthly" ? statement.year : ""}
                      </span>
                      <GlassBadge variant={tc.badge} size="sm">{tc.label}</GlassBadge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {statement.period} · {statement.transactions} transactions · {statement.size}
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-muted-foreground tracking-wide uppercase block">In</span>
                      <span className="text-sm text-emerald-400 font-mono">
                        +${statement.totalIn.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground tracking-wide uppercase block">Out</span>
                      <span className="text-sm text-red-400 font-mono">
                        -${statement.totalOut.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEmailStatement(statement)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      title="Email statement"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(statement)}
                      disabled={downloading === statement.id}
                      className="text-xs text-muted-foreground hover:text-primary"
                      title="Download PDF"
                    >
                      {downloading === statement.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>

      {/* Regulatory note */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            PaySafer maintains transaction records for a minimum of 5 years in compliance with
            US FinCEN and UAE CBUAE regulations. Statements older than 12 months may take a few
            moments to generate. For tax purposes, consult your financial advisor.
          </p>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Download,
  Calendar,
  Loader2,
  ArrowDownToLine,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
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
import { getWalletHistory, getWallet, type WalletTransaction } from "@/lib/actions/wallet"
import { getProfile } from "@/lib/actions/profile"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { generateStatement } from "@/lib/pdf/statement-generator"

// ─── Types ───

interface Statement {
  id: string
  month: string
  year: number
  period: string
  type: "monthly"
  transactions: number
  totalIn: number
  totalOut: number
  openingBalance: number
  closingBalance: number
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [downloading, setDownloading] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Load profile
    const profileResult = await getProfile()
    if (profileResult.data) {
      setProfile(profileResult.data)
    }

    // Load wallet
    const walletResult = await getWallet()
    if (walletResult.data) {
      setWallet(walletResult.data)
    }

    // Load all transactions
    const historyResult = await getWalletHistory({ limit: 1000 })
    if (historyResult.error) {
      toast.error(historyResult.error)
      setLoading(false)
      return
    }

    const transactions = historyResult.data || []
    
    // Group transactions by month
    const monthlyData = new Map<string, WalletTransaction[]>()
    transactions.forEach((txn) => {
      const date = parseISO(txn.created_at)
      const key = format(date, "yyyy-MM")
      if (!monthlyData.has(key)) {
        monthlyData.set(key, [])
      }
      monthlyData.get(key)!.push(txn)
    })

    // Generate statements for each month
    const generatedStatements: Statement[] = []
    let runningBalance = walletResult.data?.balance || 0

    // Sort months in descending order
    const sortedMonths = Array.from(monthlyData.keys()).sort().reverse()

    for (const monthKey of sortedMonths) {
      const [yearStr, monthStr] = monthKey.split("-")
      const year = parseInt(yearStr)
      const month = parseInt(monthStr)
      const monthTxns = monthlyData.get(monthKey) || []

      // Calculate totals
      const totalIn = monthTxns
        .filter((t) => t.direction === "credit")
        .reduce((sum, t) => sum + t.amount, 0)

      const totalOut = monthTxns
        .filter((t) => t.direction === "debit")
        .reduce((sum, t) => sum + t.amount, 0)

      // Calculate opening balance (this is approximate since we're working backwards)
      const netChange = totalIn - totalOut
      const closingBalance = monthTxns[0]?.balance_after || runningBalance
      const openingBalance = closingBalance - netChange

      const monthDate = new Date(year, month - 1, 1)
      const periodStart = startOfMonth(monthDate)
      const periodEnd = endOfMonth(monthDate)

      generatedStatements.push({
        id: monthKey,
        month: format(monthDate, "MMMM"),
        year,
        period: `${format(periodStart, "MMM d")} – ${format(periodEnd, "MMM d, yyyy")}`,
        type: "monthly",
        transactions: monthTxns.length,
        totalIn,
        totalOut,
        openingBalance,
        closingBalance,
      })

      runningBalance = openingBalance
    }

    setStatements(generatedStatements)
    setLoading(false)
  }

  const years = [...new Set(statements.map((s) => s.year))].sort((a, b) => b - a)

  const filtered = statements.filter((s) => {
    if (yearFilter !== "all" && s.year !== Number(yearFilter)) return false
    return true
  })

  const handleDownload = async (statement: Statement) => {
    if (!profile || !wallet) {
      toast.error("Profile or wallet data not loaded")
      return
    }

    setDownloading(statement.id)

    try {
      // Fetch transactions for this month
      const historyResult = await getWalletHistory({ limit: 1000 })
      if (historyResult.error) {
        toast.error(historyResult.error)
        return
      }

      const allTxns = historyResult.data || []
      const [year, month] = statement.id.split("-")
      const monthTxns = allTxns.filter((txn) => {
        const txnDate = format(parseISO(txn.created_at), "yyyy-MM")
        return txnDate === statement.id
      })

      // Prepare statement data
      const periodStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1, 1))
      const periodEnd = endOfMonth(new Date(parseInt(year), parseInt(month) - 1, 1))

      const statementData = {
        accountHolder: profile.full_name || profile.email,
        accountEmail: profile.email,
        periodStart,
        periodEnd,
        transactions: monthTxns.map((txn) => ({
          id: txn.id,
          type: txn.direction,
          amount: txn.amount,
          currency: wallet.currency,
          description: txn.description || `${txn.type} transaction`,
          created_at: txn.created_at,
        })),
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        currency: wallet.currency,
      }

      await generateStatement(statementData)
      toast.success(`${statement.month} ${statement.year} statement downloaded`)
    } catch (error) {
      console.error("PDF generation error:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Statements
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Download PDF account statements
            </p>
          </div>
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

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} statement{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Statements List */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        {loading ? (
          <GlassCard padding="lg" className="text-center">
            <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading statements...</p>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard padding="lg" className="text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No statements available</h3>
            <p className="text-sm text-muted-foreground">Statements will appear here once you have transaction activity</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((statement) => (
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
                        {statement.month} {statement.year}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        Monthly
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {statement.period} · {statement.transactions} transactions
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-muted-foreground tracking-wide uppercase block">In</span>
                      <span className="text-sm text-emerald-400 font-mono">
                        +{wallet?.currency || "$"}{statement.totalIn.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground tracking-wide uppercase block">Out</span>
                      <span className="text-sm text-red-400 font-mono">
                        -{wallet?.currency || "$"}{statement.totalOut.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
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
            ))}
          </div>
        )}
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

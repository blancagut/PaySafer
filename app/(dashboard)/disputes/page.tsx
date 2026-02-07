import Link from "next/link"
import { AlertTriangle, Clock, CheckCircle2, FileText, Inbox } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUserDisputes } from "@/lib/actions/disputes"

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  under_review: { label: "Under Review", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground", icon: CheckCircle2 },
}

export default async function DisputesPage() {
  const result = await getUserDisputes()
  const disputes = result.data ?? []

  const activeDisputes = disputes.filter((d: any) => d.status === "under_review")
  const resolvedDisputes = disputes.filter((d: any) => d.status !== "under_review")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Disputes</h2>
        <p className="text-muted-foreground mt-1">Manage and track your dispute cases</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{activeDisputes.length}</p>
                <p className="text-sm text-muted-foreground">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{resolvedDisputes.length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {disputes.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-12 text-center space-y-3">
            <Inbox className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No disputes</p>
            <p className="text-xs text-muted-foreground">Disputes can be opened from a transaction page.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Disputes */}
          {activeDisputes.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Active Disputes
                </CardTitle>
                <CardDescription>Disputes currently under review</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {activeDisputes.map((dispute: any) => {
                    const cfg = statusConfig[dispute.status] || statusConfig.under_review
                    const StatusIcon = cfg.icon
                    return (
                      <Link
                        key={dispute.id}
                        href={`/disputes/${dispute.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{dispute.transaction?.description || "Transaction"}</p>
                            <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {dispute.transaction?.currency} {Number(dispute.transaction?.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(dispute.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={cfg.className}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolved Disputes */}
          {resolvedDisputes.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Resolved Disputes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {resolvedDisputes.map((dispute: any) => {
                    const cfg = statusConfig[dispute.status] || statusConfig.resolved
                    const StatusIcon = cfg.icon
                    return (
                      <Link
                        key={dispute.id}
                        href={`/disputes/${dispute.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{dispute.transaction?.description || "Transaction"}</p>
                            <p className="text-sm text-muted-foreground">{dispute.resolution || dispute.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {dispute.transaction?.currency} {Number(dispute.transaction?.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(dispute.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={cfg.className}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Info */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">About Disputes</p>
              <p className="text-muted-foreground mt-1">
                We handle all disputes neutrally and fairly. Both parties have the opportunity to
                present their case. Resolution is based on transaction terms and evidence provided.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

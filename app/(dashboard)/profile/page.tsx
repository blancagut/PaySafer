import { User, Mail, CheckCircle2, Calendar, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getProfile } from "@/lib/actions/profile"
import { getTransactionStats } from "@/lib/actions/transactions"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [profileResult, statsResult] = await Promise.all([
    getProfile(),
    getTransactionStats(),
  ])

  const profile = profileResult.data
  const stats = statsResult.data

  const fullName = profile?.full_name || user.email?.split("@")[0] || "User"
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const memberSince = user.created_at ? new Date(user.created_at) : new Date()
  const totalTxn = stats?.total ?? 0
  const completedTxn = stats?.completed ?? 0
  const successRate = totalTxn > 0 ? Math.round((completedTxn / totalTxn) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Profile</h2>
        <p className="text-muted-foreground mt-1">Your account information</p>
      </div>

      {/* Profile card */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-foreground">{fullName}</h3>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                </Badge>
              </div>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Member since {memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/settings">Edit Settings</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-foreground">{totalTxn}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Transactions</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{completedTxn}</p>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-foreground">{successRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Account details */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Account Details</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium text-foreground">{fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Verified Account</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="font-medium text-foreground">
                {memberSince.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Account Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Password</p>
                <p className="text-sm text-muted-foreground">Change your password in settings</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="/settings">Change Password</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

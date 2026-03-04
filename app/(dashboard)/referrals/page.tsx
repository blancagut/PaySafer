"use client"

import { useState } from "react"
import {
  UserPlus,
  Copy,
  Gift,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  Share2,
  Mail,
  MessageCircle,
  Link2,
  Trophy,
  ArrowRight,
  Loader2,
  Star,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
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


import { getReferralData, sendReferralInvite } from '@/lib/actions/referrals';
import { useEffect } from 'react';

const statusConfig: Record<string, { label: string; badge: "emerald" | "blue" | "amber" | "purple" }> = {
  pending: { label: "Invited", badge: "amber" },
  signed_up: { label: "Signed Up", badge: "blue" },
  verified: { label: "Verified", badge: "purple" },
  rewarded: { label: "Rewarded", badge: "emerald" },
}

const milestones = [
  { count: 5, reward: "$25 bonus", reached: false },
  { count: 10, reward: "$75 bonus", reached: false },
  { count: 25, reward: "$200 bonus + Gold upgrade", reached: false },
  { count: 50, reward: "$500 bonus + Platinum upgrade", reached: false },
]


export default function ReferralsPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getReferralData();
      if (result.error) {
        toast.error(result.error);
      } else {
        setReferralData(result.data);
      }
      setLoading(false);
    })();
  }, []);

  const handleCopyCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode);
      toast.success("Referral code copied!");
    }
  };

  const handleCopyLink = () => {
    if (referralData?.referralCode) {
      const link = `https://paysafer.app/r/${referralData.referralCode}`;
      navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    const result = await sendReferralInvite(inviteEmail);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInviteDialog(false);
      // Refresh referral data
      setLoading(true);
      const refreshed = await getReferralData();
      if (!refreshed.error) setReferralData(refreshed.data);
      setLoading(false);
    }
    setSending(false);
  };

  const handleShare = (method: string) => {
    toast.success(`Sharing via ${method}...`, {
      description: "Opening share dialog",
    });
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="text-center mb-5">
        <Gift className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-foreground">Your Referral Code</h3>
        <p className="text-xs text-muted-foreground mt-1">Share your code — when they sign up & verify, you both get $10</p>
      </div>

      {/* Code */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-6 py-3 font-mono text-lg tracking-wider text-foreground">
          {referralData?.referralCode ?? '—'}
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyCode}>
          <Copy className="w-4 h-4" />
        </Button>
      </div>

      {/* Link */}
      <div className="flex items-center gap-2 mb-5 px-4">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
          {referralData?.referralCode ? `https://paysafer.app/r/${referralData.referralCode}` : '—'}
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Link2 className="w-3.5 h-3.5 mr-1" />
          Copy
        </Button>
      </div>

      {/* Share buttons */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={() => handleShare("WhatsApp") } className="text-xs">
          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
          WhatsApp
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleShare("Email") } className="text-xs">
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          Email
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleShare("Copy Link") } className="text-xs">
          <Link2 className="w-3.5 h-3.5 mr-1.5" />
          Copy Link
        </Button>
      </div>

      {/* Referrals List */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <GlassCard padding="lg">
          <div className="mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Your Referrals</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal px-2 py-1">Email</th>
                  <th className="text-left font-normal px-2 py-1">Status</th>
                  <th className="text-left font-normal px-2 py-1">Reward</th>
                  <th className="text-left font-normal px-2 py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {(!referralData?.referrals || referralData.referrals.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground py-6">No referrals yet</td>
                  </tr>
                ) : (
                  referralData.referrals.map((r: any) => (
                    <tr key={r.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-2 py-2">
                        <span className="font-medium text-foreground">{r.invited_email}</span>
                      </td>
                      <td className="px-2 py-2">
                        <GlassBadge variant={statusConfig[r.status]?.badge || 'blue'}>{statusConfig[r.status]?.label || r.status}</GlassBadge>
                      </td>
                      <td className="px-2 py-2">
                        {r.reward_amount > 0 ? (
                          <span className="text-emerald-400 font-mono">${r.reward_amount}</span>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="glass-card border-white/[0.10] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Invite a Friend</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Enter their email address to send an invite</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@email.com"
              className="w-full h-11 rounded-lg bg-white/[0.04] border border-white/[0.10] px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowInviteDialog(false)} className="text-muted-foreground">Cancel</Button>
            <Button onClick={handleSendInvite} disabled={sending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Mail className="w-4 h-4 mr-1.5" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

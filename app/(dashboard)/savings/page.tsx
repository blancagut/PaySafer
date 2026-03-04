// ...existing code...
"use client";
import React, { useState, useEffect } from "react";
import { getSavingsGoals, createSavingsGoal, addFundsToGoal, toggleGoalPause, deleteSavingsGoal, SavingsGoal } from "@/lib/actions/savings";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Loader2, ArrowUpRight, Play, Pause, Trash2, Sparkles } from "lucide-react";
import cn from "classnames";

// Dummy icons for goal selection (replace with your actual icons)
const goalIcons = [
  { id: 1, label: "Star", icon: Sparkles, color: "text-yellow-400" },
  { id: 2, label: "Trophy", icon: Plus, color: "text-emerald-400" },
];

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddFundsDialog, setShowAddFundsDialog] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [newGoal, setNewGoal] = useState({ name: "", iconId: 1, target: "", deadline: "", autoSave: "" });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const result = await getSavingsGoals();
      setGoals(result.data || []);
    })();
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const params = {
        name: newGoal.name,
        icon_id: String(newGoal.iconId),
        target_amount: Number(newGoal.target),
        deadline: newGoal.deadline || undefined,
        auto_save_amount: newGoal.autoSave ? Number(newGoal.autoSave) : undefined,
        currency: 'USD',
      };
      const result = await createSavingsGoal(params);
      if (result.error) throw new Error(result.error);
      toast({ title: "Goal created!" });
      setShowCreateDialog(false);
      setNewGoal({ name: "", iconId: 1, target: "", deadline: "", autoSave: "" });
      const refresh = await getSavingsGoals();
      setGoals(refresh.data || []);
    } catch (e: any) {
      toast({ title: "Error creating goal", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleAddFunds = async (goalId: string) => {
    setLoading(true);
    try {
      const result = await addFundsToGoal(goalId, Number(addAmount));
      if (result.error) throw new Error(result.error);
      toast({ title: "Funds added!" });
      setShowAddFundsDialog(null);
      setAddAmount("");
      const refresh = await getSavingsGoals();
      setGoals(refresh.data || []);
    } catch (e: any) {
      toast({ title: "Error adding funds", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleTogglePause = async (goalId: string) => {
    setLoading(true);
    try {
      const result = await toggleGoalPause(goalId);
      if (result.error) throw new Error(result.error);
      toast({ title: "Goal updated!" });
      const refresh = await getSavingsGoals();
      setGoals(refresh.data || []);
    } catch (e: any) {
      toast({ title: "Error updating goal", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDelete = async (goalId: string) => {
    setLoading(true);
    try {
      const result = await deleteSavingsGoal(goalId);
      if (result.error) throw new Error(result.error);
      toast({ title: "Goal deleted!" });
      setShowDeleteDialog(null);
      const refresh = await getSavingsGoals();
      setGoals(refresh.data || []);
    } catch (e: any) {
      toast({ title: "Error deleting goal", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Savings Goals</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Goal
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 col-span-full">No savings goals yet. Create your first goal!</div>
        ) : (
          goals.map((goal) => {
            const isComplete = goal.current_amount >= goal.target_amount;
            return (
              <GlassCard key={goal.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">{goal.name}</div>
                  {goal.is_paused && <GlassBadge variant="amber">Paused</GlassBadge>}
                </div>
                <div className="text-2xl font-bold">${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Target by {goal.deadline ? format(new Date(goal.deadline), "MMM d, yyyy") : "N/A"}</div>
                {goal.auto_save_amount && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Auto-saving ${goal.auto_save_amount}/month
                  </div>
                )}
                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                  {!isComplete && (
                    <Button
                      size="sm"
                      onClick={() => setShowAddFundsDialog(goal.id)}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs flex-1"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                      Add Funds
                    </Button>
                  )}
                  {goal.auto_save_amount && !isComplete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePause(goal.id)}
                      className="text-xs text-muted-foreground"
                    >
                      {goal.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteDialog(goal.id)}
                    className="text-xs text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Create Goal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Savings Goal</DialogTitle>
            <DialogDescription>Set a target and start saving automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Goal Name</label>
              <input
                type="text"
                placeholder="e.g., Summer Trip"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {goalIcons.map((gi) => (
                  <button
                    key={gi.id}
                    onClick={() => setNewGoal({ ...newGoal, iconId: gi.id })}
                    className={cn(
                      "w-full aspect-square rounded-lg border flex items-center justify-center transition-colors",
                      newGoal.iconId === gi.id
                        ? "border-primary bg-primary/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]"
                    )}
                    title={gi.label}
                  >
                    <gi.icon className={cn("w-5 h-5", gi.color)} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Target Amount ($)</label>
                <input
                  type="number"
                  placeholder="5,000"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Target Date</label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Monthly Auto-Save ($) <span className="text-muted-foreground/60">— optional</span>
              </label>
              <input
                type="number"
                placeholder="100"
                value={newGoal.autoSave}
                onChange={(e) => setNewGoal({ ...newGoal, autoSave: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={!!showAddFundsDialog} onOpenChange={() => setShowAddFundsDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Funds</DialogTitle>
            <DialogDescription>Transfer from your wallet to this savings goal.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFundsDialog(null)}>Cancel</Button>
            <Button
              onClick={() => showAddFundsDialog && handleAddFunds(showAddFundsDialog)}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Add Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Goal</DialogTitle>
            <DialogDescription>
              This will delete the savings goal and return all saved funds to your main wallet. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
            <Button
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              disabled={loading}
              variant="destructive"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Delete & Return Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ...existing code...

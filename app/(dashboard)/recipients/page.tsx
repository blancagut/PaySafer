"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Plus,
  Search,
  Star,
  Trash2,
  Copy,
  User,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
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
import {
  getContacts,
  searchUsers,
  addContact,
  removeContact,
  toggleFavoriteContact,
  type Contact,
  type UserSearchResult,
} from "@/lib/actions/contacts"

// ─── Types ───

interface RecipientDisplay {
  id: string
  contactId: string
  name: string
  email: string
  username: string | null
  avatar: string | null
  isFavorite: boolean
  nickname: string | null
}

export default function RecipientsPage() {
  // State
  const [recipients, setRecipients] = useState<RecipientDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [filter, setFilter] = useState<"all" | "favorite">("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Load contacts on mount
  useEffect(() => {
    loadContacts()
  }, [])

  // Search debounce
  useEffect(() => {
    if (!addDialogOpen) return
    if (search.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, addDialogOpen])

  const loadContacts = async () => {
    setLoading(true)
    const result = await getContacts()
    if (result.error) {
      toast.error(result.error)
    } else {
      const mapped = (result.data || []).map((c: Contact) => ({
        id: c.id,
        contactId: c.contact_id,
        name: c.profile?.full_name || c.profile?.username || c.profile?.email || "Unknown",
        email: c.profile?.email || "",
        username: c.profile?.username || null,
        avatar: c.profile?.avatar_url || null,
        isFavorite: c.is_favorite,
        nickname: c.nickname,
      }))
      setRecipients(mapped)
    }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (search.length < 2) return
    setSearchLoading(true)
    const result = await searchUsers(search)
    if (result.error) {
      toast.error(result.error)
    } else {
      setSearchResults(result.data || [])
    }
    setSearchLoading(false)
  }

  const filtered = recipients.filter((r) => {
    if (filter === "favorite" && !r.isFavorite) return false
    return true
  })

  const handleToggleFavorite = async (contactId: string) => {
    const result = await toggleFavoriteContact(contactId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setRecipients((prev) =>
        prev.map((r) => (r.contactId === contactId ? { ...r, isFavorite: !r.isFavorite } : r))
      )
      toast.success("Updated favorite status")
    }
  }

  const confirmRemove = (contactId: string) => {
    setPendingRemoveId(contactId)
    setRemoveDialogOpen(true)
  }

  const handleRemove = async () => {
    if (!pendingRemoveId) return
    const result = await removeContact(pendingRemoveId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setRecipients((prev) => prev.filter((r) => r.contactId !== pendingRemoveId))
      toast.success("Recipient removed")
    }
    setRemoveDialogOpen(false)
    setPendingRemoveId(null)
  }

  const handleAddContact = async (userId: string, nickname?: string) => {
    setAddSubmitting(true)
    const result = await addContact(userId, nickname)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Contact added")
      setAddDialogOpen(false)
      setSearch("")
      setSearchResults([])
      await loadContacts()
    }
    setAddSubmitting(false)
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recipients</h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Manage saved contacts for faster transfers
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="animate-fade-in flex items-center gap-3" style={{ animationDelay: "100ms" }}>
        <div className="flex gap-1">
          {(["all", "favorite"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-white/[0.04]"
              )}
            >
              {f === "all" ? "All" : "⭐ Favorites"}
            </button>
          ))}
        </div>
      </div>

      {/* Recipients List */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        {loading ? (
          <GlassCard padding="lg" className="text-center">
            <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading contacts...</p>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard padding="lg" className="text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {filter === "favorite" ? "No favorites yet" : "No contacts yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filter === "favorite"
                ? "Star contacts to mark them as favorites"
                : "Add your first contact to send money faster"}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <GlassCard key={r.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-sm font-medium text-muted-foreground overflow-hidden">
                    {r.avatar ? (
                      <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      r.name
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                      {r.nickname && (
                        <span className="text-xs text-muted-foreground">({r.nickname})</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {r.username ? `@${r.username}` : r.email}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(r.contactId)}
                      className="text-xs"
                      title={r.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star
                        className={cn(
                          "w-3.5 h-3.5",
                          r.isFavorite ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(r.username ? `@${r.username}` : r.email)
                        toast.success("Identifier copied")
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      title="Copy identifier"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmRemove(r.contactId)}
                      className="text-xs text-muted-foreground hover:text-red-400"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add Contact</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Search for PaySafer users to add to your contacts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                Search by username, email, or name
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Start typing to search..."
                  className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                {searchLoading && (
                  <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {searchResults.length === 0 && search.length >= 2 && !searchLoading && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No users found</p>
                </div>
              )}
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAddContact(user.id)}
                  disabled={addSubmitting}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors disabled:opacity-50 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name || ""} className="w-full h-full object-cover" />
                    ) : (
                      (user.full_name || user.email)
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {user.full_name || user.username || user.email}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.username ? `@${user.username}` : user.email}
                    </div>
                  </div>
                  {addSubmitting && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setAddDialogOpen(false)
                setSearch("")
                setSearchResults([])
              }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <DialogTitle className="text-center">Remove Recipient?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              This will remove them from your saved recipients. You can always add them back later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRemoveDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

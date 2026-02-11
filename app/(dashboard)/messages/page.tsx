"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  MessageCircle,
  Search,
  Plus,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getConversations, type ConversationWithDetails } from "@/lib/actions/direct-messages"
import { searchUsers, type UserSearchResult } from "@/lib/actions/contacts"
import { getOrCreateConversation } from "@/lib/actions/direct-messages"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function getMessagePreview(msg: ConversationWithDetails["last_message"]) {
  if (!msg) return "No messages yet"
  switch (msg.message_type) {
    case "payment_sent":
      return `💸 Sent ${msg.currency} ${Number(msg.amount).toFixed(2)}`
    case "payment_request":
      return `🔔 Requested ${msg.currency} ${Number(msg.amount).toFixed(2)}`
    case "payment_accepted":
      return `✅ Paid ${msg.currency} ${Number(msg.amount).toFixed(2)}`
    case "payment_declined":
      return `❌ Declined request`
    default:
      return msg.message.length > 40 ? msg.message.slice(0, 40) + "…" : msg.message
  }
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    const res = await getConversations()
    if (res.data) setConversations(res.data)
    setLoading(false)
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const res = await searchUsers(q.trim())
    if (res.data) setSearchResults(res.data)
    setSearching(false)
  }

  async function startChat(userId: string) {
    setStarting(true)
    const res = await getOrCreateConversation(userId)
    setStarting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    router.push(`/messages/${res.data!.conversationId}`)
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Messages</h2>
          <p className="text-sm text-muted-foreground">Chat, send &amp; request money</p>
        </div>
        <Button
          onClick={() => setShowNewChat(!showNewChat)}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* New Chat Search */}
      {showNewChat && (
        <GlassCard className="mb-4 animate-fade-in-up">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by $username, email, or name..."
              className="pl-10 bg-white/[0.04] border-white/[0.10]"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="divide-y divide-white/[0.06]">
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => startChat(u.id)}
                  disabled={starting}
                  className="flex items-center gap-3 w-full p-2.5 hover:bg-white/[0.04] transition-colors rounded-lg text-left"
                >
                  <Avatar className="w-9 h-9 border border-white/[0.06]">
                    <AvatarFallback className="bg-white/[0.06] text-foreground text-xs">
                      {getInitials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.username ? `$${u.username}` : u.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">No users found</p>
          )}
        </GlassCard>
      )}

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <GlassCard className="text-center py-12 animate-fade-in-up">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold text-foreground">No conversations yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start a chat to send or request money</p>
          <Button onClick={() => setShowNewChat(true)} className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" />
            Start a Chat
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-1 animate-fade-in-up">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/messages/${c.id}`)}
              className="flex items-center gap-3 w-full p-3 hover:bg-white/[0.04] transition-colors rounded-xl text-left"
            >
              <Avatar className="w-12 h-12 border border-white/[0.06]">
                <AvatarFallback className="bg-white/[0.06] text-foreground">
                  {getInitials(c.other_user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {c.other_user.full_name || c.other_user.email}
                  </p>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                    {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {c.other_user.username && (
                    <span className="text-primary/70 mr-1">${c.other_user.username}</span>
                  )}
                  {getMessagePreview(c.last_message)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

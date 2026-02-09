"use client"

import { useState } from "react"
import {
  HelpCircle,
  MessageSquare,
  Mail,
  ExternalLink,
  Search,
  BookOpen,
  Shield,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Zap,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { GlassCard } from "@/components/glass"
import { cn } from "@/lib/utils"
import { SupportChatWidget } from "@/components/support-chat-widget"

// ─── FAQ Data (categorized) ───

const faqCategories = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Zap,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "payments",
    label: "Payments & Fees",
    icon: CreditCard,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "disputes",
    label: "Disputes",
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "security",
    label: "Security & Trust",
    icon: Shield,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
]

const faqs = [
  {
    category: "getting-started",
    question: "What is escrow?",
    answer:
      "Escrow is a financial arrangement where a third party (PaySafer) holds and regulates the payment of funds required for two parties involved in a transaction. The funds are held by us until we receive appropriate instructions or until predetermined contractual obligations have been fulfilled. This protects both buyers and sellers from fraud.",
  },
  {
    category: "getting-started",
    question: "How does PaySafer work?",
    answer:
      "PaySafer works in 5 simple steps: 1) A seller creates an offer with price and terms, 2) The buyer accepts and pays — funds are held securely, 3) The seller delivers the goods or service, 4) The buyer confirms delivery, and 5) Funds are released to the seller. Both parties are protected throughout the entire process.",
  },
  {
    category: "getting-started",
    question: "How long does a transaction take?",
    answer:
      "The timeline depends entirely on the agreement between buyer and seller. Once the seller marks the item as delivered and the buyer confirms receipt, funds are released immediately. We recommend setting clear expectations about delivery timelines when creating a transaction.",
  },
  {
    category: "payments",
    question: "When does the seller get paid?",
    answer:
      "The seller receives payment only after the buyer confirms they have received the goods or services as described. Once the buyer clicks 'Confirm Delivery', the funds are released to the seller immediately. This ensures the seller is protected from payment issues while the buyer is protected from non-delivery.",
  },
  {
    category: "payments",
    question: "How is Stripe used?",
    answer:
      "Stripe is our payment processor. When you make a payment, Stripe securely processes your credit card or bank information. We never see or store your full payment details. Stripe is PCI-compliant and used by millions of businesses worldwide including companies like Amazon, Google, and Shopify.",
  },
  {
    category: "payments",
    question: "What fees do you charge?",
    answer:
      "We charge a small percentage fee on each transaction to cover operational costs and Stripe processing fees. The exact fee is displayed before you confirm any transaction. There are no hidden fees, monthly charges, or account maintenance costs.",
  },
  {
    category: "payments",
    question: "What currencies do you support?",
    answer:
      "We currently support major currencies including USD, EUR, GBP, CAD, and AUD. The currency is set when creating a transaction and cannot be changed afterwards. Both parties see the amount in the selected currency.",
  },
  {
    category: "payments",
    question: "Can I cancel a transaction?",
    answer:
      "Transactions can be cancelled before payment is made. Once funds are in escrow, cancellation requires agreement from both parties or resolution through our dispute process. If both parties agree to cancel, funds are returned to the buyer minus any applicable fees.",
  },
  {
    category: "disputes",
    question: "What happens in a dispute?",
    answer:
      "If there's a disagreement between the buyer and seller, either party can open a dispute. Our team will review the case, examine any evidence provided, and make a fair decision based on the transaction terms. Both parties have equal opportunity to present their case. Resolution typically takes 5-10 business days.",
  },
  {
    category: "disputes",
    question: "How do I open a dispute?",
    answer:
      "To open a dispute, navigate to the transaction in question from your Transactions page and click the 'Open Dispute' button. You'll need to provide a reason and detailed description. You can also upload evidence like screenshots, receipts, or communication logs to support your case.",
  },
  {
    category: "security",
    question: "Is PaySafer a bank?",
    answer:
      "No, PaySafer is not a bank, financial institution, or money services business. We are an escrow facilitation platform. We do not store balances, offer loans, provide interest-bearing accounts, or perform any banking services. All payments are processed securely through Stripe, a licensed payment processor.",
  },
  {
    category: "security",
    question: "How is my data protected?",
    answer:
      "We use bank-level encryption (AES-256) for all data at rest and TLS 1.3 for data in transit. Your payment details are handled exclusively by Stripe and never touch our servers. We implement Row Level Security (RLS) in our database, ensuring users can only access their own data.",
  },
  {
    category: "security",
    question: "How do I contact support?",
    answer:
      "You can reach us through the live chat widget on this page (click 'Chat with us'), or email us at support@paysafer.me. We typically respond within minutes during business hours and within 24 hours otherwise. For urgent disputes, reference your transaction ID for faster handling.",
  },
]

// ─── Help Topics Grid ───

const helpTopics = [
  {
    title: "Creating Transactions",
    description: "Learn how to set up escrow transactions",
    icon: FileText,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    title: "Managing Disputes",
    description: "How to resolve transaction disagreements",
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  {
    title: "Payments & Payouts",
    description: "Understanding payment flow and withdrawals",
    icon: CreditCard,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    title: "Account Security",
    description: "Keeping your account safe and secure",
    icon: Shield,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    title: "Offers & Services",
    description: "Creating and managing service offers",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
  },
  {
    title: "Getting Started",
    description: "Quick tour of the PaySafer platform",
    icon: BookOpen,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !activeCategory || faq.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-teal-500/[0.04] p-8 md:p-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-emerald-400 mb-3">
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Help Center</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            How can we help you?
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-xl">
            Search our knowledge base or browse topics below. Need personal assistance? Start a live chat.
          </p>

          {/* Search */}
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
            <Input
              placeholder="Search for help articles, FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-white/[0.06] border-white/[0.10] rounded-xl focus:border-emerald-500/40 focus:ring-emerald-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard variant="hover" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{"< 2 min"}</p>
              <p className="text-xs text-muted-foreground">Avg. response time</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="hover" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">98%</p>
              <p className="text-xs text-muted-foreground">Resolution rate</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="hover" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">24/7</p>
              <p className="text-xs text-muted-foreground">Chat support</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Help Topics Grid */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Browse Topics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {helpTopics.map((topic) => (
            <GlassCard
              key={topic.title}
              variant="hover"
              padding="md"
              className="cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", topic.bgColor)}>
                  <topic.icon className={cn("w-5 h-5", topic.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {topic.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-0.5" />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard variant="glow" glowColor="emerald" padding="lg" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.06] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-lg">Live Chat Support</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Chat with our team in real-time. We typically reply within minutes.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Agents online now</span>
              </div>
              <Button
                className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                onClick={() => {
                  // Trigger the chat widget by dispatching a custom event
                  document.dispatchEvent(new CustomEvent("open-support-chat"))
                }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat with us
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="hover" padding="lg" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.06] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-lg">Email Support</h3>
              <p className="text-sm text-muted-foreground mt-1">
                For detailed inquiries or account issues. We respond within 24 hours.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">24h response time</span>
              </div>
              <Button variant="outline" className="mt-4 border-white/[0.10] hover:bg-white/[0.06]">
                <Mail className="w-4 h-4 mr-2" />
                support@paysafer.me
                <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* FAQ Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? `${filteredFaqs.length} result${filteredFaqs.length !== 1 ? "s" : ""} for "${searchQuery}"`
                : "Quick answers to common questions"}
            </p>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-all",
              !activeCategory
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            )}
          >
            All
          </button>
          {faqCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5",
                activeCategory === cat.id
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
              )}
            >
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </button>
          ))}
        </div>

        <GlassCard padding="none">
          {filteredFaqs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-white/[0.06] px-6"
                >
                  <AccordionTrigger className="text-left text-foreground hover:no-underline py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          faq.category === "getting-started" && "bg-emerald-400",
                          faq.category === "payments" && "bg-blue-400",
                          faq.category === "disputes" && "bg-amber-400",
                          faq.category === "security" && "bg-purple-400"
                        )}
                      />
                      {faq.question}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-sm pb-4 pl-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="p-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No results found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search or browse topics above</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Still need help? CTA */}
      <GlassCard
        variant="glow"
        glowColor="emerald"
        padding="lg"
        className="text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-teal-500/[0.04]" />
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-foreground text-lg">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {"Can't find what you're looking for? Our support team is ready to help you with any question."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Button
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
              onClick={() => document.dispatchEvent(new CustomEvent("open-support-chat"))}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat with us
            </Button>
            <Button variant="outline" className="border-white/[0.10] hover:bg-white/[0.06]">
              <Mail className="w-4 h-4 mr-2" />
              Email us
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Chat Widget (floating) */}
      <SupportChatWidget />
    </div>
  )
}

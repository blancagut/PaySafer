"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Cookie, ArrowLeft, Shield, Settings, BarChart3, Users } from "lucide-react"

const sections = [
  {
    id: "what",
    title: "1. What Are Cookies?",
    content: `Cookies are small text files placed on your device when you visit our website or use our app. They help us recognize your device, remember your preferences, and improve your experience. Cookies may be set by PaySafer ("first-party cookies") or by third-party services we use ("third-party cookies").`,
  },
  {
    id: "types",
    title: "2. Types of Cookies We Use",
    subsections: [
      {
        icon: Shield,
        name: "Essential Cookies",
        description:
          "Required for basic functionality, security, and fraud prevention. These cannot be disabled. They include session tokens, CSRF protection, authentication state, and rate-limiting identifiers.",
        canDisable: false,
      },
      {
        icon: Settings,
        name: "Functional Cookies",
        description:
          "Remember your preferences such as language, currency, theme (dark/light), and notification settings. Disabling these means you may need to re-enter preferences each visit.",
        canDisable: true,
      },
      {
        icon: BarChart3,
        name: "Analytics Cookies",
        description:
          "Help us understand how you use PaySafer so we can improve our services. We use privacy-friendly analytics (no cross-site tracking). Data is aggregated and anonymized.",
        canDisable: true,
      },
      {
        icon: Users,
        name: "Third-Party Cookies",
        description:
          "Set by services we integrate with, such as Stripe (payment processing), Supabase (authentication), and Plaid (bank linking). These are necessary for those specific features to function.",
        canDisable: false,
      },
    ],
  },
  {
    id: "legal",
    title: "3. Legal Basis",
    content: `We use cookies based on the following legal grounds:
    
• **Essential cookies**: Legitimate interest — necessary for the service to operate securely.
• **Functional cookies**: Your consent, which you can withdraw at any time.
• **Analytics cookies**: Your consent under GDPR (EU/EEA), ePrivacy Directive, and CCPA (California).
• **Third-party cookies**: Legitimate interest for payment processing and security; consent for all others.

PaySafer complies with the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), the UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection, and other applicable privacy laws.`,
  },
  {
    id: "manage",
    title: "4. Managing Your Cookie Preferences",
    content: `You can manage your cookie preferences at any time:

• **In-app**: Go to Settings → Privacy → Cookie Preferences to toggle functional and analytics cookies.
• **Browser settings**: Most browsers allow you to block or delete cookies. Note that blocking essential cookies may prevent PaySafer from working correctly.
• **Do Not Track**: We honor DNT browser signals. When detected, only essential cookies are set.
• **Opt-out links**: For analytics, you can opt out via your account Settings page.

Changes to your cookie preferences take effect immediately. Previously collected data under prior consent remains lawfully processed.`,
  },
  {
    id: "retention",
    title: "5. Cookie Retention Periods",
    content: `• **Session cookies**: Deleted when you close your browser.
• **Authentication tokens**: Up to 30 days (refreshed on activity).
• **Preference cookies**: Up to 12 months.
• **Analytics cookies**: Up to 26 months (anonymized after 14 months).
• **Security cookies** (rate-limit, CSRF): 24 hours maximum.`,
  },
  {
    id: "thirdparty",
    title: "6. Third-Party Services",
    content: `PaySafer integrates with the following services that may set cookies:

• **Stripe** — Payment processing and fraud detection. [Privacy Policy](https://stripe.com/privacy)
• **Supabase** — Authentication and data storage. [Privacy Policy](https://supabase.com/privacy)
• **Plaid** — Bank account linking. [Privacy Policy](https://plaid.com/legal/#consumers)
• **Vercel** — Hosting and performance optimization. [Privacy Policy](https://vercel.com/legal/privacy-policy)

We do not sell your personal data to any third party. These services process data solely to provide their respective functionality.`,
  },
  {
    id: "children",
    title: "7. Children's Privacy",
    content: `PaySafer does not knowingly collect data from children under 18. Our services require users to be at least 18 years old. We do not set tracking or analytics cookies for users who have not verified their age.`,
  },
  {
    id: "changes",
    title: "8. Changes to This Policy",
    content: `We may update this Cookie Policy from time to time. Material changes will be communicated via in-app notification at least 30 days before taking effect. The "Last Updated" date at the top of this page reflects the most recent revision.`,
  },
  {
    id: "contact",
    title: "9. Contact Us",
    content: `If you have questions about our cookie practices:

• **Email**: privacy@paysafer.app
• **In-app**: Settings → Help → Privacy Inquiry
• **Data Protection Officer**: dpo@paysafer.app

For EU residents, you have the right to lodge a complaint with your local data protection authority.
For UAE residents, you may contact the UAE Data Office.`,
  },
]

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1A] via-[#0A0F1A] to-[#0F1B2D]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0F1B2D]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        {/* Title */}
        <div className="animate-fade-in mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Cookie className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Cookie Policy
              </h1>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
          <p className="text-muted-foreground font-light leading-relaxed mt-4">
            This policy explains how PaySafer uses cookies and similar technologies on our website
            and mobile application to provide, secure, and improve our services.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="animate-fade-in mb-10" style={{ animationDelay: "100ms" }}>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-5">
            <span className="text-xs text-muted-foreground tracking-wide uppercase font-medium block mb-3">
              Contents
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-sm text-white/70 hover:text-emerald-400 transition-colors py-1"
                >
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${150 + i * 50}ms` }}
            >
              <h2 className="text-lg font-semibold tracking-tight text-white mb-3">
                {section.title}
              </h2>

              {section.content && (
                <div className="text-sm text-muted-foreground font-light leading-relaxed whitespace-pre-line prose-strong:text-white/80 prose-strong:font-medium">
                  {section.content.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return (
                        <strong key={j} className="text-white/80 font-medium">
                          {part.slice(2, -2)}
                        </strong>
                      )
                    }
                    // Handle markdown links
                    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
                    const parts: React.ReactNode[] = []
                    let lastIndex = 0
                    let match
                    while ((match = linkRegex.exec(part)) !== null) {
                      if (match.index > lastIndex) {
                        parts.push(part.slice(lastIndex, match.index))
                      }
                      parts.push(
                        <a
                          key={`link-${j}-${match.index}`}
                          href={match[2]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          {match[1]}
                        </a>
                      )
                      lastIndex = match.index + match[0].length
                    }
                    if (parts.length > 0) {
                      if (lastIndex < part.length) {
                        parts.push(part.slice(lastIndex))
                      }
                      return <span key={j}>{parts}</span>
                    }
                    return <span key={j}>{part}</span>
                  })}
                </div>
              )}

              {section.subsections && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {section.subsections.map((sub) => (
                    <div
                      key={sub.name}
                      className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <sub.icon className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-white">{sub.name}</span>
                        {!sub.canDisable && (
                          <span className="text-[10px] bg-white/[0.06] text-muted-foreground px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">
                        {sub.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/fees" className="hover:text-white transition-colors">Fees & Limits</Link>
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
        </div>
      </main>
    </div>
  )
}

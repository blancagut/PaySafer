"use client"

import { useState } from "react"
import { Highlight, themes } from "prism-react-renderer"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────
   CodeBlock — syntax-highlighted code with copy
   ───────────────────────────────────────────── */

interface CodeBlockProps {
  code: string
  language: string
  title?: string
  showLineNumbers?: boolean
  className?: string
}

export function CodeBlock({
  code,
  language,
  title,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Map friendly names → Prism language keys
  const langMap: Record<string, string> = {
    curl: "bash",
    sh: "bash",
    shell: "bash",
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    yml: "yaml",
  }
  const prismLang = langMap[language.toLowerCase()] ?? language.toLowerCase()

  return (
    <div className={cn("rounded-xl overflow-hidden border border-white/[0.08] bg-[#0A0F1A]", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {/* Traffic-light dots */}
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </span>
          {title && (
            <span className="text-[11px] text-muted-foreground font-medium ml-2 tracking-wide uppercase">
              {title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50 font-mono uppercase">
            {language}
          </span>
          <button
            onClick={handleCopy}
            className="p-1 rounded-md hover:bg-white/[0.06] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <Highlight
        theme={themes.nightOwl}
        code={code.trim()}
        language={prismLang}
      >
        {({ className: hlClass, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(hlClass, "overflow-x-auto p-4 text-[13px] leading-6 font-mono")}
            style={{ ...style, background: "transparent", margin: 0 }}
          >
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line, key: i })
              return (
                <div key={i} {...lineProps} className={cn(lineProps.className, "table-row")}>
                  {showLineNumbers && (
                    <span className="table-cell pr-4 text-right text-muted-foreground/25 select-none w-8">
                      {i + 1}
                    </span>
                  )}
                  <span className="table-cell">
                    {line.map((token, j) => (
                      <span key={j} {...getTokenProps({ token, key: j })} />
                    ))}
                  </span>
                </div>
              )
            })}
          </pre>
        )}
      </Highlight>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LanguageTabs — toggle between code samples
   ───────────────────────────────────────────── */

interface LanguageTabsProps {
  tabs: { label: string; language: string; code: string }[]
  title?: string
  showLineNumbers?: boolean
}

export function LanguageTabs({ tabs, title, showLineNumbers }: LanguageTabsProps) {
  const [active, setActive] = useState(0)

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0A0F1A]">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-white/[0.06] bg-white/[0.02] px-2">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              "px-3 py-2 text-[11px] font-medium tracking-wide uppercase transition-colors border-b-2 -mb-px",
              active === i
                ? "text-emerald-400 border-emerald-400"
                : "text-muted-foreground/50 border-transparent hover:text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
        {title && (
          <span className="ml-auto text-[10px] text-muted-foreground/40 font-medium tracking-wide pr-2">
            {title}
          </span>
        )}
      </div>

      {/* Active code */}
      <CodeBlockInner
        code={tabs[active].code}
        language={tabs[active].language}
        showLineNumbers={showLineNumbers}
      />
    </div>
  )
}

/* Inner renderer used by LanguageTabs (no outer border) */
function CodeBlockInner({
  code,
  language,
  showLineNumbers = false,
}: {
  code: string
  language: string
  showLineNumbers?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const langMap: Record<string, string> = {
    curl: "bash", sh: "bash", shell: "bash",
    js: "javascript", ts: "typescript", py: "python",
  }
  const prismLang = langMap[language.toLowerCase()] ?? language.toLowerCase()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground/40 hover:text-muted-foreground transition-colors z-10"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <Highlight theme={themes.nightOwl} code={code.trim()} language={prismLang}>
        {({ className: hlClass, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(hlClass, "overflow-x-auto p-4 text-[13px] leading-6 font-mono")}
            style={{ ...style, background: "transparent", margin: 0 }}
          >
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line, key: i })
              return (
                <div key={i} {...lineProps} className={cn(lineProps.className, "table-row")}>
                  {showLineNumbers && (
                    <span className="table-cell pr-4 text-right text-muted-foreground/25 select-none w-8">
                      {i + 1}
                    </span>
                  )}
                  <span className="table-cell">
                    {line.map((token, j) => (
                      <span key={j} {...getTokenProps({ token, key: j })} />
                    ))}
                  </span>
                </div>
              )
            })}
          </pre>
        )}
      </Highlight>
    </div>
  )
}

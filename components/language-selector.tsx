"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Globe, Check, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  UI_LANGUAGES,
  type LangCode,
  getSavedLanguage,
  saveLanguage,
  translateUITexts,
  clearTranslationCache,
} from "@/lib/ai/translate-ui"

// ─── Collect all visible text nodes under an element ─────────────────────────

function getTextNodes(root: HTMLElement): { node: Text; original: string }[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.trim()
      if (!text || text.length < 2) return NodeFilter.FILTER_REJECT
      // Skip script/style/code
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      const tag = parent.tagName.toLowerCase()
      if (['script', 'style', 'code', 'pre', 'textarea', 'input'].includes(tag))
        return NodeFilter.FILTER_REJECT
      // Skip if inside the language selector itself
      if (parent.closest('[data-lang-selector]')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const nodes: { node: Text; original: string }[] = []
  let current: Text | null
  while ((current = walker.nextNode() as Text | null)) {
    nodes.push({ node: current, original: current.textContent?.trim() || '' })
  }
  return nodes
}

// ─── Store originals so we can revert ────────────────────────────────────────

const originalTextMap = new WeakMap<Text, string>()

// ─── Language Selector Component ─────────────────────────────────────────────

export function LanguageSelector() {
  const [lang, setLang] = useState<LangCode>('en')
  const [loading, setLoading] = useState(false)
  const translatingRef = useRef(false)

  // Load persisted language on mount (do NOT auto-translate)
  useEffect(() => {
    setLang(getSavedLanguage())
  }, [])

  const currentLang = UI_LANGUAGES.find((l) => l.code === lang)

  const handleLanguageChange = useCallback(async (newLang: LangCode) => {
    if (translatingRef.current) return
    if (newLang === lang) return

    setLang(newLang)
    saveLanguage(newLang)

    // Revert to English first
    if (newLang === 'en') {
      revertToOriginals()
      clearTranslationCache()
      return
    }

    // Translate visible UI
    translatingRef.current = true
    setLoading(true)

    try {
      await translateVisibleUI(newLang)
    } finally {
      setLoading(false)
      translatingRef.current = false
    }
  }, [lang])

  return (
    <div data-lang-selector="">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors text-sm"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{currentLang?.flag}</span>
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 max-h-[320px] overflow-y-auto bg-[hsl(222,47%,8%)] border-white/[0.10] backdrop-blur-xl"
        >
          {UI_LANGUAGES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => handleLanguageChange(l.code)}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1">{l.name}</span>
              {l.code === lang && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── DOM Translation Helpers ─────────────────────────────────────────────────

async function translateVisibleUI(targetLang: LangCode) {
  const root = document.querySelector('main') || document.body
  const textNodes = getTextNodes(root as HTMLElement)

  if (textNodes.length === 0) return

  // Save originals
  for (const { node, original } of textNodes) {
    if (!originalTextMap.has(node)) {
      originalTextMap.set(node, original)
    }
  }

  // Collect unique texts (use originals so re-translating after revert works)
  const textsToTranslate = [
    ...new Set(
      textNodes.map(({ node }) => originalTextMap.get(node) || node.textContent?.trim() || '')
    ),
  ].filter(Boolean)

  // Batch translate (max 50 per call → API enforces this)
  const BATCH = 50
  const allTranslations = new Map<string, string>()

  for (let i = 0; i < textsToTranslate.length; i += BATCH) {
    const batch = textsToTranslate.slice(i, i + BATCH)
    const batchResult = await translateUITexts(batch, targetLang)
    for (const [k, v] of batchResult) allTranslations.set(k, v)
  }

  // Apply to DOM
  for (const { node } of textNodes) {
    const original = originalTextMap.get(node) || node.textContent?.trim() || ''
    const translated = allTranslations.get(original)
    if (translated && translated !== original) {
      node.textContent = translated
    }
  }
}

function revertToOriginals() {
  const root = document.querySelector('main') || document.body
  const textNodes = getTextNodes(root as HTMLElement)

  for (const { node } of textNodes) {
    const original = originalTextMap.get(node)
    if (original) {
      node.textContent = original
    }
  }
}

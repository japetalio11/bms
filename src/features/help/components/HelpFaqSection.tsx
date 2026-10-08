import * as React from "react"
import { useState, useMemo } from "react"
import type { FaqItem } from "../types/helpTypes"
import {
  HelpCircle,
  Search,
  ChevronDown,
  Sparkles,
  Lightbulb,
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface HelpFaqSectionProps {
  faqs: FaqItem[]
}

export function HelpFaqSection({ faqs }: HelpFaqSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [openFaqIds, setOpenFaqIds] = useState<Set<string>>(new Set([faqs[0]?.id]))

  const categories = useMemo(() => {
    const cats = new Set(faqs.map((f) => f.category))
    return ["All", ...Array.from(cats)]
  }, [faqs])

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory
      const q = searchQuery.toLowerCase().trim()
      if (!q) return matchesCategory
      const matchesQuery =
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        (faq.actionTip && faq.actionTip.toLowerCase().includes(q))
      return matchesCategory && matchesQuery
    })
  }, [faqs, selectedCategory, searchQuery])

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-2 pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <HelpCircle className="h-4 w-4" />
          <span>Troubleshooting & Knowledge Base</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Frequently Asked Questions (FAQs)
        </h1>
        <p className="text-sm text-muted-foreground">
          Quick, practical solutions for daily clinic questions, passwords, offline storage, and clinical warning alerts.
        </p>

        <div className="pt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. default password, offline sync, high risk, print)..."
              className="pl-9 bg-card border-border h-10 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No questions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching with different terms or select "All" categories.
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openFaqIds.has(faq.id)
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left font-semibold text-sm sm:text-base text-foreground hover:bg-muted/40 transition-colors gap-3"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold mt-0.5">
                      ?
                    </span>
                    <span>{faq.question}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-border/80 px-4 sm:px-5 py-4 space-y-3 bg-muted/20 animate-in fade-in-50 duration-200">
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed pl-7">
                      {faq.answer}
                    </p>

                    {faq.actionTip && (
                      <div className="ml-7 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold mr-1">Recommended Action:</strong>
                          {faq.actionTip}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

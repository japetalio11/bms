import * as React from "react"
import { useState, useMemo } from "react"
import { HELP_CATEGORIES, FREQUENTLY_ASKED_QUESTIONS } from "../data/helpContent"
import type { HelpCategory, HelpTopic } from "../types/helpTypes"
import { HelpArticleContent } from "./HelpArticleContent"
import { HelpFaqSection } from "./HelpFaqSection"
import { PrintQuickReferenceModal } from "./PrintQuickReferenceModal"
import { TechSupportModal } from "./TechSupportModal"
import {
  Compass,
  Users,
  HeartPulse,
  Calendar,
  ArrowRightLeft,
  FileText,
  MessageSquare,
  WifiOff,
  HelpCircle,
  Search,
  Printer,
  Headphones,
  BookOpen,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const categoryIconMap: Record<string, React.ReactNode> = {
  Compass: <Compass className="h-4 w-4 shrink-0" />,
  Users: <Users className="h-4 w-4 shrink-0" />,
  HeartPulse: <HeartPulse className="h-4 w-4 shrink-0" />,
  Calendar: <Calendar className="h-4 w-4 shrink-0" />,
  ArrowRightLeft: <ArrowRightLeft className="h-4 w-4 shrink-0" />,
  FileText: <FileText className="h-4 w-4 shrink-0" />,
  MessageSquare: <MessageSquare className="h-4 w-4 shrink-0" />,
  WifiOff: <WifiOff className="h-4 w-4 shrink-0" />,
  HelpCircle: <HelpCircle className="h-4 w-4 shrink-0" />,
}

export function HelpPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("getting-started")
  const [selectedTopicId, setSelectedTopicId] = useState<string>("daily-login-shift")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)

  const selectedCategory = useMemo(() => {
    return HELP_CATEGORIES.find((c) => c.id === selectedCategoryId) || HELP_CATEGORIES[0]
  }, [selectedCategoryId])

  const selectedTopic = useMemo(() => {
    if (selectedCategory.id === "faqs") return null
    return (
      selectedCategory.topics.find((t) => t.id === selectedTopicId) ||
      selectedCategory.topics[0]
    )
  }, [selectedCategory, selectedTopicId])

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return null

    const results: { category: HelpCategory; topic: HelpTopic; matchReason: string }[] = []

    for (const cat of HELP_CATEGORIES) {
      if (cat.id === "faqs") continue
      for (const topic of cat.topics) {
        if (topic.title.toLowerCase().includes(q)) {
          results.push({ category: cat, topic, matchReason: "Topic title match" })
          continue
        }
        if (topic.shortDescription.toLowerCase().includes(q)) {
          results.push({ category: cat, topic, matchReason: "Description match" })
          continue
        }
        const matchedStep = topic.steps.find(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.instruction.toLowerCase().includes(q) ||
            (s.substeps && s.substeps.some((sub) => sub.toLowerCase().includes(q)))
        )
        if (matchedStep) {
          results.push({ category: cat, topic, matchReason: `Step: "${matchedStep.title}"` })
        }
      }
    }

    return results
  }, [searchQuery])

  const handleSelectTopic = (categoryId: string, topicId: string) => {
    setSelectedCategoryId(categoryId)
    setSelectedTopicId(topicId)
    setSearchQuery("")
  }

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    const cat = HELP_CATEGORIES.find((c) => c.id === categoryId)
    if (cat && cat.topics.length > 0) {
      setSelectedTopicId(cat.topics[0].id)
    }
  }

  return (
    <div className="relative flex h-full w-full flex-1 flex-col overflow-y-auto bg-background text-foreground">
      <div className="border-b border-border bg-card px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-primary">
                  Staff Knowledge Base
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                BMS Staff Operating Guide & User Manual
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Step-by-step instructions for rural health unit midwives, nurses, and doctors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintModalOpen(true)}
                className="gap-1.5 text-xs font-medium border-border"
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Print Desk Sheet</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSupportModalOpen(true)}
                className="gap-1.5 text-xs font-medium border-border"
              >
                <Headphones className="h-3.5 w-3.5 text-primary" />
                <span>Support Hotline</span>
              </Button>
            </div>
          </div>

          <div className="relative max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides (e.g. how to register a mother, log vitals, emergency referral, offline pin)..."
              className="pl-10 pr-10 bg-background border-border h-11 text-xs sm:text-sm rounded-xl shadow-xs focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {searchResults && (
            <div className="rounded-xl border border-border bg-popover p-3 shadow-xl max-w-2xl animate-in fade-in-50 duration-150">
              <div className="text-[11px] font-semibold text-muted-foreground mb-2 px-1">
                Found {searchResults.length} {searchResults.length === 1 ? "guide" : "guides"} matching "{searchQuery}"
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching guides found. Try searching for terms like "register", "vitals", "referral", or "offline".
                </div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectTopic(res.category.id, res.topic.id)}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary">
                          {res.topic.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {res.category.shortTitle} • {res.matchReason}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
        <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 p-4 lg:p-6 space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
            Clinical Guide Modules
          </div>

          <nav className="space-y-1">
            {HELP_CATEGORIES.map((cat) => {
              const isActiveCategory = selectedCategoryId === cat.id
              const icon = categoryIconMap[cat.iconName] || <BookOpen className="h-4 w-4" />

              return (
                <div key={cat.id} className="space-y-1">
                  <button
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActiveCategory
                        ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {icon}
                      <span className="truncate">{cat.shortTitle}</span>
                    </div>
                    {cat.id === "faqs" ? (
                      <span className="text-[10px] rounded-full bg-primary/20 px-1.5 py-0.2 font-mono">
                        FAQ
                      </span>
                    ) : (
                      <span className="text-[10px] opacity-70">
                        {cat.topics.length}
                      </span>
                    )}
                  </button>

                  {isActiveCategory && cat.topics.length > 1 && (
                    <div className="ml-5 space-y-1 border-l-2 border-primary/30 pl-2.5 py-1">
                      {cat.topics.map((top) => {
                        const isCurrentTopic = selectedTopicId === top.id
                        return (
                          <button
                            key={top.id}
                            onClick={() => setSelectedTopicId(top.id)}
                            className={`block w-full text-left text-[11px] py-1 px-1.5 rounded-md transition-colors ${
                              isCurrentTopic
                                ? "font-bold text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {top.title}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-xs shadow-xs hidden lg:block">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
              <WifiOff className="h-3.5 w-3.5 text-blue-500" />
              <span>Offline Ready</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This guide is stored in your browser and works completely offline during field visits.
            </p>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-8 lg:p-10 bg-background overflow-y-auto">
          {selectedCategory.id === "faqs" ? (
            <HelpFaqSection faqs={FREQUENTLY_ASKED_QUESTIONS} />
          ) : selectedTopic ? (
            <HelpArticleContent
              topic={selectedTopic}
              onNavigateTopic={(topicId) => {
                for (const cat of HELP_CATEGORIES) {
                  const found = cat.topics.find((t) => t.id === topicId)
                  if (found) {
                    setSelectedCategoryId(cat.id)
                    setSelectedTopicId(found.id)
                    break
                  }
                }
              }}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Select a topic from the left sidebar to read its guide.
            </div>
          )}
        </main>
      </div>

      <PrintQuickReferenceModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
      />
      <TechSupportModal
        open={isSupportModalOpen}
        onOpenChange={setIsSupportModalOpen}
      />
    </div>
  )
}

export default HelpPage

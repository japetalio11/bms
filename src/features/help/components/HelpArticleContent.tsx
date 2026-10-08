import * as React from "react"
import type { HelpTopic } from "../types/helpTypes"
import { ScreenshotPlaceholder } from "./ScreenshotPlaceholder"
import {
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Lightbulb,
  WifiOff,
  Info,
  BookOpen,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface HelpArticleContentProps {
  topic: HelpTopic
  onNavigateTopic?: (topicId: string) => void
}

export function HelpArticleContent({ topic }: HelpArticleContentProps) {
  return (
    <article className="space-y-6 max-w-4xl">
      <div className="space-y-3 pb-4 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          {topic.badge && (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5">
              {topic.badge}
            </Badge>
          )}
          {topic.estimatedReadMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {topic.estimatedReadMinutes} min read
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {topic.title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {topic.shortDescription}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">When to Use</div>
              <div className="text-xs text-muted-foreground mt-0.5">{topic.whenToUse}</div>
            </div>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 flex items-start gap-2">
            <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Applicable Roles</div>
              <div className="text-xs text-muted-foreground mt-0.5">{topic.whoCanUse}</div>
            </div>
          </div>
        </div>
      </div>

      {topic.screenshotMockup && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Visual Interface Guide
            </h2>
          </div>
          <ScreenshotPlaceholder config={topic.screenshotMockup} />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Step-by-Step Instructions
          </h2>
        </div>

        <div className="space-y-4">
          {topic.steps.map((step) => (
            <Card key={step.stepNumber} className="border-border shadow-xs overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm shadow-primary/20">
                    {step.stepNumber}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {step.title}
                      </h3>
                      {step.actionTarget && (
                        <span className="font-mono text-[10px] rounded bg-muted px-2 py-0.5 text-muted-foreground border border-border">
                          UI: {step.actionTarget}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {step.instruction}
                    </p>

                    {step.substeps && step.substeps.length > 0 && (
                      <ul className="mt-2 space-y-1.5 pl-1">
                        {step.substeps.map((sub, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                            <span>{sub}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {step.note && (
                      <div className={`mt-3 rounded-lg p-3 text-xs flex items-start gap-2 border ${
                        step.noteType === "warning"
                          ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300"
                          : step.noteType === "tip"
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300"
                          : step.noteType === "offline"
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300"
                          : "bg-muted/60 border-border text-foreground"
                      }`}>
                        {step.noteType === "warning" && <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />}
                        {step.noteType === "tip" && <Lightbulb className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />}
                        {step.noteType === "offline" && <WifiOff className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />}
                        {(!step.noteType || step.noteType === "info") && <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />}
                        <div>
                          <strong className="font-semibold block mb-0.5">
                            {step.noteType === "warning" ? "Important Warning:" : step.noteType === "tip" ? "Helpful Tip:" : step.noteType === "offline" ? "Offline Notice:" : "Note:"}
                          </strong>
                          {step.note}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {topic.clinicalSafetyNotes && topic.clinicalSafetyNotes.length > 0 && (
        <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50/70 dark:bg-red-950/30 p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Maternal Clinical Safety Warnings</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {topic.clinicalSafetyNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-red-900 dark:text-red-200/90 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topic.proTips && topic.proTips.length > 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-900/70 bg-amber-50/70 dark:bg-amber-950/30 p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
            <Lightbulb className="h-4 w-4" />
            <span>Midwife & Health Worker Pro-Tips</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {topic.proTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topic.offlineNotes && topic.offlineNotes.length > 0 && (
        <div className="rounded-xl border border-blue-300 dark:border-blue-900/70 bg-blue-50/70 dark:bg-blue-950/30 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline Field Behavior</span>
          </div>
          {topic.offlineNotes.map((note, idx) => (
            <p key={idx} className="text-xs text-blue-900 dark:text-blue-200/90 leading-relaxed pl-6">
              {note}
            </p>
          ))}
        </div>
      )}
    </article>
  )
}

import React from "react"

export interface StepGuide {
  stepNumber: number
  title: string
  instruction: string
  actionTarget?: string
  substeps?: string[]
  note?: string
  noteType?: "tip" | "warning" | "offline" | "info"
}

export interface ScreenshotMockupConfig {
  title: string
  caption: string
  layoutType: 
    | "dashboard"
    | "mother-list"
    | "register-modal"
    | "profile-vitals"
    | "cdss-alert"
    | "calendar"
    | "referral"
    | "ehr"
    | "chat"
    | "offline-pin"
  customImageUrl?: string
}

export interface HelpTopic {
  id: string
  categoryId: string
  title: string
  shortDescription: string
  badge?: string
  estimatedReadMinutes?: number
  whenToUse: string
  whoCanUse: string
  steps: StepGuide[]
  screenshotMockup?: ScreenshotMockupConfig
  clinicalSafetyNotes?: string[]
  proTips?: string[]
  offlineNotes?: string[]
  relatedTopicIds?: string[]
}

export interface HelpCategory {
  id: string
  title: string
  shortTitle: string
  iconName: string
  description: string
  topics: HelpTopic[]
}

export interface FaqItem {
  id: string
  question: string
  category: string
  answer: string
  actionTip?: string
}

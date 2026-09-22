import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Download,
  ExternalLink,
  Minus,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  RotateCw,
} from "lucide-react"
import { resolveFileUrl } from "@/lib/apiClient"

export interface MediaItem {
  url: string
  title?: string
  subtitle?: string
  senderName?: string
  timestamp?: string
  fileName?: string
}

interface MediaPreviewModalProps {
  open: boolean
  onClose: () => void
  initialIndex?: number
  items: MediaItem[]
}

export function MediaPreviewModal({
  open,
  onClose,
  initialIndex = 0,
  items,
}: MediaPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoomScale, setZoomScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
      setZoomScale(1)
      setRotation(0)
    }
  }, [open, initialIndex])

  const currentItem: MediaItem | undefined = items[currentIndex]

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setZoomScale(1)
      setRotation(0)
    }
  }, [currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setZoomScale(1)
      setRotation(0)
    }
  }, [currentIndex, items.length])

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.25, 3.5))
  }

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleResetZoom = () => {
    setZoomScale(1)
    setRotation(0)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = async (item?: MediaItem) => {
    if (!item) return
    const rawUrl = resolveFileUrl(item.url)
    try {
      const response = await fetch(rawUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = item.fileName || item.title || `chat-attachment-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(rawUrl, "_blank")
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn()
      } else if (e.key === "-") {
        handleZoomOut()
      } else if (e.key === "0") {
        handleResetZoom()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handlePrev, handleNext, onClose])

  if (!open || !currentItem) return null

  const resolvedUrl = resolveFileUrl(currentItem.url)
  const isImage =
    resolvedUrl.startsWith("data:image/") ||
    Boolean(resolvedUrl.match(/\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i)) ||
    !resolvedUrl.match(/\.(pdf|docx?|xlsx?|txt|csv|zip)(\?.*)?$/i)

  const isPdf =
    resolvedUrl.startsWith("data:application/pdf") ||
    Boolean(resolvedUrl.match(/\.pdf(\?.*)?$/i))

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            {isPdf ? (
              <FileText className="h-5 w-5 text-red-400" />
            ) : (
              <ImageIcon className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-white">
              {currentItem.fileName || currentItem.title || "Photo Attachment"}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              {currentItem.senderName && <span>{currentItem.senderName}</span>}
              {currentItem.senderName && currentItem.timestamp && <span>•</span>}
              {currentItem.timestamp && <span>{currentItem.timestamp}</span>}
              {items.length > 1 && (
                <>
                  <span>•</span>
                  <span className="text-zinc-300 font-medium">
                    {currentIndex + 1} of {items.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.5}
              className="h-7 w-7 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              title="Zoom Out (-)"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[40px] text-center font-mono text-[11px] text-zinc-300 select-none">
              {Math.round(zoomScale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomScale >= 3.5}
              className="h-7 w-7 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              title="Zoom In (+)"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-7 rounded-full px-2 text-[11px] text-white/80 hover:bg-white/10"
              title="Reset Zoom (0)"
            >
              Reset
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRotate}
              className="h-7 w-7 rounded-full text-white/80 hover:bg-white/10"
              title="Rotate 90°"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              onClick={() => handleDownload(currentItem)}
              className="h-9 gap-1.5 rounded-full bg-blue-600 px-3.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-blue-700 sm:px-4"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(resolvedUrl, "_blank")}
              className="h-9 w-9 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-full text-white hover:bg-white/10"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex h-full w-full flex-1 items-center justify-center overflow-auto bg-black/90 p-4">
        {/* Previous Navigation Button */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="absolute left-4 sm:left-6 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-white/20 bg-black/70 text-white shadow-2xl backdrop-blur-xs transition-all hover:scale-105 hover:bg-black/90"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        )}

        {/* Content Container */}
        <div className="flex h-full w-full items-center justify-center overflow-auto p-2 sm:p-4">
          {isImage ? (
            <img
              src={resolvedUrl}
              alt={currentItem.title || "Photo Attachment"}
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
              className="max-h-[85vh] max-w-[92vw] select-none rounded-lg object-contain shadow-2xl transition-transform duration-200 ease-out"
              draggable={false}
            />
          ) : isPdf ? (
            <iframe
              src={resolvedUrl}
              title={currentItem.title || "PDF Document"}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: "top center",
              }}
              className="h-[84vh] w-[88vw] rounded-xl border border-white/20 bg-white shadow-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-zinc-900 p-8 text-center text-white shadow-2xl">
              <FileText className="h-16 w-16 text-blue-400" />
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">
                  {currentItem.fileName || "Document File"}
                </span>
                <span className="text-xs text-zinc-400">
                  This file format can be downloaded to view on your device.
                </span>
              </div>
              <Button
                onClick={() => handleDownload(currentItem)}
                className="mt-2 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Next Navigation Button */}
        {currentIndex < items.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-4 sm:right-6 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-white/20 bg-black/70 text-white shadow-2xl backdrop-blur-xs transition-all hover:scale-105 hover:bg-black/90"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        )}
      </div>
    </div>
  )
}

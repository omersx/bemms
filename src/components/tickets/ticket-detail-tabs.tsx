"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { FileText, MessageCircle, Clock, Layers } from "lucide-react"

interface TicketDetailTabsProps {
  overviewNode: React.ReactNode
  chatNode: React.ReactNode
  timelineNode: React.ReactNode
  sidebarNode?: React.ReactNode
  commentCount?: number
}

type TabType = "overview" | "chat" | "timeline" | "all"

export function TicketDetailTabs({
  overviewNode,
  chatNode,
  timelineNode,
  sidebarNode,
  commentCount = 0,
}: TicketDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview")

  return (
    <>
      {/* ── Mobile Layout with Clean Tab Navigation (< md) ── */}
      <div className="block md:hidden space-y-3.5">
        {/* Sticky Mobile Segmented Tabs Bar */}
        <div className="sticky top-0 z-20 -mx-3 px-3 py-1.5 bg-background/95 backdrop-blur-sm border-b border-border/80">
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all",
                activeTab === "overview"
                  ? "bg-card text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all relative",
                activeTab === "chat"
                  ? "bg-card text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Chat</span>
              {commentCount > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                    activeTab === "chat"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-foreground"
                  )}
                >
                  {commentCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all",
                activeTab === "timeline"
                  ? "bg-card text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Timeline</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all",
                activeTab === "all"
                  ? "bg-card text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">All</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="space-y-3.5">
          {activeTab === "overview" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              {overviewNode}
            </div>
          )}

          {activeTab === "chat" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              {chatNode}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              {timelineNode}
            </div>
          )}

          {activeTab === "all" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              {overviewNode}
              {chatNode}
              {timelineNode}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop Layout (>= md): Classic Multi-Column ── */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Details, Triage, and Chat */}
        <div className="md:col-span-2 space-y-6">
          {overviewNode}
          {chatNode}
        </div>

        {/* Right Column (1 span): Context & Timeline */}
        <div className="space-y-6">
          {sidebarNode}
          {timelineNode}
        </div>
      </div>
    </>
  )
}

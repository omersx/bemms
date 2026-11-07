"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addTicketComment } from "@/lib/actions/tickets";
import { playNotificationSound } from "@/lib/utils/sound";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale, useTranslations } from "next-intl";
import {
  Send,
  Lock,
  Globe,
  Loader2,
  Wrench,
  MessageCircle,
  Stethoscope,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  visibility: string;
  createdAt: Date | string;
  authorUserId?: string;
  author?: {
    id?: string;
    fullName?: string | null;
  } | null;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  isImage: boolean;
}

interface ParsedAttachment {
  name: string;
  url: string;
  size: number;
  type?: string;
}

const QUICK_CHAT_TEMPLATES_EN = [
  "When is this expected to be ready for patient care?",
  "Device is in Room / Bed ready for inspection.",
  "Please call our nurse station extension when arriving.",
  "Thank you, device is verified and working properly.",
];

const QUICK_CHAT_TEMPLATES_AR = [
  "متى يُتوقع جاهزية الجهاز لاستئناف رعاية المرضى؟",
  "الجهاز موجود في الغرفة / السرير وهو جاهز للفحص والمعاينة.",
  "يرجى الاتصال بمحطة التمريض عند وصولكم إلى القسم.",
  "شكراً لكم، تم التحقق من الجهاز وهو يعمل بكفاءة الآن.",
];

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function parseCommentBody(rawBody: string): { text: string; attachments: ParsedAttachment[] } {
  const attachments: ParsedAttachment[] = [];
  const text = rawBody
    .replace(/\[attachment:(\{.*?\})\]/g, (_, jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.url && parsed.name) {
          attachments.push(parsed);
        }
        return "";
      } catch {
        return "";
      }
    })
    .trim();

  return { text, attachments };
}

export interface ContactAvailability {
  isOnline: boolean;
  statusText: string;
  variant?: "online" | "on_call" | "in_maintenance" | "offline" | "unassigned";
}

const STATUS_CONFIG = {
  online: {
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
    pulse: true,
    title: "Online / Available",
  },
  on_call: {
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
    pulse: true,
    title: "On Call",
  },
  in_maintenance: {
    dotClass: "bg-blue-500",
    textClass: "text-blue-600 dark:text-blue-400",
    pulse: false,
    title: "In Maintenance",
  },
  offline: {
    dotClass: "bg-slate-400 dark:bg-slate-500",
    textClass: "text-muted-foreground",
    pulse: false,
    title: "Offline / Off Duty",
  },
  unassigned: {
    dotClass: "bg-amber-400",
    textClass: "text-amber-600 dark:text-amber-400",
    pulse: true,
    title: "Awaiting Assignment",
  },
} as const;

export function TicketCommentSection({
  ticketId,
  comments,
  canAddInternal = false,
  currentUserId,
  assignedEngineerUserId,
  assignedEngineerName,
  reporterName,
  reporterRole,
  isBiomed = false,
  contactAvailability,
}: {
  ticketId: string;
  comments: Comment[];
  canAddInternal?: boolean;
  currentUserId?: string;
  assignedEngineerUserId?: string | null;
  assignedEngineerName?: string | null;
  reporterName?: string | null;
  reporterRole?: string | null;
  isBiomed?: boolean;
  contactAvailability?: ContactAvailability;
}) {
  const router = useRouter();
  const t = useTranslations('tickets');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const quickTemplates = isArabic ? QUICK_CHAT_TEMPLATES_AR : QUICK_CHAT_TEMPLATES_EN;

  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "internal">("public");
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);

  // Clear optimistic comments when server re-renders with new props
  useEffect(() => {
    setOptimisticComments([]);
  }, [comments]);

  const allComments = [...comments, ...optimisticComments];

  // If user cannot add internal notes (e.g. ward staff), filter out internal comments
  const visibleComments = canAddInternal
    ? allComments
    : allComments.filter((c) => c.visibility === "public");

  // Sort chronologically (oldest first) like a chat thread
  const sortedComments = [...visibleComments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Auto-scroll to bottom on load and whenever comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, optimisticComments]);

  // Auto-resize textarea dynamically to fit message text (from 38px up to 120px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      const targetH = Math.max(38, Math.min(scrollH, 120));
      textareaRef.current.style.height = `${targetH}px`;
    }
  }, [body]);

  // Handle file selection from input
  const addFiles = (files: FileList | File[]) => {
    const newItems: PendingAttachment[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 20MB limit`);
        return;
      }
      const isImg = file.type.startsWith("image/");
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        isImage: isImg,
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      });
    });

    if (newItems.length > 0) {
      setPendingFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Support pasting images from clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length > 0) {
        e.preventDefault();
        addFiles(images);
        toast.info(`Added ${images.length} image(s) from clipboard`);
      }
    }
  };

  const applyTemplate = (tmpl: string) => {
    setBody(tmpl);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = async () => {
    const text = body.trim();
    if ((!text && pendingFiles.length === 0) || loading) return;

    // Play message notification sound immediately on user interaction
    playNotificationSound().catch(() => {});

    setLoading(true);

    const filesToUpload = [...pendingFiles];
    const currentVis = canAddInternal ? visibility : "public";

    // Create optimistic display
    let optimisticBody = text;
    filesToUpload.forEach((p) => {
      optimisticBody += `\n[attachment:{"name":"${p.file.name}","url":"${
        p.previewUrl || "#"
      }","size":${p.file.size},"type":"${p.file.type}"}]`;
    });

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      body: optimisticBody.trim(),
      visibility: currentVis,
      createdAt: new Date(),
      authorUserId: currentUserId,
      author: {
        id: currentUserId,
        fullName: "You",
      },
    };

    setOptimisticComments((prev) => [...prev, tempComment]);
    setBody("");
    setPendingFiles([]);

    try {
      // 1. Upload files first if any
      const uploadedTags: string[] = [];
      for (const item of filesToUpload) {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("visibility", currentVis);

        const uploadRes = await fetch(`/api/tickets/${ticketId}/attachments`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || `Failed to upload ${item.file.name}`);
        }

        const data = await uploadRes.json();
        if (data.success && data.attachment) {
          const tag = `[attachment:${JSON.stringify({
            name: data.attachment.fileName,
            url: data.attachment.url,
            size: data.attachment.fileSize,
            type: data.attachment.mimeType,
          })}]`;
          uploadedTags.push(tag);
        }
      }

      // 2. Assemble comment body with attachment tags
      let finalBody = text;
      if (uploadedTags.length > 0) {
        finalBody = finalBody ? `${finalBody}\n\n${uploadedTags.join("\n")}` : uploadedTags.join("\n");
      }

      // 3. Post comment
      const res = await addTicketComment(ticketId, {
        body: finalBody.trim(),
        visibility: currentVis,
      });

      if (res?.success) {
        router.refresh();
        toast.success(
          currentVis === "internal"
            ? "Internal note posted"
            : filesToUpload.length > 0
            ? "Message with attachments sent"
            : "Message sent"
        );
      } else {
        setOptimisticComments((prev) => prev.filter((c) => c.id !== tempComment.id));
        setBody(text);
        setPendingFiles(filesToUpload);
        toast.error((res as any)?.error || "Failed to post message");
      }
    } catch (err: any) {
      setOptimisticComments((prev) => prev.filter((c) => c.id !== tempComment.id));
      setBody(text);
      setPendingFiles(filesToUpload);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Determine counterpart contact for header
  const contactName = isBiomed
    ? reporterName || "Department Clinical Staff"
    : assignedEngineerName || "Biomedical Engineering";

  const contactRole = isBiomed
    ? reporterRole || "Clinical Staff"
    : "Biomedical Engineer";

  const contactInitials =
    contactName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C";

  const currentAvailability = contactAvailability || {
    isOnline: true,
    statusText: `Active · ${contactRole}`,
    variant: "online" as const,
  };

  const statusCfg =
    STATUS_CONFIG[currentAvailability.variant || "online"] || STATUS_CONFIG.online;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl overflow-hidden bg-card border border-border shadow-xs transition-all w-full max-w-full",
        "h-[calc(100dvh-290px)] min-h-[420px] max-h-[740px] md:h-[620px] md:max-h-none"
      )}
    >
      {/* Hidden File Pickers */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── 1. Compact Chat Header ── */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-muted/40 border-b border-border/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Avatar with Online Status Indicator */}
          <div className="relative shrink-0">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-border/80">
              <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                {contactInitials}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ring-1 ring-background",
                statusCfg.dotClass
              )}
              title={statusCfg.title}
            />
          </div>

          {/* Contact Name & Status */}
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate leading-tight">
              {contactName}
            </h3>
            <p
              className={cn(
                "text-[10px] sm:text-[11px] font-medium truncate flex items-center gap-1 leading-tight mt-0.5",
                statusCfg.textClass
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full inline-block shrink-0",
                  statusCfg.dotClass,
                  statusCfg.pulse && "animate-pulse"
                )}
              />
              <span>{currentAvailability.statusText}</span>
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background border border-border/60 text-muted-foreground shadow-2xs">
            {sortedComments.length} {sortedComments.length === 1 ? "msg" : "msgs"}
          </span>
        </div>
      </div>

      {/* ── 2. Flexible Conversation Area (Independent Scroll) ── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[140px] overflow-y-auto overscroll-contain p-2.5 sm:p-4 space-y-2.5 bg-slate-50/40 dark:bg-muted/10"
      >
        {sortedComments.length === 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-3 sm:p-4 space-y-2 my-auto">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
                {isArabic ? "لا توجد رسائل بعد في هذا البلاغ" : "No messages yet in this ticket"}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                {isArabic ? "أرسل رسالة أو اختر أحد الاقتراحات السريعة للتنسيق مع " : "Send a message or select a suggestion below to coordinate with "}
                <span className="text-foreground/90 font-medium">{contactName}</span>.
              </p>
            </div>
          </div>
        ) : (
          sortedComments.map((c) => (
            <ChatBubble
              key={c.id}
              comment={c}
              isArabic={isArabic}
              isCurrentUser={Boolean(
                currentUserId &&
                  (c.authorUserId === currentUserId ||
                    (c.author as any)?.id === currentUserId)
              )}
              isAssignedEngineer={Boolean(
                assignedEngineerUserId &&
                  (c.authorUserId === assignedEngineerUserId ||
                    (c.author as any)?.id === assignedEngineerUserId)
              )}
            />
          ))
        )}
      </div>

      {/* ── 3. Quick Reply Suggestions (Horizontally Scrollable, Above Composer) ── */}
      <div className="px-3 py-2 bg-background/80 backdrop-blur-xs border-t border-border/40 overflow-x-auto flex items-center gap-2 no-scrollbar scrollbar-none touch-pan-x overscroll-x-contain shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 ms-0.5" />
        {quickTemplates.map((tmpl) => (
          <button
            key={tmpl}
            type="button"
            onClick={() => applyTemplate(tmpl)}
            aria-label={`Insert quick reply: ${tmpl}`}
            className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-border/70 bg-muted/40 hover:bg-muted hover:text-foreground text-muted-foreground hover:border-primary/40 active:scale-95 transition-all whitespace-nowrap shrink-0 select-none shadow-2xs"
          >
            {tmpl}
          </button>
        ))}
        {/* End padding spacer to ensure last chip doesn't clip on full scroll */}
        <div className="w-2 shrink-0" aria-hidden="true" />
      </div>

      {/* ── 4. Message Composer (Sticky at Bottom) ── */}
      <div className="p-2 sm:p-2.5 bg-card border-t border-border/60 shrink-0 sticky bottom-0 z-10 space-y-1.5">
        {/* Compact Segmented Control (Public Reply / Internal Note) */}
        {canAddInternal && (
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-muted/60 border border-border/40 text-[11px]">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all",
                  visibility === "public"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Globe className="w-3 h-3" />
                <span>{isArabic ? "رد عام للقسم" : "Public Reply"}</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("internal")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all",
                  visibility === "internal"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Lock className="w-3 h-3" />
                <span>{isArabic ? "ملاحظة هندسية داخلية" : "Internal Note"}</span>
              </button>
            </div>

            <span className="text-[10px] text-muted-foreground truncate hidden xs:inline">
              {visibility === "internal" ? (isArabic ? "🔒 للمهندسين فقط" : "🔒 Biomed only") : (isArabic ? "🌐 ظاهر لطاقم القسم" : "🌐 Visible to ward")}
            </span>
          </div>
        )}

        {/* Pending Attachments Tray */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/30 rounded-lg border border-dashed border-border text-xs">
            {pendingFiles.map((p) => (
              <div
                key={p.id}
                className="relative flex items-center gap-1.5 bg-background border rounded-md p-1 pe-2 text-xs shadow-2xs group"
              >
                {p.isImage && p.previewUrl ? (
                  <img
                    src={p.previewUrl}
                    alt={p.file.name}
                    className="w-7 h-7 rounded object-cover border"
                  />
                ) : (
                  <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="max-w-[120px] truncate">
                  <p className="font-medium truncate text-[10px]">{p.file.name}</p>
                  <p className="text-[9px] text-muted-foreground">{formatFileSize(p.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removePendingFile(p.id)}
                  aria-label={`Remove attachment ${p.file.name}`}
                  className="ms-0.5 text-muted-foreground hover:text-destructive p-0.5 rounded-full hover:bg-muted"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Expandable Input Box with Action Bar */}
        <div
          className={cn(
            "rounded-xl border transition-all focus-within:ring-2 focus-within:border-transparent",
            visibility === "internal"
              ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 focus-within:ring-amber-500/30"
              : "bg-muted/20 dark:bg-zinc-900/60 border-input focus-within:ring-primary/20"
          )}
        >
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            aria-label="Message text"
            placeholder={
              visibility === "internal"
                ? (isArabic ? "اكتب ملاحظة هندسية داخلية (مخفية عن طاقم القسم)..." : "Type an internal engineering note (hidden from ward staff)...")
                : (isArabic ? "اكتب رسالة إلى طاقم القسم السريري..." : "Type a message to clinical ward staff...")
            }
            rows={1}
            className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[38px] max-h-[120px] text-xs sm:text-sm p-2 sm:p-2.5 leading-relaxed placeholder:text-muted-foreground/60 overflow-y-auto"
          />

          {/* Action Toolbar */}
          <div className="flex items-center justify-between p-1.5 px-2 border-t border-border/30 bg-background/30 rounded-b-xl">
            {/* Attachment Icons */}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Attach file"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-md"
                title="Attach file (PDF, manual, report)"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">{isArabic ? "ملف" : "File"}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading}
                aria-label="Attach photo"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-md"
                title="Attach photo or screenshot"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">{isArabic ? "صورة" : "Photo"}</span>
              </Button>
            </div>

            {/* Send Button */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground hidden md:inline">
                <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px] border">Enter</kbd> {isArabic ? "إرسال" : "send"}
              </span>

              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={(!body.trim() && pendingFiles.length === 0) || loading}
                aria-label="Send message"
                className={cn(
                  "h-7 sm:h-8 text-xs gap-1.5 px-3 font-semibold rounded-lg shadow-2xs transition-all",
                  visibility === "internal"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{isArabic ? "جاري الإرسال" : "Sending"}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 rtl:rotate-180" />
                    <span>{isArabic ? "إرسال" : "Send"}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  comment,
  isCurrentUser,
  isAssignedEngineer,
  isArabic = false,
}: {
  comment: Comment;
  isCurrentUser: boolean;
  isAssignedEngineer: boolean;
  isArabic?: boolean;
}) {
  const isInternal = comment.visibility === "internal";

  const formattedTime = comment.createdAt
    ? new Date(comment.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const { text, attachments } = parseCommentBody(comment.body);

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-2.5 max-w-[90%] sm:max-w-[80%]",
        isCurrentUser ? "ms-auto flex-row-reverse" : "me-auto"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 mt-0.5 border border-border/60">
        <AvatarFallback
          className={cn(
            "text-[9px] sm:text-[10px] font-bold",
            isInternal
              ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
              : isAssignedEngineer
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : isCurrentUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {comment.author?.fullName?.substring(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      {/* Bubble Content */}
      <div className="space-y-1 min-w-0">
        {/* Author Label */}
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px]",
            isCurrentUser ? "justify-end" : "justify-start"
          )}
        >
          <span className="font-semibold text-foreground truncate">
            {isCurrentUser ? (isArabic ? "أنت" : "You") : comment.author?.fullName || (isArabic ? "طاقم القسم" : "Staff")}
          </span>

          {isAssignedEngineer && !isCurrentUser ? (
            <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1 py-0.2 rounded font-medium text-[9px] sm:text-[10px] flex items-center gap-0.5">
              <Wrench className="w-2.5 h-2.5" /> {isArabic ? "مهندس" : "Engineer"}
            </span>
          ) : !isCurrentUser && (comment.author as any)?.jobTitle ? (
            <span className="bg-muted text-muted-foreground px-1 py-0.2 rounded font-medium text-[9px] sm:text-[10px] flex items-center gap-0.5">
              <Stethoscope className="w-2.5 h-2.5 text-primary" />
              {(comment.author as any).jobTitle}
            </span>
          ) : null}

          {isInternal && (
            <span className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded font-medium text-[9px] flex items-center gap-0.5">
              <Lock className="w-2 h-2" /> {isArabic ? "داخلي" : "Internal"}
            </span>
          )}

          <span className="text-[10px] text-muted-foreground ms-0.5">
            {formattedTime}
          </span>
        </div>

        {/* Bubble Text & Attachments */}
        <div
          className={cn(
            "p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs space-y-2 break-words",
            isCurrentUser
              ? "bg-primary text-primary-foreground rounded-tr-xs"
              : isInternal
              ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 rounded-tl-xs"
              : isAssignedEngineer
              ? "bg-card border-2 border-blue-200/80 dark:border-blue-900/60 text-foreground rounded-tl-xs"
              : "bg-card border border-border text-foreground rounded-tl-xs"
          )}
        >
          {text && (
            <div className="whitespace-pre-wrap leading-relaxed">
              {text}
            </div>
          )}

          {/* Render Attached Files */}
          {attachments.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              {attachments.map((att, idx) => {
                const isImage =
                  att.type?.startsWith("image/") ||
                  [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) =>
                    att.name.toLowerCase().endsWith(ext)
                  );

                if (isImage) {
                  return (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-border/40 hover:opacity-95 transition group"
                    >
                      <img
                        src={att.url}
                        alt={att.name}
                        className="max-h-52 max-w-full rounded-lg object-contain bg-black/5 dark:bg-white/5"
                        loading="lazy"
                      />
                      <div className="p-1 px-2 text-[10px] flex items-center justify-between opacity-80 group-hover:opacity-100 bg-black/40 text-white">
                        <span className="truncate max-w-[160px]">{att.name}</span>
                        <span>{formatFileSize(att.size)}</span>
                      </div>
                    </a>
                  );
                }

                return (
                  <a
                    key={idx}
                    href={att.url}
                    download={att.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-xs transition",
                      isCurrentUser
                        ? "bg-white/10 hover:bg-white/20 border-white/20 text-primary-foreground"
                        : "bg-muted/60 hover:bg-muted border-border text-foreground"
                    )}
                  >
                    <div className="p-1 rounded bg-background/80 text-primary">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-[11px]">{att.name}</p>
                      <p className="text-[9px] opacity-75">{formatFileSize(att.size)}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

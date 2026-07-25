import { useState, useEffect, useRef } from "react";
import { useParams, useSearch, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, Send, Mic, MicOff, Map, ImagePlus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetConversation,
  useCreateConversation,
  useSendMessage,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import type { ConversationMessage, Property } from "@workspace/api-client-react";
import PropertyCard from "@/pages/home/PropertyCard";
import ChatContactCard from "./ChatContactCard";
import PreSelectionGrid from "./PreSelectionGrid";

// ── Criteria chip helpers ─────────────────────────────────────────────────────

const BUYER_CHIP_LABELS: Record<string, (v: unknown) => string> = {
  category: (v) => String(v),
  transactionMode: (v) =>
    ({ sale: "للبيع", rent: "للإيجار", lease: "للتأجير" }[String(v)] ?? String(v)),
  budgetMax: (v) => `حتى ${Number(v).toLocaleString()}`,
  rooms: (v) => `${v} غرف`,
  city: (v) => String(v),
  district: (v) => String(v),
  furnished: (v) =>
    ({ furnished: "مفروش", unfurnished: "غير مفروش" }[String(v)] ?? String(v)),
};

const SELLER_CHIP_LABELS: Record<string, (v: unknown) => string> = {
  category: (v) => String(v),
  transactionMode: (v) =>
    ({ sale: "للبيع", rent: "للإيجار", lease: "للتأجير" }[String(v)] ?? String(v)),
  price: (v) => Number(v).toLocaleString(),
  city: (v) => String(v),
  district: (v) => String(v),
  rooms: (v) => `${v} غرف`,
  areaSqm: (v) => `${v} م²`,
};

function CriteriaChips({
  data,
  type,
}: {
  data: Record<string, unknown>;
  type: "buyer_search" | "seller_listing";
}) {
  const labels = type === "buyer_search" ? BUYER_CHIP_LABELS : SELLER_CHIP_LABELS;
  const chips = Object.entries(data)
    .filter(([k, v]) => v != null && labels[k])
    .map(([k, v]) => ({ key: k, label: labels[k](v) }));
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-0">
      {chips.map(({ key, label }) => (
        <span
          key={key}
          className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

const SELLER_IMAGE_STATES = new Set([
  // Photos belong in the wizard (step 3), not during AI chat collection
  // Keeping set for future use but not rendering the button
  "__disabled__",
  "submit_ready",
]);

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isNew = id === "new";
  const params = new URLSearchParams(search);
  const convoType = (params.get("type") ?? "buyer_search") as
    | "buyer_search"
    | "seller_listing";

  const [convId, setConvId] = useState<string | null>(isNew ? null : id);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createConvo = useCreateConversation();
  const sendMsg = useSendMessage();

  const { data: convo } = useGetConversation(convId ?? "", {
    query: {
      enabled: !!convId,
      queryKey: getGetConversationQueryKey(convId ?? ""),
    },
  });

  // Speech input — appends final transcript to the textarea
  const speech = useSpeechInput({
    lang: i18n.language === "ar" ? "ar-JO" : "en-US",
    onTranscript: (text) => {
      setInput((prev) => (prev.trim() ? prev.trimEnd() + " " + text : text));
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
  });

  useEffect(() => {
    if (!isAuthenticated) navigate("/auth");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isNew && !convId) {
      createConvo
        .mutateAsync({ data: { type: convoType, market: user?.market ?? "JO" } })
        .then((c) => {
          setConvId(c.id);
          navigate(`/chat/${c.id}`, { replace: true });
        });
    }
  }, [isNew, convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convo?.messages, localMessages]);

  async function handleSend() {
    const text = (speech.interimText.trim() || input.trim());
    if (!text || !convId) return;
    // If mic is open, stop it first — onTranscript will fire, then we send
    if (speech.isListening) {
      speech.stop();
      // small delay so onTranscript fires and sets input before we read it
      await new Promise((r) => setTimeout(r, 80));
    }
    const finalText = input.trim() || text;
    if (!finalText) return;
    setInput("");

    const userMsg: ConversationMessage = {
      role: "user",
      content: finalText,
      timestamp: new Date().toISOString(),
    };
    setLocalMessages((m) => [...m, userMsg]);

    try {
      const res = await sendMsg.mutateAsync({ id: convId, data: { content: finalText } });
      setLocalMessages([]);
      queryClient.setQueryData(getGetConversationQueryKey(convId), res.conversation);
    } catch {
      setLocalMessages((m) => m.slice(0, -1));
    }
  }

  async function handleSubmitListing() {
    if (!convId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/submit-listing`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("aqari_token")}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "فشل نشر الإعلان");
      }
      const property = await res.json();
      toast({ title: "تم إنشاء مسودة الإعلان", description: "استكمل بقية التفاصيل ثم انشر." });
      navigate(`/list/wizard/${property.id}/preview`);
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.retry"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const messages: ConversationMessage[] = [
    ...(convo?.messages ?? []),
    ...localMessages,
  ];

  const currentState = convo?.currentState ?? "";
  const extractedData = (convo?.extractedData ?? {}) as Record<string, unknown>;
  const isSeller = (convo?.type ?? convoType) === "seller_listing";

  const showViewOnMap = !isSeller && currentState === "results_presented";
  const showAddImages = isSeller && SELLER_IMAGE_STATES.has(currentState);
  const showSubmit = isSeller && currentState === "submit_ready";

  const isLoading = createConvo.isPending || sendMsg.isPending;

  // What to show in the textarea placeholder
  const placeholder = speech.isListening
    ? `🎙 ${speech.interimText || t("chat.listening")}`
    : t("chat.placeholder");

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/chat")} type="button">
          <ArrowRight size={20} className="text-gray-600 rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {isSeller ? t("chat.newListing") : t("chat.newSearch")}
          </p>
          {currentState && (
            <p className="text-[10px] text-gray-400">{currentState.replace(/_/g, " ")}</p>
          )}
        </div>
      </div>

      {/* Criteria chips */}
      {Object.keys(extractedData).length > 0 && (
        <CriteriaChips
          data={extractedData}
          type={isSeller ? "seller_listing" : "buyer_search"}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3 max-w-[80%] shadow-sm">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pre-selection grid — empty buyer chat only; chips compose the
          message into the input, the user presses send (CONTEXT.md) */}
      {!isSeller && messages.length <= 1 && !isLoading && (
        <PreSelectionGrid onCompose={setInput} />
      )}

      {/* Action buttons */}
      {(showViewOnMap || showAddImages || showSubmit) && (
        <div className="bg-white border-t border-gray-50 px-3 py-2 flex flex-wrap gap-2">
          {showViewOnMap && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" onClick={() => navigate("/")}>
              <Map size={14} />
              {t("chat.viewResults")}
            </Button>
          )}
          {showAddImages && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" onClick={() => navigate("/list")}>
              <ImagePlus size={14} />
              {t("list.addImages")}
            </Button>
          )}
          {showSubmit && (
            <Button
              size="sm"
              className="gap-1.5 text-xs h-9 bg-primary"
              onClick={handleSubmitListing}
              disabled={submitting}
            >
              <Eye size={14} />
              {submitting ? t("common.loading") : t("wizard.startWizard")}
            </Button>
          )}
        </div>
      )}

      {/* Speech error */}
      {speech.error && (
        <div className="mx-3 mb-1 text-xs text-red-500 text-center">{speech.error}</div>
      )}

      {/* Input row */}
      <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-end gap-2">
        {/* Mic: tap to start, tap again to stop & send transcript */}
        <Button
          size="icon"
          variant={speech.isListening ? "default" : "outline"}
          className={`h-10 w-10 shrink-0 transition-colors ${
            speech.isListening
              ? "bg-red-500 hover:bg-red-600 border-red-500 text-white animate-pulse"
              : !speech.isSupported
                ? "opacity-40 cursor-not-allowed"
                : ""
          }`}
          onClick={speech.toggle}
          type="button"
          title={
            !speech.isSupported
              ? "الصوت غير مدعوم في هذا المتصفح"
              : speech.isListening
                ? t("chat.stopListening")
                : t("chat.startListening")
          }
        >
          {speech.isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={speech.isListening ? speech.interimText : input}
            onChange={(e) => { if (!speech.isListening) setInput(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            className={`w-full resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none max-h-32 transition-colors ${
              speech.isListening
                ? "border-red-300 bg-red-50 text-gray-700"
                : "border-gray-200 bg-gray-50 focus:border-primary"
            }`}
            rows={1}
            dir="auto"
            readOnly={speech.isListening}
          />
          {speech.isListening && (
            <div className="absolute inset-0 flex items-center justify-end pe-3 pointer-events-none">
              <span className="flex gap-0.5">
                <span className="w-1 h-3 bg-red-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-4 bg-red-400 rounded-full animate-bounce [animation-delay:100ms]" />
                <span className="w-1 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:200ms]" />
              </span>
            </div>
          )}
        </div>

        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={(!input.trim() && !speech.interimText) || isLoading}
          type="button"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

function PropertyCarousel({ properties }: { properties: Property[] }) {
  return (
    <div className="w-full overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3 min-w-min snap-x snap-mandatory">
        {properties.map((property) => (
          <div key={property.id} className="w-[240px] shrink-0 snap-start">
            <PropertyCard property={property} showContactCta />
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  // Legacy field: conversations stored before the cards contract (docs/adr/0001).
  const legacyProperties = message.properties ?? [];
  const cards = message.cards ?? [];
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-2`}>
      <div
        className={`max-w-[82%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-t-2xl rounded-br-2xl rounded-bl-md"
            : "bg-card border border-border text-foreground rounded-t-2xl rounded-bl-2xl rounded-br-md"
        }`}
        dir="auto"
      >
        {message.content}
      </div>

      {legacyProperties.length > 0 && <PropertyCarousel properties={legacyProperties} />}

      {/* Discriminated card union — unknown types are ignored on purpose */}
      {cards.map((card, i) => {
        if (card.type === "properties") {
          return <PropertyCarousel key={i} properties={card.properties} />;
        }
        if (card.type === "contact") {
          return <ChatContactCard key={i} contact={card.contact} />;
        }
        return null;
      })}
    </div>
  );
}

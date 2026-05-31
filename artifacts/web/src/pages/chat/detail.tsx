import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearch, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetConversation,
  useCreateConversation,
  useSendMessage,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import type { ConversationMessage } from "@workspace/api-client-react";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const isNew = id === "new";
  const params = new URLSearchParams(search);
  const convoType = (params.get("type") ?? "buyer_search") as
    | "buyer_search"
    | "seller_listing";

  const [convId, setConvId] = useState<string | null>(isNew ? null : id);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createConvo = useCreateConversation();
  const sendMsg = useSendMessage();

  const { data: convo } = useGetConversation(convId ?? "", {
    query: {
      enabled: !!convId,
      queryKey: getGetConversationQueryKey(convId ?? ""),
    },
  });

  const hasSpeechSupport = !!(
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isNew && !convId) {
      createConvo
        .mutateAsync({
          data: {
            type: convoType,
            market: user?.market ?? "JO",
          },
        })
        .then((c) => {
          setConvId(c.id);
          navigate(`/chat/${c.id}`, { replace: true });
        });
    }
  }, [isNew, convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convo?.messages, localMessages]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = i18n.language === "ar" ? "ar-JO" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [i18n.language]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  async function handleSend() {
    if (!input.trim() || !convId) return;
    if (isListening) stopListening();
    const text = input.trim();
    setInput("");

    const userMsg: ConversationMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setLocalMessages((m) => [...m, userMsg]);

    try {
      const res = await sendMsg.mutateAsync({
        id: convId,
        data: { content: text },
      });
      setLocalMessages([]);
      queryClient.setQueryData(getGetConversationQueryKey(convId), res.conversation);
    } catch {
      setLocalMessages((m) => m.slice(0, -1));
    }
  }

  const messages: ConversationMessage[] = [
    ...(convo?.messages ?? []),
    ...localMessages,
  ];

  const isLoading = createConvo.isPending || sendMsg.isPending;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/chat")} type="button">
          <ArrowRight size={20} className="text-gray-600 rtl:rotate-180" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-900">
            {convoType === "buyer_search" ? t("chat.newSearch") : t("chat.newListing")}
          </p>
          {convo?.currentState && (
            <p className="text-xs text-gray-400">{convo.currentState}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 max-w-[80%]">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-end gap-2">
        {hasSpeechSupport && (
          <Button
            size="icon"
            variant={isListening ? "default" : "outline"}
            className={`h-10 w-10 shrink-0 transition-colors ${
              isListening ? "bg-red-500 hover:bg-red-600 border-red-500 animate-pulse" : ""
            }`}
            onClick={toggleListening}
            type="button"
            title={isListening ? t("chat.stopListening") : t("chat.startListening")}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </Button>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isListening ? "🎙 " + (t("chat.listening") ?? "جاري الاستماع...") : t("chat.placeholder")}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary max-h-32 bg-gray-50"
          rows={1}
          dir="auto"
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          type="button"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-br-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
        }`}
        dir="auto"
      >
        {message.content}
      </div>
    </div>
  );
}

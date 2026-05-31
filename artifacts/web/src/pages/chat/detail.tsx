import { useState, useEffect, useRef } from "react";
import { useParams, useSearch, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, Send, Mic } from "lucide-react";
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

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const createConvo = useCreateConversation();
  const sendMsg = useSendMessage();

  const { data: convo } = useGetConversation(convId ?? "", {
    query: {
      enabled: !!convId,
      queryKey: getGetConversationQueryKey(convId ?? ""),
    },
  });

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

  async function handleSend() {
    if (!input.trim() || !convId) return;
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
        <div>
          <p className="font-semibold text-sm text-gray-900">{t("chat.title")}</p>
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
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-400 max-w-[80%]">
              <span className="animate-pulse">{t("chat.thinking")}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t("chat.placeholder")}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary max-h-32 bg-gray-50"
          rows={1}
          dir="auto"
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
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

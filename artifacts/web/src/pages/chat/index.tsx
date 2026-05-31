import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { MessageSquare, Plus, Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListConversations } from "@workspace/api-client-react";

export default function ChatPage() {
  const { t } = useTranslation();
  const { data: conversations, isLoading } = useListConversations();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">{t("chat.title")}</h1>
      </div>

      <div className="p-4 space-y-3">
        {/* Start buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/chat/new?type=buyer_search">
            <button className="w-full bg-white border border-gray-200 rounded-xl p-4 text-start hover:border-primary/40 transition-colors">
              <Search size={24} className="text-primary mb-2" />
              <p className="font-semibold text-sm text-gray-900">{t("chat.newSearch")}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("home.searchPlaceholder")}</p>
            </button>
          </Link>
          <Link href="/chat/new?type=seller_listing">
            <button className="w-full bg-white border border-gray-200 rounded-xl p-4 text-start hover:border-primary/40 transition-colors">
              <Home size={24} className="text-primary mb-2" />
              <p className="font-semibold text-sm text-gray-900">{t("chat.newListing")}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("list.chatSubtitle")}</p>
            </button>
          </Link>
        </div>

        {/* Previous conversations */}
        {isLoading && (
          <p className="text-center text-sm text-gray-400 py-8">{t("common.loading")}</p>
        )}

        {!isLoading && conversations && conversations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              السابقة
            </p>
            {conversations.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`}>
                <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.type === "buyer_search" ? t("chat.newSearch") : t("chat.newListing")}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(c.updatedAt).toLocaleDateString("ar")}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      c.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.status === "active" ? "نشط" : c.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

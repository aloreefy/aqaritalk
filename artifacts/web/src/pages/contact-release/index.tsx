import { useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { CheckCircle, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetContactReleaseByProperty,
  useGetCommissionSettings,
  useRequestContactRelease,
  useAcknowledgeContactRelease,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getGetContactReleaseByPropertyQueryKey } from "@workspace/api-client-react";

export default function ContactReleasePage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: release, isLoading: releaseLoading } =
    useGetContactReleaseByProperty(propertyId);
  const { data: commissionSettings } = useGetCommissionSettings();
  const requestRelease = useRequestContactRelease();
  const acknowledge = useAcknowledgeContactRelease();

  async function handleRequest() {
    const r = await requestRelease.mutateAsync({ data: { propertyId } });
    queryClient.setQueryData(
      getGetContactReleaseByPropertyQueryKey(propertyId),
      r,
    );
  }

  async function handleAcknowledge() {
    if (!release || !("id" in release)) return;
    const role = user?.role === "seller" ? "seller" : "buyer";
    const updated = await acknowledge.mutateAsync({
      id: release.id,
      data: { role },
    });
    queryClient.setQueryData(
      getGetContactReleaseByPropertyQueryKey(propertyId),
      updated,
    );
  }

  if (releaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  const hasRelease = release && "id" in release;
  const isReleased = hasRelease && release.status === "released";
  const buyerPct = hasRelease
    ? release.commissionBuyerPct
    : (commissionSettings?.defaultBuyerPct ?? 2.5);
  const sellerPct = hasRelease
    ? release.commissionSellerPct
    : (commissionSettings?.defaultSellerPct ?? 2.5);

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 pt-4">
        {t("contactRelease.title")}
      </h1>

      {/* Commission card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <p className="font-semibold text-gray-900">{t("contactRelease.commissionTitle")}</p>
        <div className="space-y-2">
          <CommissionRow
            label={t("contactRelease.buyerCommission", { pct: buyerPct })}
          />
          <CommissionRow
            label={t("contactRelease.sellerCommission", { pct: sellerPct })}
          />
        </div>
      </div>

      {/* Status */}
      {isReleased ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <p className="font-semibold">{t("contactRelease.released")}</p>
          </div>
          {release.sellerPhone && (
            <a
              href={`tel:${release.sellerPhone}`}
              className="flex items-center gap-2 text-sm text-green-700"
            >
              <Phone size={14} />
              <span className="dir-ltr">{release.sellerPhone}</span>
            </a>
          )}
          {release.buyerPhone && (
            <a
              href={`tel:${release.buyerPhone}`}
              className="flex items-center gap-2 text-sm text-green-700"
            >
              <Phone size={14} />
              <span className="dir-ltr">{release.buyerPhone}</span>
            </a>
          )}
        </div>
      ) : hasRelease ? (
        <StatusPending release={release} onAck={handleAcknowledge} loading={acknowledge.isPending} t={t} user={user} />
      ) : (
        <Button
          className="w-full h-12 text-base"
          onClick={handleRequest}
          disabled={requestRelease.isPending}
        >
          {requestRelease.isPending ? t("common.loading") : t("contactRelease.acknowledge")}
        </Button>
      )}
    </div>
  );
}

function CommissionRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle size={16} className="text-primary" />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

function StatusPending({
  release,
  onAck,
  loading,
  t,
  user,
}: {
  release: { status: string; buyerAckAt?: string | null; sellerAckAt?: string | null };
  onAck: () => void;
  loading: boolean;
  t: (k: string) => string;
  user: { role?: string } | null;
}) {
  const buyerAcked = !!release.buyerAckAt;
  const sellerAcked = !!release.sellerAckAt;
  const userRole = user?.role ?? "buyer";
  const myAcked = userRole === "seller" ? sellerAcked : buyerAcked;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <AckStatus label={t("contactRelease.pendingBuyer")} done={buyerAcked} />
        <AckStatus label={t("contactRelease.pendingSeller")} done={sellerAcked} />
      </div>
      {!myAcked && (
        <Button className="w-full h-12" onClick={onAck} disabled={loading}>
          {loading ? t("common.loading") : t("contactRelease.acknowledge")}
        </Button>
      )}
    </div>
  );
}

function AckStatus({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle size={16} className="text-green-500" />
      ) : (
        <Clock size={16} className="text-amber-400" />
      )}
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

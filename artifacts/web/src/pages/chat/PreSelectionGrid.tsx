import { useState } from "react";
import { Handshake, Building2, Wallet, BedDouble } from "lucide-react";

// Pre-selection grid (CONTEXT.md): a table-like card of pill chips on the
// empty chat screen. Tapping chips composes an Arabic message into the chat
// input via onCompose; the user sends it manually. Pure UI — no backend.
// Layout follows the approved Stitch "AI Chat - Selection Table" screen:
// one white rounded card, 4 hairline-divided rows, label cell + chip cell.

type Deal = "sale" | "rent";

const DEALS: { key: Deal; label: string }[] = [
  { key: "sale", label: "شراء" },
  { key: "rent", label: "إيجار" },
];

const TYPES = [
  { key: "apartment", label: "شقة" },
  { key: "villa", label: "فيلا" },
  { key: "land_residential", label: "أرض" },
  { key: "shop", label: "تجاري" },
  { key: "chalet", label: "شاليه" },
];

// Price bands must match the transaction mode (sale = totals, rent = monthly).
const PRICE_BANDS: Record<Deal, { key: string; label: string; phrase: string }[]> = {
  sale: [
    { key: "lt50", label: "أقل من ٥٠ ألف", phrase: "بسعر أقل من ٥٠ ألف دينار" },
    { key: "50-100", label: "٥٠–١٠٠ ألف", phrase: "بسعر بين ٥٠ و١٠٠ ألف دينار" },
    { key: "100-200", label: "١٠٠–٢٠٠ ألف", phrase: "بسعر بين ١٠٠ و٢٠٠ ألف دينار" },
    { key: "gt200", label: "أكثر من ٢٠٠ ألف", phrase: "بسعر أكثر من ٢٠٠ ألف دينار" },
  ],
  rent: [
    { key: "lt300", label: "أقل من ٣٠٠", phrase: "بإيجار أقل من ٣٠٠ دينار شهرياً" },
    { key: "300-500", label: "٣٠٠–٥٠٠", phrase: "بإيجار بين ٣٠٠ و٥٠٠ دينار شهرياً" },
    { key: "gt500", label: "أكثر من ٥٠٠", phrase: "بإيجار أكثر من ٥٠٠ دينار شهرياً" },
  ],
};

const ROOMS = [
  { key: "1", label: "١", phrase: "غرفة واحدة" },
  { key: "2", label: "٢", phrase: "غرفتان" },
  { key: "3", label: "٣", phrase: "٣ غرف" },
  { key: "4+", label: "٤+", phrase: "٤ غرف أو أكثر" },
];

type Selection = {
  deal: Deal | null;
  type: string | null;
  price: string | null;
  rooms: string | null;
};

function compose(sel: Selection): string {
  const type = TYPES.find((t) => t.key === sel.type);
  const parts: string[] = [`بدي ${type ? type.label : "عقار"}`];
  if (sel.deal) parts.push(sel.deal === "sale" ? "للشراء" : "للإيجار");
  if (sel.deal && sel.price) {
    const band = PRICE_BANDS[sel.deal].find((b) => b.key === sel.price);
    if (band) parts.push(band.phrase);
  }
  const room = ROOMS.find((r) => r.key === sel.rooms);
  const base = parts.join(" ");
  return room ? `${base}، ${room.phrase}` : base;
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:border-primary/50"
      }`}
    >
      {label}
    </button>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-16 shrink-0 flex flex-col items-center gap-1 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
      </div>
      <div className="flex-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

export default function PreSelectionGrid({
  onCompose,
}: {
  onCompose: (text: string) => void;
}) {
  const [sel, setSel] = useState<Selection>({
    deal: null,
    type: null,
    price: null,
    rooms: null,
  });

  function update(patch: Partial<Selection>) {
    const next = { ...sel, ...patch };
    // Price bands are deal-specific — switching deal resets the price pick.
    if (patch.deal !== undefined && patch.deal !== sel.deal) next.price = null;
    setSel(next);
    const any = next.deal || next.type || next.price || next.rooms;
    onCompose(any ? compose(next) : "");
  }

  function toggle<K extends keyof Selection>(key: K, value: Selection[K]) {
    update({ [key]: sel[key] === value ? null : value } as Partial<Selection>);
  }

  const bands = PRICE_BANDS[sel.deal ?? "sale"];

  return (
    <div className="px-4 pb-2">
      <p className="text-xs text-muted-foreground text-center mb-2">
        اختر من الخيارات أو اكتب طلبك مباشرة
      </p>
      <div className="bg-card rounded-2xl border border-border shadow-sm divide-y divide-border">
        <Row icon={<Handshake size={16} />} label="نوع الصفقة">
          {DEALS.map((d) => (
            <Chip
              key={d.key}
              label={d.label}
              selected={sel.deal === d.key}
              onClick={() => toggle("deal", d.key)}
            />
          ))}
        </Row>
        <Row icon={<Building2 size={16} />} label="نوع العقار">
          {TYPES.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              selected={sel.type === t.key}
              onClick={() => toggle("type", t.key)}
            />
          ))}
        </Row>
        <Row icon={<Wallet size={16} />} label={sel.deal === "rent" ? "الإيجار (دينار)" : "السعر (دينار)"}>
          {bands.map((b) => (
            <Chip
              key={b.key}
              label={b.label}
              selected={sel.price === b.key}
              onClick={() => toggle("price", b.key)}
            />
          ))}
        </Row>
        <Row icon={<BedDouble size={16} />} label="الغرف">
          {ROOMS.map((r) => (
            <Chip
              key={r.key}
              label={r.label}
              selected={sel.rooms === r.key}
              onClick={() => toggle("rooms", r.key)}
            />
          ))}
        </Row>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        عدّل النص أو اضغط إرسال
      </p>
    </div>
  );
}

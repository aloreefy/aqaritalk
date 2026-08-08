import { Phone, Mail, MessageCircle, Clock } from "lucide-react";
import type { ContactCardContact } from "@workspace/api-client-react";

// Customer-service contact card the broker attaches via get_contact_info.
// Company support only — owner contact stays behind the contact-release gate
// (docs/adr/0002).
export default function ChatContactCard({ contact }: { contact: ContactCardContact }) {
  const rows = [
    contact.phone && {
      icon: <Phone size={16} />,
      label: "الهاتف",
      value: contact.phone,
      href: `tel:${contact.phone}`,
    },
    contact.whatsapp && {
      icon: <MessageCircle size={16} />,
      label: "واتساب",
      value: contact.whatsapp,
      href: `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`,
    },
    contact.email && {
      icon: <Mail size={16} />,
      label: "البريد",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
    contact.hours && {
      icon: <Clock size={16} />,
      label: "الدوام",
      value: contact.hours,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    label: string;
    value: string;
    href?: string;
  }[];

  if (rows.length === 0) return null;

  return (
    <div className="w-[260px] bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="bg-primary/10 px-4 py-2.5">
        <p className="text-sm font-semibold text-primary">خدمة عملاء عقاري توك</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="text-primary shrink-0">{row.icon}</span>
            <span className="text-muted-foreground text-xs w-12 shrink-0">{row.label}</span>
            {row.href ? (
              <a
                href={row.href}
                dir="ltr"
                className="text-foreground font-medium truncate hover:text-primary"
              >
                {row.value}
              </a>
            ) : (
              <span className="text-foreground font-medium truncate">{row.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

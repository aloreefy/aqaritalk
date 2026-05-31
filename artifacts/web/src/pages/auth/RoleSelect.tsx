import { useTranslation } from "react-i18next";
import { Search, Home, Briefcase } from "lucide-react";

interface Props {
  value: "buyer" | "seller" | "broker";
  onChange: (v: "buyer" | "seller" | "broker") => void;
}

const roles = [
  { value: "buyer" as const, icon: Search, labelKey: "auth.roleBuyer" },
  { value: "seller" as const, icon: Home, labelKey: "auth.roleSeller" },
  { value: "broker" as const, icon: Briefcase, labelKey: "auth.roleBroker" },
];

export default function RoleSelect({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {roles.map(({ value: rv, icon: Icon, labelKey }) => (
        <button
          key={rv}
          type="button"
          onClick={() => onChange(rv)}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
            value === rv
              ? "border-primary bg-primary/5 text-primary"
              : "border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <Icon size={24} />
          <span className="font-medium text-base">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}

import { useRef, KeyboardEvent, ClipboardEvent, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  length: number;
  onComplete: (code: string) => void;
  loading: boolean;
}

export default function OtpInput({ length, onComplete, loading }: Props) {
  const { t } = useTranslation();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const values = useRef<string[]>(Array(length).fill(""));
  const [filled, setFilled] = useState(0);

  function recount() {
    setFilled(values.current.filter(Boolean).length);
  }

  function update(index: number, val: string) {
    values.current[index] = val;
    recount();
    const code = values.current.join("");
    if (code.length === length) {
      onComplete(code);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Backspace") {
      if (!values.current[i] && i > 0) {
        inputs.current[i - 1]?.focus();
      }
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>, i: number) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    e.target.value = val;
    update(i, val);
    if (val && i < length - 1) {
      inputs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    text.split("").forEach((ch, i) => {
      values.current[i] = ch;
      if (inputs.current[i]) inputs.current[i]!.value = ch;
    });
    recount();
    inputs.current[Math.min(text.length, length - 1)]?.focus();
    if (text.length === length) onComplete(text);
  }

  const complete = filled === length;

  return (
    <div className="space-y-8">
      {/* OTP boxes — Stitch style */}
      <div className="flex justify-between items-center gap-2" dir="ltr">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            autoFocus={i === 0}
            type="text"
            maxLength={1}
            inputMode="numeric"
            className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-input bg-card text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => handleKey(e, i)}
            onChange={(e) => handleInput(e, i)}
            onPaste={handlePaste}
          />
        ))}
      </div>

      {/* Primary action */}
      <button
        className="w-full h-14 bg-primary text-primary-foreground font-semibold text-lg rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
        disabled={loading || !complete}
        onClick={() => onComplete(values.current.join(""))}
        type="button"
      >
        {loading ? t("common.loading") : t("auth.verify")}
      </button>
    </div>
  );
}

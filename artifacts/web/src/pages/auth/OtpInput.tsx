import { useRef, KeyboardEvent, ClipboardEvent } from "react";
import { Button } from "@/components/ui/button";
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

  function update(index: number, val: string) {
    values.current[index] = val;
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
    inputs.current[Math.min(text.length, length - 1)]?.focus();
    if (text.length === length) onComplete(text);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center" dir="ltr">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="tel"
            maxLength={1}
            className="w-11 h-14 border-2 border-gray-200 rounded-lg text-center text-xl font-bold focus:border-primary focus:outline-none transition-colors"
            onKeyDown={(e) => handleKey(e, i)}
            onChange={(e) => handleInput(e, i)}
            onPaste={handlePaste}
            inputMode="numeric"
          />
        ))}
      </div>
      <Button
        className="w-full h-12 text-base"
        disabled={loading}
        onClick={() => onComplete(values.current.join(""))}
        type="button"
      >
        {loading ? t("common.loading") : t("auth.verify")}
      </Button>
    </div>
  );
}

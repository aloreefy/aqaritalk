import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

interface WizardProgressProps {
  currentStep: 1 | 2 | 3 | 4;
}

export default function WizardProgress({ currentStep }: WizardProgressProps) {
  const { t } = useTranslation();

  const steps = [
    t("wizard.step1"),
    t("wizard.step2"),
    t("wizard.step3"),
    t("wizard.step4"),
  ];

  // Progress line fill: from step 1 up to the active step
  const fillPct = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="bg-card border-b border-border px-6 pt-5 pb-4">
      <div className="relative flex items-center justify-between mb-2">
        {/* Base track */}
        <div className="absolute inset-x-0 top-3 h-0.5 bg-muted -z-0" aria-hidden />
        {/* Emerald progress fill (RTL-aware: pin to the right) */}
        <div
          className="absolute right-0 top-3 h-0.5 bg-primary -z-0 transition-all duration-300"
          style={{ width: `${fillPct}%` }}
          aria-hidden
        />

        {steps.map((label, i) => {
          const step = (i + 1) as 1 | 2 | 3 | 4;
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          return (
            <div key={step} className="flex flex-col items-center gap-1 z-10">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary text-primary-foreground outline outline-2 outline-offset-2 outline-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : step}
              </div>
              <span
                className={`text-[11px] text-center leading-tight transition-colors ${
                  isActive
                    ? "text-primary font-bold"
                    : isDone
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        الخطوة {currentStep} من {steps.length}
      </p>
    </div>
  );
}

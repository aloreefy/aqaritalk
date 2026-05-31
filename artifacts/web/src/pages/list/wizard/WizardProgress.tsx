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

  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3">
      <div className="flex items-start justify-between">
        {steps.map((label, i) => {
          const step = (i + 1) as 1 | 2 | 3 | 4;
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          const isLast = step === 4;
          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              {!isLast && (
                <div
                  className={`absolute top-3.5 right-0 left-1/2 h-[2px] -z-0 transition-colors ${
                    isDone ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-md"
                    : isDone
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : step}
              </div>
              <p
                className={`text-[10px] text-center leading-tight transition-colors ${
                  isActive ? "text-primary font-semibold" : isDone ? "text-green-600" : "text-gray-400"
                }`}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

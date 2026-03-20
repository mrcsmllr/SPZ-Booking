"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

interface StepperProps {
  steps: { id: string; label: string }[];
  currentIndex: number;
  onStepClick?: (stepId: string, index: number) => void;
}

export function Stepper({ steps, currentIndex, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Buchungsschritte" className="w-full">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = isCompleted || isCurrent;

          return (
            <li key={step.id} className="flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id, index)}
                disabled={!isClickable}
                className={cn(
                  "flex w-full flex-col items-center gap-1 transition-opacity",
                  isClickable ? "cursor-pointer opacity-100 hover:opacity-80" : "cursor-default opacity-100"
                )}
              >
                {/* Linie + Kreis */}
                <div className="flex w-full items-center justify-center">
                  {/* Linke Linie – immer vorhanden, beim ersten Element unsichtbar */}
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      index === 0
                        ? "bg-transparent"
                        : isCompleted
                          ? "bg-coral"
                          : "bg-white/20"
                    )}
                  />

                  {/* Kreis */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                      isCompleted
                        ? "bg-coral text-white"
                        : isCurrent
                          ? "border-2 border-coral bg-landhaus-brown text-coral"
                          : "border-2 border-white/20 bg-landhaus-brown/50 text-white/40",
                      isClickable && !isCurrent && "hover:ring-2 hover:ring-coral/30"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Rechte Linie – immer vorhanden, beim letzten Element unsichtbar */}
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      index === steps.length - 1
                        ? "bg-transparent"
                        : isCompleted
                          ? "bg-coral"
                          : "bg-white/20"
                    )}
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight sm:text-xs",
                    isCurrent
                      ? "font-semibold text-coral-light"
                      : isCompleted
                        ? "text-gray-300"
                        : "text-white/40"
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

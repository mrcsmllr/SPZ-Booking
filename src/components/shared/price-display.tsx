import { formatMoney } from "@/lib/utils/date";

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriceDisplay({
  amount,
  currency = "EUR",
  className = "",
  size = "md",
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl font-bold",
  };

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      {formatMoney(amount, currency)}
    </span>
  );
}

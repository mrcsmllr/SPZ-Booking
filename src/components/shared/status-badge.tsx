import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "held" | "secondary" }
> = {
  HOLD: { label: "Gehalten", variant: "held" },
  PENDING: { label: "Ausstehend", variant: "warning" },
  CONFIRMED: { label: "Bestätigt", variant: "success" },
  CANCELLED: { label: "Storniert", variant: "destructive" },
  EXPIRED: { label: "Abgelaufen", variant: "secondary" },
  SUCCEEDED: { label: "Bezahlt", variant: "success" },
  FAILED: { label: "Fehlgeschlagen", variant: "destructive" },
  REFUNDED: { label: "Erstattet", variant: "secondary" },
  PARTIALLY_REFUNDED: { label: "Teilweise erstattet", variant: "warning" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: "secondary" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

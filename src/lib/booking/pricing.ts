import { Decimal } from "@prisma/client/runtime/library";

export interface PriceCalculation {
  pricePerPerson: number;
  personCount: number;
  subtotal: number;
  addOns: {
    addOnId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    priceType: "FLAT" | "PER_PERSON";
  }[];
  addOnsTotal: number;
  total: number;
}

/**
 * Berechnet den Gesamtpreis einer Buchung.
 */
export function calculatePrice(params: {
  pricePerPerson: number | Decimal;
  personCount: number;
  addOns: {
    addOnId: string;
    name: string;
    quantity: number;
    price: number | Decimal;
    priceType: "FLAT" | "PER_PERSON";
  }[];
}): PriceCalculation {
  const ppp = Number(params.pricePerPerson);
  const subtotal = ppp * params.personCount;

  const addOns = params.addOns.map((addon) => {
    const unitPrice = Number(addon.price);
    let total: number;

    if (addon.priceType === "PER_PERSON") {
      total = unitPrice * params.personCount * addon.quantity;
    } else {
      total = unitPrice * addon.quantity;
    }

    return {
      addOnId: addon.addOnId,
      name: addon.name,
      quantity: addon.quantity,
      unitPrice,
      total: Math.round(total * 100) / 100,
      priceType: addon.priceType,
    };
  });

  const addOnsTotal = addOns.reduce((sum, a) => sum + a.total, 0);
  const total = Math.round((subtotal + addOnsTotal) * 100) / 100;

  return {
    pricePerPerson: ppp,
    personCount: params.personCount,
    subtotal: Math.round(subtotal * 100) / 100,
    addOns,
    addOnsTotal: Math.round(addOnsTotal * 100) / 100,
    total,
  };
}

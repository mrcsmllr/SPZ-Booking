export interface FloorplanTable {
  id: string;
  label: string;
  seats: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
  shape: "RECTANGLE" | "ROUND" | "SQUARE";
  isActive: boolean;
  status: "FREE" | "HELD" | "RESERVED" | "BLOCKED";
  booking: {
    bookingNumber: string;
    companyName: string;
    personCount: number;
  } | null;
}

export interface FloorplanArea {
  id: string;
  name: string;
  tables: FloorplanTable[];
}

export interface FloorplanData {
  areas: FloorplanArea[];
}

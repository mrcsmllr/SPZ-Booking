import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "StadtParkZauber – Weihnachtsfeier buchen",
  description:
    "Buchen Sie Ihre Firmen-Weihnachtsfeier im StadtParkZauber. Gruppenbuchung für 10-300 Personen mit Tischreservierung.",
  openGraph: {
    title: "StadtParkZauber – Weihnachtsfeier buchen",
    description:
      "Buchen Sie Ihre Firmen-Weihnachtsfeier im StadtParkZauber.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`${inter.variable} ${playfair.variable} ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Weihnachtsfeier buchen – StadtParkZauber",
  description:
    "Reservieren Sie jetzt Ihre Firmen-Weihnachtsfeier. Einfach Personenanzahl, Datum und Extras wählen.",
};

function OpeningHoursBanner() {
  return (
    <div className="border-b border-white/10 bg-landhaus-green text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm">
        <Clock className="h-3.5 w-3.5 text-coral-light" />
        <span className="font-medium">Öffnungszeiten:</span>
        <span className="hidden sm:inline">
          Montag - Freitag: 16:00 - 22:00 Uhr, Samstag: 14:00 - 22:00 Uhr, Sonntag: 12:00 - 20:00 Uhr
        </span>
        {/* Mobile: kompaktere Darstellung */}
        <span className="sm:hidden">
          Mo–Fr 16:00–22:00 · Sa 14:00–22:00 · So 12:00–20:00
        </span>
      </div>
    </div>
  );
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-landhaus-brown via-gray-800 to-landhaus-brown">
      {/* Öffnungszeiten Banner */}
      <OpeningHoursBanner />

      {/* Header */}
      <header className="border-b border-white/10 bg-landhaus-green/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-4">
          <Link
            href="/"
            className="block hover:opacity-90 transition-opacity"
            aria-label="Zur Startseite StadtParkZauber"
          >
            <Image
              src="/logo-stadtparkzauber.png"
              alt="StadtParkZauber Logo"
              width={340}
              height={128}
              className="h-16 w-auto md:h-18"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-400">
        <div className="mx-auto max-w-4xl px-4">
          <p>© {new Date().getFullYear()} StadtParkZauber. Alle Rechte vorbehalten.</p>
          <p className="mt-1">
            <a href="#" className="underline hover:text-coral-light">
              Datenschutz
            </a>
            {" · "}
            <a href="#" className="underline hover:text-coral-light">
              AGB
            </a>
            {" · "}
            <a href="#" className="underline hover:text-coral-light">
              Impressum
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

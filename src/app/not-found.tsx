import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <h2 className="mb-4 font-serif text-2xl font-bold text-landhaus-brown">
          Seite nicht gefunden
        </h2>
        <p className="mb-6 text-landhaus-brown-light/70">
          Die angeforderte Seite existiert leider nicht.
        </p>
        <Link
          href="/buchen"
          className="inline-block rounded-lg bg-coral px-6 py-3 text-white transition-colors hover:bg-coral-light"
        >
          Zur Buchung
        </Link>
      </div>
    </div>
  );
}

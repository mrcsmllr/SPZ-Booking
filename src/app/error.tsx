"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <h2 className="mb-4 font-serif text-2xl font-bold text-landhaus-brown">
          Etwas ist schiefgelaufen
        </h2>
        <p className="mb-6 text-landhaus-brown-light/70">
          Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-coral px-6 py-3 text-white transition-colors hover:bg-coral-light"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#1a1a1a" }}>
            Ein unerwarteter Fehler ist aufgetreten
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem", maxWidth: "400px" }}>
            Bitte versuchen Sie es erneut. Falls das Problem weiterhin besteht,
            kontaktieren Sie uns.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#2d5016",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}

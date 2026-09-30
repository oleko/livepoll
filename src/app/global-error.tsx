"use client";

/**
 * Last resort: an error thrown by the root layout itself, which the per-segment
 * boundary cannot catch because it sits below it. Replaces the whole document,
 * so it carries its own <html>/<body> and cannot rely on any app styling.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#fff",
          color: "#18181b",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Приложение не запустилось
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#52525b", margin: 0, maxWidth: "28rem" }}>
          Мы уже видим эту ошибку. Попробуйте обновить страницу.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#a1a1aa", fontFamily: "monospace", margin: 0 }}>
            код ошибки: {error.digest}
          </p>
        )}
        <button
          onClick={() => unstable_retry()}
          style={{
            border: 0,
            borderRadius: "0.5rem",
            background: "#4f46e5",
            color: "#fff",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Попробовать снова
        </button>
      </body>
    </html>
  );
}

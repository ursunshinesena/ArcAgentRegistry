import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function GlobalNotFound() {
  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          textAlign: "center",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            color: "var(--text-disabled)",
            letterSpacing: "-0.04em",
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            maxWidth: 360,
            lineHeight: 1.6,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist. Head back to the
          registry.
        </p>

        <Link href="/" className="btn btn-primary" id="global-not-found-btn">
          Go to Registry
        </Link>
      </div>
    </div>
  );
}

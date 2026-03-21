import Link from "next/link";

export default function AgentNotFound() {
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
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-tertiary)",
            fontSize: "24px",
            fontFamily: "var(--font-mono)",
            marginBottom: "var(--space-2)",
          }}
        >
          ?
        </div>

        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Agent not found
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            maxWidth: 360,
            lineHeight: 1.6,
          }}
        >
          This token ID doesn&apos;t exist in the Arc Identity Registry, or it
          may not have been indexed yet.
        </p>

        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Link href="/" className="btn btn-primary" id="not-found-back-btn">
            Browse Registry
          </Link>
          <a
            href="https://testnet.arcscan.app/token/0x8004A818BFB912233c491871b3d84c89A494BD9e"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            id="not-found-arcscan-btn"
          >
            ArcScan ↗
          </a>
        </div>
      </div>
    </div>
  );
}

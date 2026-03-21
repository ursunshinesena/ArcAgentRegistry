import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchAgentsByOwner,
  fetchValidatedAgentTags,
  fetchAgentReputationMap,
  agentDisplayName,
  agentTypeLabel,
  resolveIpfs,
  shortAddress,
  formatValidationTag,
  IDENTITY_REGISTRY,
} from "@/lib/api";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `${shortAddress(address)} — My Agents`,
    description: `AI agents owned by ${address} on Arc Testnet`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  const [agents, agentTags, reputationMap] = await Promise.all([
    fetchAgentsByOwner(address),
    fetchValidatedAgentTags().catch(() => ({} as Record<number, string[]>)),
    fetchAgentReputationMap().catch(() => ({} as Record<number, number>)),
  ]);

  const kycCount = agents.filter((a) => (agentTags[Number(a.id)]?.length ?? 0) > 0).length;
  const repCount = agents.filter((a) => reputationMap[Number(a.id)] !== undefined).length;

  return (
    <div className="container">
      {/* Breadcrumb */}
      <nav
        className="breadcrumb"
        style={{ padding: "var(--space-6) 0 var(--space-5)" }}
        aria-label="Breadcrumb"
      >
        <Link href="/profile" className="breadcrumb-link" id="breadcrumb-profile">
          My Agents
        </Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
          {shortAddress(address, 6)}
        </span>
      </nav>

      {/* Header */}
      <div className="detail-section" style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>WALLET</div>
            <div
              style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", wordBreak: "break-all" }}
              id="profile-address"
            >
              {address}
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <a href={`https://testnet.arcscan.app/address/${address}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" id="view-address-arcscan">
              ArcScan ↗
            </a>
            <Link href="/profile" className="btn btn-ghost btn-sm" id="change-address-link">Change</Link>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "flex", gap: "var(--space-6)", marginTop: "var(--space-5)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
          {[
            { label: "Agents Owned",    value: agents.length,                                  id: "profile-agent-count" },
            { label: "With Metadata",   value: agents.filter((a) => a.metadata !== null).length, id: "profile-meta-count" },
            { label: "KYC Verified",    value: kycCount,                                       id: "profile-kyc-count" },
            { label: "With Reputation", value: repCount,                                       id: "profile-rep-count" },
          ].map(({ label, value, id }) => (
            <div key={id}>
              <div className="stat-label" style={{ marginBottom: "var(--space-1)" }}>{label}</div>
              <div style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--text-primary)" }} id={id}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent list */}
      {agents.length === 0 ? (
        <div className="empty-state" role="status">
          <div className="empty-state-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a5 5 0 1 0 0 10A5 5 0 0 0 8 1zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" />
              <path d="M8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
            </svg>
          </div>
          <p className="empty-state-title">No agents found</p>
          <p className="empty-state-desc">This wallet has not registered any AI agents on Arc Testnet.</p>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: "var(--space-4)" }} id="browse-registry-link">Browse Registry</Link>
        </div>
      ) : (
        <div className="agent-grid" id="profile-agent-grid" role="list">
          {agents.map((agent) => {
            const name      = agentDisplayName(agent);
            const typeLabel = agentTypeLabel(agent);
            const imageUrl  = resolveIpfs(agent.image_url);
            const tags      = agentTags[Number(agent.id)] ?? [];
            const repScore  = reputationMap[Number(agent.id)];

            return (
              <div
                key={agent.id}
                className="card"
                id={`profile-agent-card-${agent.id}`}
                role="listitem"
              >
                <article className="agent-card" style={{ padding: 0 }}>
                  <Link
                    href={`/agent/${agent.id}`}
                    className="agent-card-link-wrapper"
                    style={{ padding: "var(--space-5)", display: "block", color: "inherit", textDecoration: "none" }}
                    aria-label={`View details for ${name}`}
                  >
                    <div className="agent-card-header">
                      <div className="agent-avatar">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={name} width={40} height={40} style={{ objectFit: "cover", width: "100%", height: "100%" }} loading="lazy" decoding="async" />
                        ) : (
                          name.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "?"
                        )}
                      </div>
                      <div className="agent-card-meta">
                        <div className="agent-card-id">#{agent.id}</div>
                        <h2 className="agent-card-name">{name}</h2>
                      </div>
                      <span className="tag tag-type-default">{typeLabel}</span>
                    </div>

                    {agent.metadata?.description && (
                      <p className="agent-card-description" style={{ marginTop: "var(--space-4)" }}>
                        {agent.metadata.description}
                      </p>
                    )}
                  </Link>

                  <div className="agent-card-footer" style={{ margin: "0 var(--space-5) var(--space-5)", paddingTop: "var(--space-4)" }}>
                    <a
                      href={`https://testnet.arcscan.app/token/${IDENTITY_REGISTRY}/instance/${agent.id}`}
                      target="_blank" rel="noopener noreferrer" className="external-link"
                    >
                      ArcScan ↗
                    </a>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      {tags.map((tag) => (
                        <span key={tag} className="tag tag-verified" title={`Validation: ${tag}`}>
                          {formatValidationTag(tag)}
                        </span>
                      ))}
                      {repScore !== undefined && (
                        <span className="tag tag-reputation" title={`Reputation: ${repScore}/100`}>
                          ★ {repScore}
                        </span>
                      )}
                      {agent.metadata?.active === true && (
                        <span className="tag tag-success">active</span>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: "var(--space-16)" }} />
    </div>
  );
}

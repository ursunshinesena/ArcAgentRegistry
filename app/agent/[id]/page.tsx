import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchAgentById,
  fetchValidationSummary,
  fetchReputationSummary,
  fetchAgentActivity,
  agentDisplayName,
  agentTypeLabel,
  resolveIpfs,
  shortAddress,
  formatValidationTag,
  IDENTITY_REGISTRY,
  VALIDATION_REGISTRY,
  REPUTATION_REGISTRY,
} from "@/lib/api";
import AgentDetailImage from "./AgentDetailImage";
import CopyAddressBtn from "./CopyAddressBtn";
import { ShareAgent } from "@/components/ShareAgent";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const agent = await fetchAgentById(id);
    const name = agentDisplayName(agent);
    const description = agent.metadata?.description ?? `Agent #${id} on Arc Testnet`;
    const image = resolveIpfs(agent.image_url);
    return {
      title: name,
      description,
      openGraph: {
        title: `${name} · Arc Agent Registry`,
        description,
        type: "website",
        ...(image ? { images: [{ url: image, width: 400, height: 400, alt: name }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: name,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return { title: `Agent #${id}` };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let agent;
  try {
    agent = await fetchAgentById(id);
  } catch {
    notFound();
  }

  // Fetch all on-chain data in parallel (non-blocking)
  const [validation, reputation, activity] = await Promise.all([
    fetchValidationSummary(id).catch(() => null),
    fetchReputationSummary(id).catch(() => null),
    fetchAgentActivity(id).catch(() => []),
  ]);

  const name = agentDisplayName(agent);
  const typeLabel = agentTypeLabel(agent);
  const imageUrl = resolveIpfs(agent.image_url);
  const ownerAddress = agent.owner?.hash ?? "";
  const arcscanUrl = `https://testnet.arcscan.app/token/${IDENTITY_REGISTRY}/instance/${id}`;

  return (
    <div className="container">
      {/* Breadcrumb */}
      <nav
        className="breadcrumb"
        style={{ padding: "var(--space-6) 0 var(--space-5)" }}
        aria-label="Breadcrumb"
      >
        <Link href="/" className="breadcrumb-link" id="breadcrumb-home">
          Registry
        </Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Agent #{id}</span>
      </nav>

      {/* Main content */}
      <div className="detail-grid">
        {/* LEFT: info */}
        <div>
          {/* Agent header */}
          <div
            className="detail-section"
            style={{ marginBottom: "var(--space-4)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-4)",
              }}
            >
              {/* Image */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "24px",
                }}
              >
                <AgentDetailImage imageUrl={imageUrl} name={name} />
              </div>

              {/* Name & type */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-tertiary)",
                    marginBottom: "4px",
                  }}
                >
                  #{id}
                </div>
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {name}
                </h1>
                
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span className="tag tag-type-default">{typeLabel}</span>
                  {agent.metadata?.active === true && (
                    <span className="tag tag-success">active</span>
                  )}
                  {/* Show each on-chain validation tag in the header */}
                  {validation?.tags.map((tag) => (
                    <span key={tag} className="tag tag-verified" title={`Validation: ${tag}`}>
                      {formatValidationTag(tag)}
                    </span>
                  ))}
                </div>

                {/* Social Links */}
                {(agent.metadata?.links || agent.metadata?.twitter || agent.metadata?.x || agent.metadata?.telegram || agent.metadata?.website || agent.external_app_url) && (
                  <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
                    {(agent.metadata?.links?.x || agent.metadata?.links?.twitter || agent.metadata?.twitter || agent.metadata?.x) && (
                      <a 
                        href={agent.metadata?.links?.x || agent.metadata?.links?.twitter || agent.metadata?.twitter || agent.metadata?.x} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="external-link" 
                        title="X / Twitter"
                        style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        X
                      </a>
                    )}
                    {(agent.metadata?.links?.telegram || agent.metadata?.telegram) && (
                      <a 
                        href={agent.metadata?.links?.telegram || agent.metadata?.telegram} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="external-link" 
                        title="Telegram"
                        style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        Telegram
                      </a>
                    )}
                    {(agent.metadata?.links?.website || agent.metadata?.website || agent.external_app_url) && (
                      <a 
                        href={agent.metadata?.links?.website || agent.metadata?.website || agent.external_app_url!} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="external-link" 
                        title="Website"
                        style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        Website
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexShrink: 0 }}>
                <ShareAgent 
                  agent={agent} 
                  validation={validation} 
                  reputation={reputation} 
                />
                <a
                  href={arcscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  id="view-on-arcscan"
                >
                  ArcScan ↗
                </a>
              </div>
            </div>

            {/* Description */}
            {agent.metadata?.description && (
              <p
                style={{
                  marginTop: "var(--space-5)",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  paddingTop: "var(--space-5)",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                {agent.metadata.description}
              </p>
            )}
          </div>

          {/* Activity Timeline */}
          {activity.length > 0 && (
            <div style={{ marginBottom: "var(--space-8)" }}>
              <h2
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "var(--space-4)",
                }}
              >
                Activity Timeline
              </h2>
              <div className="detail-section" style={{ padding: 0, overflow: "hidden" }}>
                {activity.map((item, i) => (
                  <div
                    key={item.hash + i}
                    className="activity-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) var(--space-5)",
                      borderBottom: i < activity.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    {/* Registry dot */}
                    <span
                      className={`activity-dot activity-dot-${item.registry}`}
                      title={item.registry}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                          {item.method}
                        </span>
                        {item.score !== undefined && (
                          <span className="tag tag-verified" style={{ fontSize: "11px" }}>
                            {item.score}/100
                          </span>
                        )}
                        {item.tag && (
                          <span className="tag tag-type-default" style={{ fontSize: "11px" }}>
                            {formatValidationTag(item.tag)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                        {new Date(item.timestamp).toLocaleString()} ·{" "}
                        {item.from && (
                          <>
                            <Link href={`/validator/${item.from}`} className="external-link" style={{ color: "var(--text-secondary)" }}>
                              from {shortAddress(item.from, 6)}
                            </Link>
                            {" · "}
                          </>
                        )}
                        <a
                          href={`https://testnet.arcscan.app/tx/${item.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="external-link"
                        >
                          {shortAddress(item.hash, 6)} ↗
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {agent.metadata?.capabilities && agent.metadata.capabilities.length > 0 && (
            <div className="detail-section" style={{ marginBottom: "var(--space-4)" }}>
              <div className="detail-section-title">Capabilities</div>
              <div className="capability-list">
                {agent.metadata.capabilities.map((cap) => (
                  <span key={cap} className="capability-chip">
                    {cap.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: sidebar */}
        <div>
          {/* Performance Chart */}
          <div 
            className="card" 
            style={{ 
              padding: "var(--space-6)",
              backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.05), transparent)',
              border: '1px solid rgba(34, 197, 94, 0.1)',
              marginBottom: 'var(--space-4)'
            }}
          >
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Performance Trend
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#fbe7ef', fontWeight: 600 }}>
                   <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#fbe7ef', boxShadow: '0 0 5px #fbe7ef' }}></span>
                   Live Data
                </div>
             </div>
             
             <div style={{ width: '100%', height: '100px', position: 'relative' }}>
                 {activity.filter(a => a.score !== undefined).length > 0 ? (
                   <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor:'rgba(251, 231, 239, 0.25)', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor:'rgba(251, 231, 239, 0)', stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      {(() => {
                         const scores = activity.filter(a => a.score !== undefined).reverse();
                         
                         if (scores.length === 1) {
                           const y = 100 - (scores[0].score || 0);
                           return (
                             <>
                               <line x1="0" y1={y} x2="300" y2={y} stroke="#fbe7ef" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                               <circle cx="150" cy={y} r="3" fill="#fbe7ef" filter="url(#glow)" />
                               <text x="150" y={y - 12} textAnchor="middle" fill="#fbe7ef" fontSize="10" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{scores[0].score}%</text>
                             </>
                           );
                         }

                         const rawPoints = scores.map((s, i) => ({ 
                           x: (i / (scores.length - 1)) * 300, 
                           y: 100 - (s.score || 0) 
                         }));
                         
                         let d = `M ${rawPoints[0].x} ${rawPoints[0].y}`;
                         for (let i = 0; i < rawPoints.length - 1; i++) {
                            const p0 = rawPoints[i];
                            const p1 = rawPoints[i+1];
                            const cp1x = p0.x + (p1.x - p0.x) / 3;
                            const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
                            d += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
                         }

                         const fillD = `${d} L 300 100 L 0 100 Z`;
                         
                         return (
                           <>
                             <path d={fillD} fill="url(#grad)" stroke="none" />
                             <path d={d} fill="none" stroke="#fbe7ef" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
                             {rawPoints.map((p, i) => (
                               <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#fbe7ef" />
                             ))}
                           </>
                         );
                      })()}
                   </svg>
                 ) : (
                   <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '11px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <div style={{ opacity: 0.5, marginBottom: '4px' }}>Performance data pending...</div>
                   </div>
                 )}
              </div>
          </div>

          {/* Ownership */}
          <div className="detail-section" style={{ marginBottom: "var(--space-4)" }}>
            <div className="detail-section-title">Ownership</div>

            <div className="detail-row">
              <span className="detail-row-label">Owner</span>
              <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                <Link
                  href={`/profile/${ownerAddress}`}
                  id={`profile-link-owner`}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}
                >
                  {shortAddress(ownerAddress, 6)}
                </Link>
                {ownerAddress && <CopyAddressBtn text={ownerAddress} label="Address copied!" />}
                {agent.owner?.is_contract && (
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: 2 }}>
                    contract
                  </div>
                )}
              </div>
            </div>

            {agent.owner?.implementations &&
              agent.owner.implementations.length > 0 && (
                <div className="detail-row">
                  <span className="detail-row-label">Wallet type</span>
                  <span className="detail-row-value" style={{ fontSize: "12px" }}>
                    {agent.owner.implementations[0].name}
                  </span>
                </div>
              )}
          </div>

          {/* Registry info */}
          <div className="detail-section" style={{ marginBottom: "var(--space-4)" }}>
            <div className="detail-section-title">Registry</div>

            <div className="detail-row">
              <span className="detail-row-label">Token ID</span>
              <span className="detail-row-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                #{id}
                <CopyAddressBtn text={id} label="ID copied!" />
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-row-label">Standard</span>
              <span className="detail-row-value">ERC-8004</span>
            </div>

            <div className="detail-row">
              <span className="detail-row-label">Contract</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                <a
                  href={`https://testnet.arcscan.app/address/${IDENTITY_REGISTRY}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
                >
                  {shortAddress(IDENTITY_REGISTRY, 6)} ↗
                </a>
                <CopyAddressBtn text={IDENTITY_REGISTRY} label="Contract copied!" />
              </span>
            </div>

            {agent.metadata?.x402Support !== undefined && (
              <div className="detail-row">
                <span className="detail-row-label">x402 Support</span>
                <span
                  className={`tag ${agent.metadata.x402Support ? "tag-success" : "tag-type-default"}`}
                >
                  {agent.metadata.x402Support ? "yes" : "no"}
                </span>
              </div>
            )}
          </div>

          {/* Trust */}
          {agent.metadata?.supportedTrust && agent.metadata.supportedTrust.length > 0 && (
            <div className="detail-section" style={{ marginBottom: "var(--space-4)" }}>
              <div className="detail-section-title">Trust Model</div>
              <div className="capability-list">
                {agent.metadata.supportedTrust.map((t: string) => (
                  <span key={t} className="capability-chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation */}
          <div className="detail-section" style={{ marginBottom: "var(--space-4)" }}>
            <div className="detail-section-title">Validation</div>

            {validation && validation.count > 0 ? (
              <>
                <div className="detail-row">
                  <span className="detail-row-label">Status</span>
                  {validation.isVerified ? (
                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {validation.tags.length > 0
                        ? validation.tags.map((tag) => (
                            <span key={tag} className="tag tag-verified">{formatValidationTag(tag)}</span>
                          ))
                        : <span className="tag tag-verified">✓ Verified</span>
                      }
                    </div>
                  ) : (
                    <span className="tag tag-type-default">Unverified</span>
                  )}
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Validations</span>
                  <span className="detail-row-value">{validation.count}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Avg Score</span>
                  <span className="detail-row-value">
                    <span
                      className="validation-score-bar-wrap"
                      title={`${validation.averageResponse}/100`}
                    >
                      <span className="vsb-track">
                        <span
                          className="validation-score-bar"
                          style={{ width: `${validation.averageResponse}%` }}
                        />
                      </span>
                      <span className="validation-score-label">
                        {validation.averageResponse}/100
                      </span>
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-tertiary)",
                  padding: "var(--space-3) 0",
                }}
              >
                No validations recorded on-chain.
              </div>
            )}
          </div>

          {/* Reputation */}
          <div className="detail-section">
            <div className="detail-section-title">Reputation</div>
            {reputation && reputation.count > 0 ? (
              <>
                <div className="detail-row">
                  <span className="detail-row-label">Feedbacks</span>
                  <span className="detail-row-value">{reputation.count}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Avg Score</span>
                  <span className="detail-row-value">
                    <span className="validation-score-bar-wrap" title={`${reputation.averageScore}/100`}>
                      <span className="vsb-track">
                        <span className="validation-score-bar" style={{ width: `${reputation.averageScore}%` }} />
                      </span>
                      <span className="validation-score-label">{reputation.averageScore}/100</span>
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)", padding: "var(--space-3) 0" }}>
                No reputation feedback.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* spacer */}
      <div style={{ height: "var(--space-16)" }} />
    </div>
  );
}

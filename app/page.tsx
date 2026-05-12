import { Suspense } from "react";
import { fetchAllAgents, fetchRegistryStats, fetchValidatedAgentTags, fetchTotalAgentCount } from "@/lib/api";
import RegistryClient from "./RegistryClient";

// ─── Stats Strip (fetches its own count independently) ───────────────────────

async function StatsStrip() {
  // Two fast parallel calls — no dependency on the slow fetchAllAgents
  const [stats, totalCount] = await Promise.all([
    fetchRegistryStats().catch(() => null),
    fetchTotalAgentCount().catch(() => 0),
  ]);

  const holdersCount = stats?.holders_count ?? "—";
  // totalCount = highest token ID = total agents minted on-chain
  const displayTotal = totalCount > 0 ? totalCount.toLocaleString() : (stats?.holders_count ?? "—");

  return (
    <div className="stats-bar" role="region" aria-label="Registry statistics">
      <div className="stat-item">
        <div className="stat-label">Registered Agents</div>
        <div className="stat-value" id="stat-agents">
          {displayTotal}
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-label">Unique Holders</div>
        <div className="stat-value stat-value-sm" id="stat-holders">
          {holdersCount}
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-label">Contract</div>
        <div
          className="stat-value stat-value-sm"
          style={{ fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: 0 }}
          id="stat-contract"
        >
          <a
            href="https://testnet.arcscan.app/address/0x8004A818BFB912233c491871b3d84c89A494BD9e"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
            style={{ color: "var(--text-primary)", fontSize: "13px" }}
          >
            0x8004...BD9e ↗
          </a>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-label">Standard</div>
        <div className="stat-value stat-value-sm" id="stat-standard">
          ERC-8004
        </div>
      </div>
    </div>
  );
}

// ─── Main Content — fetches ALL pages server-side ─────────────────────────────

async function RegistryContent() {
  const [agents, agentTags] = await Promise.all([
    fetchAllAgents(),
    fetchValidatedAgentTags().catch(() => ({} as Record<number, string[]>)),
  ]);

  return (
    <RegistryClient agents={agents} agentTags={agentTags} />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegistryPage() {
  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Agent Registry</h1>
        <p className="page-subtitle">
          Onchain AI agents registered via ERC-8004 on Arc Testnet.
          Each agent holds a unique identity NFT.
        </p>
      </div>

      {/* Stats loads fast and independently */}
      <Suspense
        fallback={
          <div
            className="stats-bar skeleton"
            style={{ height: "80px", marginTop: "var(--space-6)", marginBottom: "var(--space-8)" }}
            aria-busy="true"
          />
        }
      >
        <div style={{ paddingTop: "var(--space-6)" }}>
          <StatsStrip />
        </div>
      </Suspense>

      {/* Agent grid loads separately (slower, all pages) */}
      <Suspense
        fallback={
          <div className="agent-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="card skeleton"
                style={{ height: 200 }}
                aria-busy="true"
              />
            ))}
          </div>
        }
      >
        <RegistryContent />
      </Suspense>
    </div>
  );
}

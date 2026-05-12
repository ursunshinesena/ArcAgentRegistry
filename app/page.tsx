import { Suspense } from "react";
import { fetchAllAgents, fetchRegistryStats, fetchValidatedAgentTags } from "@/lib/api";
import RegistryClient from "./RegistryClient";

// ─── Stats Strip (Client Interface Wrapper) ───────────────────────────────────

interface StatsProps {
  totalAgents?: number;
}

async function StatsStrip({ totalAgents }: StatsProps) {
  let stats = null;
  try {
    stats = await fetchRegistryStats();
  } catch {
    // silently fall back
  }

  const holdersCount = stats?.holders_count ?? "—";
  // Display the total registered agents using totalAgents (fetched actual agents count)
  // Fall back to holders_count if the data is missing. On-chain total_supply returns null for this ERC721.
  const displayTotal = totalAgents ?? stats?.holders_count ?? "—";

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
    <>
      {/* Stats with the real agent count */}
      <div style={{ paddingTop: "var(--space-6)" }}>
        <StatsStrip totalAgents={agents.length} />
      </div>

      {/* Registry Client */}
      <RegistryClient agents={agents} agentTags={agentTags} />
    </>
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

      <Suspense
        fallback={
          <div style={{ paddingTop: "var(--space-6)" }}>
            <div
              className="stats-bar skeleton"
              style={{ height: "80px", marginBottom: "var(--space-8)" }}
              aria-busy="true"
            />
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
          </div>
        }
      >
        <RegistryContent />
      </Suspense>
    </div>
  );
}

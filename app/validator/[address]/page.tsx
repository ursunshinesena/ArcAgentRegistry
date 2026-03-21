import type { Metadata } from "next";
import Link from "next/link";
import { 
  fetchValidatorProfile, 
  shortAddress, 
  formatValidationTag,
  fetchAgentById,
  agentDisplayName
} from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `Validator ${shortAddress(address)} · Arc Agent Registry`,
    description: `Validation history for validator ${address} on Arc Testnet`,
  };
}

// Helper to fetch agent names for the validation list
async function getAgentNames(agentIds: number[]) {
  const uniqueIds = Array.from(new Set(agentIds));
  const names: Record<number, string> = {};
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const agent = await fetchAgentById(id.toString());
        names[id] = agentDisplayName(agent);
      } catch {
        names[id] = `Agent #${id}`;
      }
    })
  );
  return names;
}

export default async function ValidatorPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const validations = await fetchValidatorProfile(address);
  const agentNames = await getAgentNames(validations.map(v => v.agentId));

  // Sort by newest first
  const sorted = [...validations].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const uniqueAgentsCount = new Set(validations.map(v => v.agentId)).size;
  const avgScore = validations.length > 0 
    ? Math.round(validations.reduce((acc, v) => acc + v.response, 0) / validations.length)
    : 0;

  return (
    <div className="container" style={{ paddingTop: "var(--space-8)" }}>
      {/* Header Section */}
      <div className="detail-section" style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          <div className="avatar-large" style={{ 
            width: "64px", 
            height: "64px", 
            borderRadius: "50%", 
            background: "var(--bg-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            border: "1px solid var(--border-subtle)"
          }}>
            🛡️
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
              Validator Profile
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>
              {shortAddress(address, 8)}
            </h1>
          </div>
        </div>

        <div style={{ 
          fontFamily: "var(--font-mono)", 
          fontSize: "14px", 
          color: "var(--text-secondary)",
          background: "var(--bg-secondary)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          marginBottom: "var(--space-8)",
          wordBreak: "break-all"
        }}>
          {address}
        </div>

        <div style={{ 
          display: "flex", 
          gap: "var(--space-8)", 
          paddingTop: "var(--space-6)",
          borderTop: "1px solid var(--border-subtle)",
          flexWrap: "wrap"
        }}>
          <div>
            <div className="stat-label">Total Validations</div>
            <div className="stat-value" style={{ fontSize: "32px", fontWeight: 700 }}>{validations.length}</div>
          </div>
          <div>
            <div className="stat-label">Agents Verified</div>
            <div className="stat-value" style={{ fontSize: "32px", fontWeight: 700 }}>{uniqueAgentsCount}</div>
          </div>
          <div>
            <div className="stat-label">Avg. Response Score</div>
            <div className="stat-value" style={{ fontSize: "32px", fontWeight: 700 }}>{avgScore}/100</div>
          </div>
        </div>
      </div>

      {/* Validations List */}
      <h2 style={{ 
        fontSize: "13px", 
        fontWeight: 600, 
        color: "var(--text-tertiary)", 
        letterSpacing: "0.08em", 
        textTransform: "uppercase",
        marginBottom: "var(--space-4)"
      }}>
        Validation History
      </h2>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>No validation history found for this address.</p>
        </div>
      ) : (
        <div className="detail-section" style={{ padding: 0, overflow: "hidden" }}>
          {sorted.map((v, i) => (
            <div 
              key={v.requestHash + i} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "var(--space-4) var(--space-6)",
                borderBottom: i < sorted.length - 1 ? "1px solid var(--border-subtle)" : "none",
                gap: "var(--space-4)",
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flex: 1, minWidth: "250px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  #{v.agentId}
                </div>
                <div>
                  <Link href={`/agent/${v.agentId}`} className="agent-link" style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                    {agentNames[v.agentId]}
                  </Link>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                    {new Date(v.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                <span className="tag tag-verified">
                  {formatValidationTag(v.tag)}
                </span>
                <div style={{ width: "100px" }}>
                   <div className="validation-score-bar-wrap" title={`${v.response}/100`}>
                      <div className="vsb-track">
                        <div className="validation-score-bar" style={{ width: `${v.response}%` }} />
                      </div>
                      <span className="validation-score-label">{v.response}</span>
                    </div>
                </div>
                <a 
                  href={`https://testnet.arcscan.app/tx/${v.requestHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="external-link"
                  style={{ fontSize: "12px" }}
                >
                  TX ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: "var(--space-16)" }} />
    </div>
  );
}

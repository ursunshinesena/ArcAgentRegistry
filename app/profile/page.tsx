"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchAllAgents,
  agentDisplayName,
  agentTypeLabel,
  resolveIpfs,
  shortAddress,
  type AgentInstance,
} from "@/lib/api";

// ─── Mode detection ───────────────────────────────────────────────────────────

type Mode = "idle" | "address" | "name";

function detectMode(q: string): Mode {
  if (!q.trim()) return "idle";
  const trimmed = q.trim();
  // Looks like an Ethereum address if it starts with 0x
  if (trimmed.startsWith("0x")) return "address";
  return "name";
}

function isValidAddress(q: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(q.trim());
}

// ─── Inline name-search result card ──────────────────────────────────────────

function NameResultCard({ agent }: { agent: AgentInstance }) {
  const name = agentDisplayName(agent);
  const type = agentTypeLabel(agent);
  const imageUrl = resolveIpfs(agent.image_url);
  const ownerAddress = agent.owner?.hash ?? "";
  const initial =
    name.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "#";

  return (
    <Link
      href={`/agent/${agent.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-4) var(--space-5)",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color var(--transition-base), background var(--transition-base)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
      }}
    >
      {/* Avatar */}
      <div className="agent-avatar" style={{ flexShrink: 0 }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            width={40}
            height={40}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          initial
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
            {name}
          </span>
          <span className="tag tag-type-default" style={{ fontSize: "11px" }}>
            {type}
          </span>
        </div>
        {agent.metadata?.description && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {agent.metadata.description}
          </p>
        )}
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)",
            marginTop: 4,
          }}
        >
          #{agent.id} · {shortAddress(ownerAddress)}
        </div>
      </div>

      {/* Arrow */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        style={{ flexShrink: 0, color: "var(--text-tertiary)" }}
      >
        <path
          fillRule="evenodd"
          d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
        />
      </svg>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    address: "0xdE65dF7AB93a88AA48E6e1d847D718B05721a1bC",
    label: "Faye — Chief of Staff Agent",
  },
  {
    address: "0x66CAdaB3fCCe0343752A919c2929E8e3848Ff4e2",
    label: "ArcPilot owner",
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  // ── All agents for name search (lazy-loaded) ──
  const [allAgents, setAllAgents] = useState<AgentInstance[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsReady, setAgentsReady] = useState(false);

  const mode = detectMode(query);

  // Load agents only when user switches into name-search mode
  useEffect(() => {
    if (mode === "name" && !agentsReady && !agentsLoading) {
      setAgentsLoading(true);
      fetchAllAgents()
        .then((data) => {
          setAllAgents(data);
          setAgentsReady(true);
        })
        .catch(console.error)
        .finally(() => setAgentsLoading(false));
    }
  }, [mode, agentsReady, agentsLoading]);

  // Filter by name / description / capabilities
  const nameResults = useMemo(() => {
    if (mode !== "name" || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allAgents.filter((a) => {
      const name = (a.metadata?.name ?? "").toLowerCase();
      const desc = (a.metadata?.description ?? "").toLowerCase();
      const caps = (a.metadata?.capabilities ?? []).join(" ").toLowerCase();
      const type = (a.metadata?.agent_type ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q) || caps.includes(q) || type.includes(q);
    });
  }, [allAgents, query, mode]);

  // ── Submit ──
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter a wallet address or agent name.");
      return;
    }
    if (mode === "address") {
      if (!isValidAddress(trimmed)) {
        setError("Address must be a full 42-character Ethereum address (0x…).");
        return;
      }
      router.push(`/profile/${trimmed}`);
    }
    // For name mode — results are shown inline, no navigation needed
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">My Agents</h1>
        <p className="page-subtitle">
          Search by <strong>wallet address</strong> to see owned agents, or by{" "}
          <strong>agent name</strong> to find a specific agent in the registry.
        </p>
      </div>

      <div style={{ paddingTop: "var(--space-8)", maxWidth: 580 }}>
        {/* ── Search form ── */}
        <form onSubmit={handleSubmit} id="profile-search-form">
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, position: "relative" }}>
              {/* Mode icon */}
              <span
                style={{
                  position: "absolute",
                  left: "var(--space-3)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  zIndex: 1,
                }}
                aria-hidden="true"
              >
                {mode === "address" ? (
                  // Wallet icon
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5V3zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a1.99 1.99 0 0 1-1-.268zM1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1z" />
                  </svg>
                ) : (
                  // Search icon
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
                  </svg>
                )}
              </span>

              <input
                id="agent-search-input"
                className="input"
                style={{
                  width: "100%",
                  height: 40,
                  paddingLeft: "calc(var(--space-3) + 14px + var(--space-2))",
                  fontFamily: mode === "address" ? "var(--font-mono)" : "var(--font-sans)",
                  fontSize: "13px",
                }}
                placeholder="0x… address or agent name"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError("");
                }}
                autoComplete="off"
                spellCheck={false}
                aria-label="Wallet address or agent name"
                aria-describedby={error ? "search-error" : undefined}
              />

              {/* Mode badge */}
              {mode !== "idle" && (
                <span
                  style={{
                    position: "absolute",
                    right: "var(--space-3)",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: mode === "address" ? "var(--tag-payment-text)" : "var(--tag-orchestrator-text)",
                    background: mode === "address" ? "var(--tag-payment-bg)" : "var(--tag-orchestrator-bg)",
                    border: `1px solid ${mode === "address" ? "var(--tag-payment-border)" : "var(--tag-orchestrator-border)"}`,
                    borderRadius: "var(--radius-full)",
                    padding: "1px 6px",
                  }}
                >
                  {mode === "address" ? "wallet" : "name"}
                </span>
              )}
            </div>

            {mode === "address" && (
              <button
                id="search-profile-btn"
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ flexShrink: 0 }}
              >
                Search
              </button>
            )}
          </div>

          {error && (
            <p
              id="search-error"
              role="alert"
              style={{
                marginTop: "var(--space-2)",
                fontSize: "12px",
                color: "var(--error)",
              }}
            >
              {error}
            </p>
          )}
        </form>

        {/* ── Address mode: hint ── */}
        {mode === "address" && (
          <p
            style={{
              marginTop: "var(--space-3)",
              fontSize: "12px",
              color: "var(--text-tertiary)",
            }}
          >
            Enter the full 42-character address to view all owned agent NFTs.
          </p>
        )}

        {/* ── Name mode: inline results ── */}
        {mode === "name" && (
          <div style={{ marginTop: "var(--space-5)" }}>
            {agentsLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  fontSize: "13px",
                  color: "var(--text-tertiary)",
                  padding: "var(--space-4) 0",
                }}
              >
                <span className="spinner" />
                Loading agent registry…
              </div>
            ) : nameResults.length > 0 ? (
              <>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--text-tertiary)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {nameResults.length} result{nameResults.length !== 1 ? "s" : ""}
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                >
                  {nameResults.slice(0, 12).map((agent) => (
                    <NameResultCard key={agent.id} agent={agent} />
                  ))}
                  {nameResults.length > 12 && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-tertiary)",
                        textAlign: "center",
                        padding: "var(--space-3) 0",
                      }}
                    >
                      Showing 12 of {nameResults.length}. Refine your search to see more.
                    </p>
                  )}
                </div>
              </>
            ) : agentsReady ? (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-tertiary)",
                  padding: "var(--space-4) 0",
                }}
              >
                No agents found matching &ldquo;{query}&rdquo;
              </div>
            ) : null}
          </div>
        )}

        {/* ── Idle mode: examples ── */}
        {mode === "idle" && (
          <div style={{ marginTop: "var(--space-8)" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--text-tertiary)",
                marginBottom: "var(--space-3)",
              }}
            >
              Example — agents with rich metadata
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {EXAMPLES.map(({ address, label }) => (
                <button
                  key={address}
                  id={`example-${address.slice(-6)}`}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "flex-start",
                    gap: "var(--space-3)",
                    padding: "var(--space-3) var(--space-4)",
                    height: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}
                  onClick={() => router.push(`/profile/${address}`)}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {address.slice(0, 8)}…{address.slice(-4)}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

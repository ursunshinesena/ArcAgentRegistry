"use client";

import Link from "next/link";
import { useState } from "react";
import {
  type AgentInstance,
  agentDisplayName,
  agentTypeLabel,
  resolveIpfs,
  shortAddress,
  formatValidationTag,
  formatCapabilityLabel,
} from "@/lib/api";
import { copyToClipboard } from "@/lib/toast";

// ─── Type Tag class ──────────────────────────────────────────────────────────

function typeTagClass(type: string | undefined): string {
  const t = type?.toLowerCase() ?? "";
  if (t.includes("trading") || t.includes("arbitr")) return "tag-type-trading";
  if (t.includes("orchestrat") || t.includes("coordin"))
    return "tag-type-orchestrator";
  if (t.includes("payment") || t.includes("defi")) return "tag-type-payment";
  return "tag-type-default";
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AgentAvatar({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolved = resolveIpfs(imageUrl);
  const initial = name.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "#";

  if (resolved && !imgFailed) {
    return (
      <div className="agent-avatar" aria-label={`Avatar for ${name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved || undefined}
          alt={name}
          width={40}
          height={40}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          onError={() => setImgFailed(true)}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className="agent-avatar" aria-label={`Avatar for ${name}`}>
      <div className="agent-avatar-initial">{initial}</div>
    </div>
  );
}

// ─── Copy Button (stop propagation so link doesn't fire) ─────────────────────

function CopyOwnerBtn({ address }: { address: string }) {
  return (
    <button
      className="copy-btn"
      aria-label="Copy owner address"
      title="Copy address"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        copyToClipboard(address, "Address copied!");
      }}
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z" />
      </svg>
    </button>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: AgentInstance;
  view?: "grid" | "list";
  /** On-chain validation tags for this agent, e.g. ["kyc_verified"] */
  validationTags?: string[];
}

export default function AgentCard({ agent, view = "grid", validationTags = [] }: AgentCardProps) {
  const name = agentDisplayName(agent);
  const typeLabel = agentTypeLabel(agent);
  const rawType = agent.metadata?.agent_type;
  const tagClass = typeTagClass(Array.isArray(rawType) ? rawType[0] : rawType);
  const ownerAddress = agent.owner?.hash ?? "";

  return (
    <Link
      href={`/agent/${agent.id}`}
      className="card card-clickable"
      id={`agent-card-${agent.id}`}
      aria-label={`View details for ${name}`}
    >
      <article className="agent-card">
        {/* Header: avatar + meta + type */}
        <div className="agent-card-header" style={{ minWidth: 0 }}>
          <AgentAvatar imageUrl={agent.image_url} name={name} />
          <div className="agent-card-meta" style={{ minWidth: 0 }}>
            <div className="agent-card-id" aria-label="Token ID">
              #{agent.id}
            </div>
            <h2 className="agent-card-name">{name}</h2>
          </div>
          <span className={`tag ${tagClass}`} style={{ flexShrink: 0 }}>{typeLabel}</span>
        </div>

        {/* Description */}
        {agent.metadata?.description && (
          <p className="agent-card-description">{agent.metadata.description}</p>
        )}

        {/* Capabilities (hidden in list view via CSS) */}
        {agent.metadata?.capabilities && agent.metadata.capabilities.length > 0 && (
          <div className="capability-list" aria-label="Capabilities">
            {agent.metadata.capabilities.slice(0, 3).map((cap) => (
              <span key={cap} className="capability-chip">
                {formatCapabilityLabel(cap)}
              </span>
            ))}
            {agent.metadata.capabilities.length > 3 && (
              <span className="capability-chip">
                +{agent.metadata.capabilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="agent-card-footer">
          <span
            className="agent-card-owner"
            aria-label="Owner address"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            {shortAddress(ownerAddress)}
            {ownerAddress && <CopyOwnerBtn address={ownerAddress} />}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Render each on-chain validation tag */}
            {validationTags.map((tag) => (
              <span
                key={tag}
                className="tag tag-verified"
                title={`Validation tag: ${tag}`}
              >
                {formatValidationTag(tag)}
              </span>
            ))}
            {agent.metadata?.supportedTrust?.includes("reputation") && (
              <span className="tag tag-type-default" title="Supports reputation trust">
                rep
              </span>
            )}
            {agent.metadata?.supportedTrust?.includes("crypto-economic") && (
              <span className="tag tag-type-default" title="Supports crypto-economic trust">
                stake
              </span>
            )}
            {agent.metadata?.active === true && (
              <span className="tag tag-success">active</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  type AgentInstance,
  agentDisplayName,
  resolveIpfs,
  formatValidationTag,
  formatCapabilityLabel,
} from "@/lib/api";
import AgentCard from "@/components/AgentCard";

const AGENT_TYPES = ["All", "Active", "Orchestrator", "Trading", "Payment"] as const;
const PAGE_SIZE = 50;

type SortMode = "richest" | "newest" | "oldest" | "alpha";
type ViewMode = "grid" | "list";

// ─── Spam Definitions ────────────────────────────────────────────────────────

const SPAM_NAMES = ["aa", "test", "asdf", "capability_1", "capability_2", "capability_3", "capability_4"];
const BLOCKED_KEYWORDS = [
  "bin laden", "osama", "terrorist", "narco", "hitler", "stalin", "isis",
  "don pablo", "pablo escobar", "escobar", "medellin", "cartel", "cocaine", "nazi"
];

function getCapabilities(agent: AgentInstance): string[] {
  const caps = agent.metadata?.capabilities;
  return Array.isArray(caps) ? caps : [];
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

function metadataTier(agent: AgentInstance): number {
  const m = agent.metadata;
  if (!m) return 3;

  const hasName =
    typeof m.name === "string" &&
    m.name.trim().length > 0 &&
    !m.name.match(/^Agent\s*#?\d+$/i);

  const hasDesc =
    typeof m.description === "string" && m.description.trim().length >= 20;

  const hasImage =
    typeof m.image === "string" && m.image.trim().length > 0;

  const nameToCheck = (m.name || "").toLowerCase().trim();
  const descToCheck = (m.description || "").toLowerCase().trim();
  
  const isSpamName = SPAM_NAMES.includes(nameToCheck) || nameToCheck.length < 3;
  const isBlocked = BLOCKED_KEYWORDS.some(kw => nameToCheck.includes(kw) || descToCheck.includes(kw));

  // If blocked, it's definitely spam tier
  if (isBlocked) return 4;

  if (hasName && hasDesc && hasImage && !isSpamName) return 0;
  if (hasName && hasDesc && !isSpamName) return 1;
  return 2;
}

function sortAgents(agents: AgentInstance[], mode: SortMode): AgentInstance[] {
  return [...agents].sort((a, b) => {
    if (mode === "richest") {
      const ta = metadataTier(a);
      const tb = metadataTier(b);
      if (ta !== tb) return ta - tb;
      return Number(b.id) - Number(a.id);
    }
    if (mode === "newest")  return Number(b.id) - Number(a.id);
    if (mode === "oldest")  return Number(a.id) - Number(b.id);
    if (mode === "alpha") {
      const na = agentDisplayName(a).toLowerCase();
      const nb = agentDisplayName(b).toLowerCase();
      return na.localeCompare(nb);
    }
    return 0;
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

function matchesSearch(agent: AgentInstance, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();

  const id = agent.id.toString();
  const name = (agent.metadata?.name ?? "").toLowerCase();
  const desc = (agent.metadata?.description ?? "").toLowerCase();
  const owner = (agent.owner?.hash ?? "").toLowerCase();
  const rawAt = agent.metadata?.agent_type;
  const agentType = (Array.isArray(rawAt) ? rawAt.join(" ") : (rawAt ?? "")).toLowerCase();
  const caps = getCapabilities(agent).join(" ").toLowerCase();
  const displayName = `agent #${id}`;

  return (
    id.includes(q) ||
    displayName.includes(q) ||
    name.includes(q) ||
    desc.includes(q) ||
    owner.includes(q) ||
    agentType.includes(q) ||
    caps.includes(q)
  );
}

function matchesType(agent: AgentInstance, type: string): boolean {
  if (type === "All") return true;
  if (type === "Active") return agent.metadata?.active === true;
  const keyword = type.toLowerCase();
  const rawAt2 = agent.metadata?.agent_type;
  const agentType = (Array.isArray(rawAt2) ? rawAt2.join(" ") : (rawAt2 ?? "")).toLowerCase();
  const name = (agent.metadata?.name ?? "").toLowerCase();
  const desc = (agent.metadata?.description ?? "").toLowerCase();
  return agentType.includes(keyword) || name.includes(keyword) || desc.includes(keyword);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  agents: AgentInstance[];
  agentTags?: Record<number, string[]>;
}

export default function RegistryClient({ agents, agentTags = {} }: Props) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("All");
  const [activeCapability, setActiveCapability] = useState<string>("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [sortMode, setSortMode] = useState<SortMode>("richest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [compareMode, setCompareMode] = useState(false);
  const [hideSpam, setHideSpam] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const SPAM_KEYWORDS = ["aa", "narco", "terrorist", "asdf", "test", "capability_1", "capability_2", "capability_3"];

  const ALL_CAPS = useMemo(() => {
    const capsSet = new Set<string>();
    for (const a of (agents ?? [])) {
      const capabilities = a?.metadata?.capabilities;
      if (!Array.isArray(capabilities)) continue;
      for (const c of capabilities) {
        if (!c || typeof c !== "string") continue;
        const val = c.trim();
        const isSpam = SPAM_KEYWORDS.includes(val.toLowerCase()) || val.length < 3 || /^\d+$/.test(val);
        if (!isSpam) capsSet.add(val);
      }
    }
    return ["All", ...Array.from(capsSet).sort()];
  }, [agents]);

  // Derive a Set<number> for quick membership checks
  const verifiedIds = useMemo(
    () => new Set(Object.keys(agentTags).map(Number)),
    [agentTags]
  );

  // ── `/` keyboard shortcut → focus search ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName ?? ""
        )
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Sort
  const sorted = useMemo(() => sortAgents(agents, sortMode), [agents, sortMode]);

  // Filter
  const filtered = useMemo(
    () =>
      sorted.filter(
        (a) =>
          matchesSearch(a, query) &&
          matchesType(a, activeType) &&
          (activeCapability === "All" || getCapabilities(a).some(c => typeof c === "string" && c.toLowerCase() === activeCapability.toLowerCase())) &&
          (!verifiedOnly || verifiedIds.has(Number(a.id))) &&
          (!hideSpam || (metadataTier(a) <= 1 || verifiedIds.has(Number(a.id))))
      ),
    [sorted, query, activeType, activeCapability, verifiedOnly, verifiedIds, hideSpam]
  );

  const isFiltering = query.length > 0 || activeType !== "All" || verifiedOnly || activeCapability !== "All";
  const visible = isFiltering ? filtered : filtered.slice(0, displayCount);

  const richCount = useMemo(
    () => agents.filter((a) => metadataTier(a) <= 1).length,
    [agents]
  );

  return (
    <>
      {/* ── Toolbar row 1: search + type filters ── */}
      <div className="toolbar">
        {/* Search */}
        <div className="toolbar-search">
          <div className="input-wrapper">
            <span className="input-icon-left" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
              </svg>
            </span>
            <input
              ref={searchRef}
              id="search-agents"
              className="input"
              placeholder='Search by name, ID, address… (press / to focus)'
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDisplayCount(PAGE_SIZE);
              }}
              aria-label="Search agents"
              autoComplete="off"
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => setQuery("")}
                style={{
                  position: "absolute",
                  right: "var(--space-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Type filters */}
        <div className="toolbar-filters" role="group" aria-label="Filter by type">
          {/* Main Types */}
          {AGENT_TYPES.map((type) => (
            <button
              key={type}
              id={`filter-${type.toLowerCase()}`}
              className={`filter-btn${activeType === type ? " active" : ""}`}
              onClick={() => {
                setActiveType(type);
                setDisplayCount(PAGE_SIZE);
              }}
              aria-pressed={activeType === type}
            >
              {type}
            </button>
          ))}
          
          {/* Capability Dropdown */}
          <select 
            className="select" 
            style={{ minWidth: '130px', margin: '0 4px', fontSize: '12px' }}
            value={activeCapability}
            onChange={(e) => setActiveCapability(e.target.value)}
          >
            <option value="All">All Capabilities</option>
            {ALL_CAPS.filter(c => c !== "All").map(c => (
              <option key={c} value={c}>{formatCapabilityLabel(c)}</option>
            ))}
          </select>

          {/* KYC / Verified filter */}
          {verifiedIds.size > 0 && (
            <button
              id="filter-verified"
              className={`filter-btn filter-btn-verified${verifiedOnly ? " active" : ""}`}
              onClick={() => {
                setVerifiedOnly((v) => !v);
                setDisplayCount(PAGE_SIZE);
              }}
              aria-pressed={verifiedOnly}
            >
              Verified
            </button>
          )}
        </div>

        {/* Result count */}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "var(--text-tertiary)",
            flexShrink: 0,
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {isFiltering
            ? `${filtered.length} of ${agents.length}`
            : (
              <>
                Showing {Math.min(displayCount, filtered.length)} of {agents.length}
                {mounted && ` · ${richCount} with metadata`}
              </>
            )
          }
        </span>
      </div>

      {/* ── Toolbar row 2: sort + view toggle ── */}
      <div
        className="toolbar-sort-group"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          paddingBottom: "var(--space-4)",
        }}
      >
        {/* Sort label */}
        <span style={{ fontSize: "12px", color: "var(--text-tertiary)", marginRight: 2 }}>
          Sort:
        </span>

        {/* Sort dropdown */}
        <select
          id="sort-agents"
          className="select"
          value={sortMode}
          onChange={(e) => {
            setSortMode(e.target.value as SortMode);
            setDisplayCount(PAGE_SIZE);
          }}
          aria-label="Sort agents"
        >
          <option value="richest">Richest metadata</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="alpha">A → Z</option>
        </select>

        {/* Comparison Toggle */}
        <button
          className={`filter-btn ${compareMode ? 'active' : ''}`}
          id="toggle-compare-mode"
          style={{ 
            height: '32px', 
            padding: '0 16px', 
            fontSize: '12px', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            borderRadius: '100px',
            backgroundColor: compareMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)',
            border: compareMode ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
            color: compareMode ? '#22c55e' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
          onClick={() => {
            setCompareMode(!compareMode);
            if (!compareMode === false) setCompareIds([]);
          }}
        >
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: compareMode ? '#22c55e' : '#444',
            boxShadow: compareMode ? '0 0 8px #22c55e' : 'none'
          }} />
          Compare Agents
        </button>

        {/* Spam Toggle */}
        <button
          className={`filter-btn ${hideSpam ? 'active' : ''}`}
          id="toggle-hide-spam"
          style={{ 
            height: '32px', 
            padding: '0 12px', 
            fontSize: '11px', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            backgroundColor: hideSpam ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
            border: hideSpam ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
            color: hideSpam ? '#ef4444' : 'var(--text-secondary)',
          }}
          onClick={() => setHideSpam(!hideSpam)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
          {hideSpam ? 'Spam Filter ON' : 'Hide Spam'}
        </button>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: "flex", gap: "var(--space-1)" }} role="group" aria-label="View mode">
          <button
            id="view-grid"
            className={`icon-btn${viewMode === "grid" ? " active" : ""}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <GridIcon />
          </button>
          <button
            id="view-list"
            className={`icon-btn${viewMode === "list" ? " active" : ""}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {/* ── Agent grid / list ── */}
      {filtered.length === 0 ? (
        <div className="empty-state" role="status">
          <div className="empty-state-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
            </svg>
          </div>
          <p className="empty-state-title">No agents found</p>
          <p className="empty-state-desc">
            Try a different name, token ID, or wallet address.
          </p>
          {isFiltering && (
            <button
              id="clear-filters-btn"
              className="btn btn-secondary"
              style={{ marginTop: "var(--space-4)" }}
              onClick={() => { setQuery(""); setActiveType("All"); setVerifiedOnly(false); setActiveCapability("All"); }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div
          className="agent-grid"
          id="agent-grid"
          role="list"
          data-view={viewMode}
        >
          {visible.map((agent) => (
            <div key={agent.id} role="listitem" style={{ position: 'relative' }}>
              <AgentCard
                agent={agent}
                view={viewMode}
                validationTags={agentTags[Number(agent.id)] ?? []}
              />
              {compareMode && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    zIndex: 10,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: compareIds.includes(Number(agent.id)) ? '#22c55e' : '#222',
                    border: '2px solid #000',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    transform: compareIds.includes(Number(agent.id)) ? 'scale(1.1)' : 'scale(1)'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = Number(agent.id);
                    setCompareIds(curr => 
                      curr.includes(id) ? curr.filter(i => i !== id) : [...curr.slice(-2), id]
                    );
                  }}
                >
                   {compareIds.includes(Number(agent.id)) ? (
                     <svg width="14" height="14" viewBox="0 0 16 16" fill="white"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
                   ) : (
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.4)' }} />
                   )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Compare Modal ── */}
      {showCompareModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#111', width: '100%', maxWidth: '1000px', borderRadius: '24px', border: '1px solid #333', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Compare Agents</h2>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCompareModal(false)}
              >Close</button>
            </div>
            
            <div style={{ padding: '24px', overflowX: 'auto', display: 'flex', gap: '20px' }}>
               {compareIds.map(id => {
                 const agent = agents.find(a => Number(a.id) === id);
                 if (!agent) return null;
                 return (
                   <div key={id} style={{ flex: 1, minWidth: '280px', backgroundColor: '#161616', borderRadius: '16px', border: '1px solid #222', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '12px', 
                          background: 'var(--bg-tertiary)', 
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-tertiary)',
                          fontSize: '18px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {resolveIpfs(agent.metadata?.image || agent.image_url) ? (
                            <img src={resolveIpfs(agent.metadata?.image || agent.image_url) || undefined} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div className="agent-avatar-initial">
                              {agentDisplayName(agent).replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '10px', color: '#666', fontWeight: 700 }}>#{agent.id}</p>
                          <h4 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>{agent.metadata?.name || `Agent ${id}`}</h4>
                        </div>
                      </div>
                      
                      {/* Stats Table */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                           <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Standard</p>
                           <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>{agent.token?.type || 'ERC-8004'}</p>
                        </div>
                        <div>
                           <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Validation Tags</p>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                             {(agentTags[id] || []).map(t => <span key={t} style={{ fontSize: '10px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '3px 10px', borderRadius: '100px', border: '1px solid rgba(34,197,94,0.1)' }}>{formatValidationTag(t)}</span>)}
                             {(agentTags[id] || []).length === 0 && <span style={{ fontSize: '10px', color: '#444' }}>None</span>}
                           </div>
                        </div>
                        <div>
                           <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Capabilities</p>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                             {getCapabilities(agent).map(c => typeof c === "string" ? <span key={c} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#888', padding: '3px 10px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>{formatCapabilityLabel(c)}</span> : null)}
                           </div>
                        </div>
                        <div>
                           <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Description</p>
                           <p style={{ margin: 0, fontSize: '12px', color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{(agent.metadata?.description || "No description provided.")}</p>
                        </div>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Compare Bar ── */}
      {compareIds.length > 0 && (
        <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ backgroundColor: '#181818', border: '1px solid #333', padding: '12px 24px', borderRadius: '100px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: '20px', backdropFilter: 'blur(20px)' }}>
             <p style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: 600 }}>{compareIds.length} Agents Selected</p>
             <div style={{ height: '20px', width: '1px', backgroundColor: '#333' }} />
             <div style={{ display: 'flex', gap: '10px' }}>
               <button className="btn btn-secondary btn-sm" onClick={() => setCompareIds([])} style={{ height: '36px', borderRadius: '100px' }}>Clear</button>
               <button 
                 className="btn btn-primary btn-sm" 
                 onClick={() => setShowCompareModal(true)}
                 style={{ height: '36px', borderRadius: '100px', padding: '0 24px', fontWeight: 800 }}
               >
                 Compare Now
               </button>
             </div>
          </div>
        </div>
      )}
      
      {/* ── Load More ── */}
      {!isFiltering && displayCount < filtered.length && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {Math.min(displayCount, filtered.length)} of {filtered.length} agents
          </span>
          <button
            id="load-more-agents"
            className="btn btn-secondary"
            onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

import { StagedRenderingController } from "next/dist/server/app-render/staged-rendering";
import { send } from "process";

const ARCSCAN_BASE = "https://testnet.arcscan.app/api/v2";

export const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
export const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
export const VALIDATION_REGISTRY = "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentOwner {
  hash: string;
  is_contract: boolean;
  is_scam: boolean;
  is_verified: boolean;
  ens_domain_name: string | null;
  name: string | null;
  implementations?: { address_hash: string; name: string }[];
}

export interface AgentMetadata {
  name?: string;
  description?: string;
  image?: string;
  agent_type?: string;
  capabilities?: string[];
  version?: string;
  services?: { endpoint: string; name: string }[];
  supportedTrust?: string[];
  x402Support?: boolean;
  active?: boolean;
  registrations?: { agentId: number; agentRegistry: string }[];
  type?: string;
  twitter?: string;
  x?: string;
  telegram?: string;
  website?: string;
  github?: string;
  links?: {
    twitter?: string;
    x?: string;
    telegram?: string;
    website?: string;
    github?: string;
    [key: string]: string | undefined;
  };
  [key: string]: any;
}

export interface AgentInstance {
  id: string;
  image_url: string | null;
  media_url: string | null;
  media_type: string | null;
  metadata: AgentMetadata | null;
  owner: AgentOwner;
  is_unique: boolean;
  animation_url: string | null;
  external_app_url: string | null;
  thumbnails: null;
  token: TokenInfo;
}

export interface TokenInfo {
  address_hash: string;
  name: string;
  symbol: string;
  type: string;
  holders_count: string;
  total_supply: string | null;
  icon_url: string | null;
}

export interface AgentTransaction {
  hash: string;
  method: string;
  status: string;
  timestamp: string;
  block_number: number;
  from: AgentOwner;
  fee: { type: string; value: string };
  decoded_input: {
    method_call: string;
    method_id: string;
    parameters: { name: string; type: string; value: string }[];
  } | null;
}

export interface PaginatedAgents {
  items: AgentInstance[];
  next_page_params: { unique_token: number } | null;
}

export interface PaginatedTxs {
  items: AgentTransaction[];
  next_page_params: object | null;
}

export interface ValidationSummary {
  count: number;
  averageResponse: number;
  isVerified: boolean;
  tags: string[];
}

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch one page of registered agents.
 */
export async function fetchAgents(
  cursor?: number
): Promise<PaginatedAgents> {
  const url = new URL(
    `${ARCSCAN_BASE}/tokens/${IDENTITY_REGISTRY}/instances`
  );
  if (cursor) {
    url.searchParams.set("unique_token", String(cursor));
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`ArcScan API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch ALL registered agents by chaining every page.
 * Runs on the server; results are cached (revalidate: 60s).
 * Cap = 200 pages (10000 agents) as a safety limit.
 */
export async function fetchAllAgents(): Promise<AgentInstance[]> {
  const all: AgentInstance[] = [];
  let cursor: number | undefined;
  let page = 0;
  const MAX_PAGES = 200;

  do {
    const data = await fetchAgents(cursor);
    all.push(...data.items);
    cursor = data.next_page_params?.unique_token ?? undefined;
    page++;
  } while (cursor && page < MAX_PAGES);

  return all;
}

/**
 * Fetch a single agent instance by token ID.
 */
export async function fetchAgentById(
  tokenId: string
): Promise<AgentInstance> {
  const res = await fetch(
    `${ARCSCAN_BASE}/tokens/${IDENTITY_REGISTRY}/instances/${tokenId}`,
    { next: { revalidate: 30 } }
  );

  if (!res.ok) {
    throw new Error(`Agent not found: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch all token instances owned by a specific wallet address.
 */
export async function fetchAgentsByOwner(
  address: string
): Promise<AgentInstance[]> {
  const res = await fetch(
    `${ARCSCAN_BASE}/addresses/${address}/nft?type=ERC-721`,
    { next: { revalidate: 30 } }
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const items = (data.items ?? []) as AgentInstance[];

  // Client-side filter for Identity Registry
  return items.filter(
    (item) => item.token?.address_hash?.toLowerCase() === IDENTITY_REGISTRY.toLowerCase()
  );
}

/**
 * Fetch recent registration transactions for the Identity Registry.
 */
export async function fetchRecentRegistrations(): Promise<PaginatedTxs> {
  const res = await fetch(
    `${ARCSCAN_BASE}/addresses/${IDENTITY_REGISTRY}/transactions?filter=to`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch transactions: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch token info (total supply, holder count) for the registry contract.
 */
export async function fetchRegistryStats(): Promise<TokenInfo> {
  const res = await fetch(
    `${ARCSCAN_BASE}/tokens/${IDENTITY_REGISTRY}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch registry stats: ${res.status}`);
  }

  return res.json();
}

// ─── Shared paginated tx fetcher ─────────────────────────────────────────────

async function fetchAllTxsForAddress(
  address: string,
  maxPages = 5
): Promise<AgentTransaction[]> {
  const all: AgentTransaction[] = [];
  let nextParams = "";
  let page = 0;

  do {
    const url = `${ARCSCAN_BASE}/addresses/${address}/transactions?filter=to${nextParams}`;
    const res = await fetch(url, { next: { revalidate: 30 } }); // Lower revalidate for tests
    if (!res.ok) break;
    const data: PaginatedTxs = await res.json();
    all.push(...data.items);
    if (data.next_page_params) {
      const p = data.next_page_params as Record<string, string | number>;
      nextParams = "&" + Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    } else {
      nextParams = "";
    }
    page++;
  } while (nextParams && page < maxPages);

  return all;
}

/** Fetch events (logs) for a contract address */
async function fetchAllLogs(
  address: string,
  maxPages = 3
): Promise<any[]> {
  const all: any[] = [];
  let nextParams = "";
  let page = 0;

  do {
    const url = `${ARCSCAN_BASE}/addresses/${address}/logs?${nextParams}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) break;
    const data = await res.json();

    // Normalize timestamps for logs from block_timestamp to timestamp for consistency
    const items = (data.items || []).map((item: any) => ({
      ...item,
      timestamp: item.block_timestamp || item.timestamp
    }));

    all.push(...items);
    if (data.next_page_params) {
      const p = data.next_page_params as Record<string, string | number>;
      nextParams = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    } else {
      nextParams = "";
    }
    page++;
  } while (nextParams && page < maxPages);

  return all;
}

// ─── Reputation ───────────────────────────────────────────────────────────────

export interface ReputationSummary {
  count: number;
  averageScore: number;
  tags: string[];
}

export async function fetchReputationSummary(agentId: string): Promise<ReputationSummary | null> {
  try {
    const logs = await fetchAllLogs(REPUTATION_REGISTRY, 3);
    const agentIdNum = Number(agentId);
    let count = 0, total = 0;
    const tagSet = new Set<string>();

    for (const log of logs) {
      if (!log.decoded) continue;
      // The event is typically "NewFeedback" or similar
      const method = log.decoded.method_call.toLowerCase();
      if (!method.includes("feedback")) continue;

      const params = log.decoded.parameters;
      const aid = params.find((p: any) => p.name === "agentId");
      if (Number(aid?.value) !== agentIdNum) continue;

      count++;
      // Score value
      const val = params.find((p: any) => p.name === "value")?.value;
      total += Number(val ?? 0);
      const t1 = params.find((p: any) => p.name === "tag1")?.value as string;
      const t2 = params.find((p: any) => p.name === "tag2")?.value as string;
      if (t1) tagSet.add(t1);
      if (t2) tagSet.add(t2);
    }

    if (count === 0) return { count: 0, averageScore: 0, tags: [] };
    return { count, averageScore: Math.round(total / count), tags: [...tagSet] };
  } catch { return null; }
}

export async function fetchAgentReputationMap(): Promise<Record<number, number>> {
  const result: Record<number, number> = {};
  try {
    const txs = await fetchAllTxsForAddress(REPUTATION_REGISTRY, 5);
    const scores = new Map<number, { total: number; count: number }>();
    for (const tx of txs) {
      if (!tx.decoded_input?.method_call.includes("giveFeedback")) continue;
      const params = tx.decoded_input.parameters;
      const aid = params.find((p) => p.name === "agentId");
      const val = params.find((p) => p.name === "value");
      if (!aid || !val) continue;
      const id = Number(aid.value), score = Number(val.value);
      const prev = scores.get(id) ?? { total: 0, count: 0 };
      scores.set(id, { total: prev.total + score, count: prev.count + 1 });
    }
    for (const [id, { total, count }] of scores.entries()) {
      result[id] = Math.round(total / count);
    }
  } catch { /* silently fail */ }
  return result;
}

// ─── Validator Profile ────────────────────────────────────────────────────────

export interface ValidatorValidation {
  agentId: number;
  response: number;
  tag: string;
  requestHash: string;
  timestamp: string;
}

export async function fetchValidatorProfile(validatorAddress: string): Promise<ValidatorValidation[]> {
  try {
    const txs = await fetchAllTxsForAddress(VALIDATION_REGISTRY, 5);
    const lower = validatorAddress.toLowerCase();
    const agentForHash = new Map<string, number>();

    for (const tx of txs) {
      if (!tx.decoded_input?.method_call.includes("validationRequest")) continue;
      const params = tx.decoded_input.parameters;
      const h = params.find((p) => p.name === "requestHash");
      const a = params.find((p) => p.name === "agentId");
      if (h && a) {
        agentForHash.set(h.value as string, Number(a.value));
      }
    }

    const validations: ValidatorValidation[] = [];
    for (const tx of txs) {
      if (!tx.decoded_input?.method_call.includes("validationResponse")) continue;
      if (tx.from?.hash?.toLowerCase() !== lower) continue;
      const params = tx.decoded_input.parameters;
      const h = params.find((p) => p.name === "requestHash");
      if (!h) continue;
      const agentId = agentForHash.get(h.value as string);
      if (agentId === undefined) continue;
      validations.push({
        agentId,
        response: Number(params.find((p) => p.name === "response")?.value ?? 0),
        tag: (params.find((p) => p.name === "tag")?.value as string) ?? "",
        requestHash: h.value as string,
        timestamp: tx.timestamp,
      });
    }
    return validations;
  } catch { return []; }
}

// ─── Agent Activity Timeline ──────────────────────────────────────────────────

export interface AgentActivity {
  hash: string;
  method: string;
  registry: "validation" | "reputation" | "unknown";
  timestamp: string;
  status: string;
  from: string;
  score?: number;
  tag?: string;
}

export async function fetchAgentActivity(agentId: string): Promise<AgentActivity[]> {
  const agentIdNum = Number(agentId);
  const activities: AgentActivity[] = [];

  try {
    // 1. Validation Logs (Requests & Responses) - increase to 5 pages for activity
    const valLogs = await fetchAllLogs(VALIDATION_REGISTRY, 5);
    const agentForHash = new Map<string, number>();

    // First pass to map requestHash -> agentId
    for (const log of valLogs) {
      if (!log.decoded) continue;
      const p = log.decoded.parameters;
      const h = p.find((x: any) => x.name === "requestHash");
      const a = p.find((x: any) => x.name === "agentId");
      if (h && a) agentForHash.set(h.value as string, Number(a.value));
    }

    // Second pass to create activities
    for (const log of valLogs) {
      if (!log.decoded) continue;
      const method = log.decoded.method_call.toLowerCase();
      const p = log.decoded.parameters;

      if (method.includes("validationrequest")) {
        const a = p.find((x: any) => x.name === "agentId");
        if (Number(a?.value) !== agentIdNum) continue;
        activities.push({
          hash: log.transaction_hash,
          method: "Validation Request",
          registry: "validation",
          timestamp: log.timestamp,
          status: "success",
          from: (p.find((x: any) => x.name === "validatorAddress")?.value ?? p.find((x: any) => x.name === "validator")?.value ?? "") as string
        });
      } else if (method.includes("validationresponse")) {
        const h = p.find((x: any) => x.name === "requestHash");
        const a = p.find((x: any) => x.name === "agentId");

        const aid = a ? Number(a.value) : (h ? agentForHash.get(h.value as string) : undefined);
        if (aid !== agentIdNum) continue;

        activities.push({
          hash: log.transaction_hash,
          method: "Validation Response",
          registry: "validation",
          timestamp: log.timestamp,
          status: "success",
          from: (p.find((x: any) => x.name === "validatorAddress")?.value ?? p.find((x: any) => x.name === "validator")?.value ?? "") as string,
          score: Number(p.find((x: any) => x.name === "response")?.value ?? 0),
          tag: (p.find((x: any) => x.name === "tag")?.value as string) ?? ""
        });
      }
    }

    // 2. Reputation Logs - increase to 5 pages
    const repLogs = await fetchAllLogs(REPUTATION_REGISTRY, 5);
    for (const log of repLogs) {
      if (!log.decoded) continue;
      const method = log.decoded.method_call.toLowerCase();
      if (!method.includes("feedback")) continue;

      const p = log.decoded.parameters;
      if (Number(p.find((x: any) => x.name === "agentId")?.value) !== agentIdNum) continue;
      activities.push({
        hash: log.transaction_hash,
        method: "Reputation Feedback",
        registry: "reputation",
        timestamp: log.timestamp,
        status: "success",
        from: (p.find((x: any) => x.name === "clientAddress")?.value ?? p.find((x: any) => x.name === "from")?.value ?? "") as string,
        score: Number(p.find((x: any) => x.name === "value")?.value ?? 0),
        tag: (p.find((x: any) => x.name === "tag1")?.value as string) ?? ""
      });
    }
  } catch { /* silently fail */ }

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** @internal */
interface ValidationMaps {
  agentForHash: Map<string, number>;
  responseForHash: Map<string, number>;
  /** tag stored for each requestHash (from validationResponse) */
  tagForHash: Map<string, string>;
}

async function fetchValidationMaps(): Promise<ValidationMaps> {
  const agentForHash = new Map<string, number>();
  const responseForHash = new Map<string, number>();
  const tagForHash = new Map<string, string>();

  const logs = await fetchAllLogs(VALIDATION_REGISTRY, 3);

  for (const log of logs) {
    if (!log.decoded) continue;
    const method = log.decoded.method_call.toLowerCase();
    const params = log.decoded.parameters ?? [];

    if (method.includes("validationrequest")) {
      const hashParam = params.find((p: any) => p.name === "requestHash");
      const agentParam = params.find((p: any) => p.name === "agentId");
      if (hashParam && agentParam) {
        agentForHash.set(hashParam.value as string, Number(agentParam.value));
      }
    } else if (method.includes("validationresponse")) {
      const hashParam = params.find((p: any) => p.name === "requestHash");
      const agentParam = params.find((p: any) => p.name === "agentId");
      const responseParam = params.find((p: any) => p.name === "response");
      const tagParam = params.find((p: any) => p.name === "tag");

      if (hashParam && agentParam) {
        agentForHash.set(hashParam.value as string, Number(agentParam.value));
      }

      if (hashParam && responseParam) {
        responseForHash.set(hashParam.value as string, Number(responseParam.value));
        if (tagParam?.value) {
          tagForHash.set(hashParam.value as string, tagParam.value as string);
        }
      }
    }
  }

  return { agentForHash, responseForHash, tagForHash };
}

/**
 * Fetch validation summary for a specific agent from the Validation Registry.
 */
export async function fetchValidationSummary(
  agentId: string
): Promise<ValidationSummary | null> {
  try {
    const { agentForHash, responseForHash, tagForHash } = await fetchValidationMaps();
    const agentIdNum = Number(agentId);

    let count = 0;
    let totalResponse = 0;
    const tagSet = new Set<string>();

    for (const [hash, response] of responseForHash.entries()) {
      const aid = agentForHash.get(hash);
      if (aid !== agentIdNum) continue;
      count++;
      totalResponse += response;
      const tag = tagForHash.get(hash);
      if (tag) tagSet.add(tag);
    }

    if (count === 0) return { count: 0, averageResponse: 0, isVerified: false, tags: [] };

    const averageResponse = Math.round(totalResponse / count);
    return { count, averageResponse, isVerified: averageResponse >= 50, tags: [...tagSet] };
  } catch {
    return null;
  }
}

/**
 * Fetch a set of agent IDs that have been validated (avg score >= 50).
 * Used for registry-level badge + filter.
 */
/**
 * Returns a map of agentId → unique tags for agents that passed validation
 * (avg response >= 50). Serialisable as a plain object for Next.js RSC→Client.
 */
export async function fetchValidatedAgentTags(): Promise<Record<number, string[]>> {
  const result: Record<number, string[]> = {};
  try {
    const { agentForHash, responseForHash, tagForHash } = await fetchValidationMaps();
    const scores = new Map<number, { total: number; count: number }>();
    const tags = new Map<number, Set<string>>();

    for (const [hash, response] of responseForHash.entries()) {
      const agentId = agentForHash.get(hash);
      if (agentId === undefined) continue;
      const prev = scores.get(agentId) ?? { total: 0, count: 0 };
      scores.set(agentId, { total: prev.total + response, count: prev.count + 1 });
      const tag = tagForHash.get(hash);
      if (tag) {
        const tagSet = tags.get(agentId) ?? new Set<string>();
        tagSet.add(tag);
        tags.set(agentId, tagSet);
      }
    }

    for (const [agentId, { total, count }] of scores.entries()) {
      if (Math.round(total / count) >= 50) {
        result[agentId] = [...(tags.get(agentId) ?? [])];
      }
    }
  } catch {
    // silently fail
  }
  return result;
}

/** @deprecated use fetchValidatedAgentTags */
export async function fetchValidatedAgentIds(): Promise<Set<number>> {
  const tagMap = await fetchValidatedAgentTags();
  return new Set(Object.keys(tagMap).map(Number));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shorten an Ethereum address: 0x1234...5678 */
export function shortAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Patterns that indicate a placeholder / template URL — not a real image */
const PLACEHOLDER_PATTERNS = [
  "REPLACE_WITH",
  "QmYour",
  "YOUR_",
  "<",
  "example",
  "placeholder",
  "lorem",
];

/** Returns true if this URL looks like a real image source */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Must start with http/https/ipfs
  if (!lower.startsWith("http") && !lower.startsWith("ipfs://")) return false;
  // Must not contain placeholder patterns
  if (PLACEHOLDER_PATTERNS.some((p) => url.includes(p))) return false;
  return true;
}

/** Resolve IPFS URL to a gateway URL — returns null for invalid/placeholder URLs */
export function resolveIpfs(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!isValidImageUrl(url)) return null;
  if (url.startsWith("ipfs://")) {
    const cid = url.slice(7);
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return url;
}

/** Format agent name — fall back to Agent #ID */
export function agentDisplayName(agent: AgentInstance): string {
  return agent.metadata?.name ?? `Agent #${agent.id}`;
}

/** Format agent type label */
export function agentTypeLabel(agent: AgentInstance): string {
  let type = agent.metadata?.agent_type || agent.metadata?.type;
  if (!type) return "Unknown";

  // If the type is a technical URL (like EIP-8004 registration), don't show it as a label
  if (type.startsWith("http") || type.includes("://")) {
    // Check if we have agent_type as a fallback
    if (agent.metadata?.agent_type && !agent.metadata.agent_type.startsWith("http")) {
      type = agent.metadata.agent_type;
    } else {
      return "Unknown";
    }
  }

  return formatValidationTag(type);
}

/** 
 * Format a capability or type string 
 * e.g. "vendor_payments" -> "Vendor Payments"
 */
export function formatCapabilityLabel(label: string): string {
  return formatValidationTag(label);
}

/**
 * Format an on-chain validation tag for display.
 * e.g. "kyc_verified" → "KYC Verified"
 *      "technical_audit" → "Technical Audit"
 */
const KNOWN_ACRONYMS = new Set(["kyc", "ip", "api", "id", "nft", "erc"]);

export function formatValidationTag(tag: string): string {
  return tag
    .split("_")
    .map((word) =>
      KNOWN_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}
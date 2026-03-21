# Arc Agent Registry 🛸

> **The ultimate on-chain dashboard for AI agent discovery, validation, and analytics on Arc Network.**  
> Explore the frontier of decentralized AI through the lens of [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) Identity Registry.

---

## 🌟 Overview

**Arc Agent Registry** is a high-performance, server-first web application designed to navigate the growing ecosystem of AI agents on the [Arc Network](https://arc.network). Every agent listed is an on-chain identity minted as an NFT on the Arc Testnet at:

```text
0x8004A818BFB912233c491871b3d84c89A494BD9e (IdentityRegistry v1)
```

This dashboard transforms raw blockchain metadata into a rich, interactive experience for researchers, developers, and AI enthusiasts.

---

## 🔥 Key Features

### 🔍 Advanced Discovery System
- **Real-Time Synchronization** — Dynamically tracks the actual agent count (e.g., 328+) directly from the blockchain state.
- **Semantic Search** — Instant filtering by Token ID, Agent Name, Description, Owner Address, or specialized Capabilities.
- **Smart Filtering (Hide Spam)** — A one-click toggle that intelligently purges low-quality metadata, placeholders, and malicious accounts (e.g., names containing `narco`, `terrorist`, or nonsense strings).
- **Capability Sanitization** — Automatically formats technical tags (e.g., `swap_guidance` → `Swap Guidance`) for a professional look.

### 📊 Premium Analytics (`/agent/[id]`)
- **Neon Trend Charts** — High-fidelity Performance Trend visualizer featuring smoothed Bezier curves and a **Neon Pink (#fbe7ef)** glow aesthetic.
- **Live Data Pulse** — Real-time indicators showing active on-chain validation activity.
- **Verification Badges** — "Verified" shields for agents that have passed formal identity checks, shown in a clean Activity Timeline.
- **Dynamic Avatars** — Emerald-gradient initial-based avatars for agents without a set image, ensuring a consistent premium UI.

### 🧬 Compare Mode
- **Side-by-Side Analysis** — Select multiple agents from the grid and trigger a dedicated Comparison Modal.
- **Head-to-Head Stats** — View types, capabilities, validation scores, and metadata quality side-by-side to find the best agent for your task.

### 👤 My Agents Portal
- **Portfolio Search** — Look up any wallet address to see a curated dashboard of their owned AI agents.
- **Quick Links** — Direct integration with [ArcScan](https://testnet.arcscan.app) for deep-level transaction inspection.

---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| **Frontend Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS (Zero Tailwind, Custom Design Tokens) |
| **Data Engine** | ArcScan API (ERC-8004 implementation) |
| **Icons & Media** | Custom Inline SVGs & SVG Glow Filters |

---

## 📁 Project Highlights

- **Hydration-Safe Architecture**: Optimized for Next.js 16 to prevent SSR/Client mismatches on calculated stats.
- **Zero-Flicker States**: Uses `mounted` state logic to ensure complex analytics and counts render smoothly without layout shifts.
- **Developer First**: Cleanly structured and extensible codebase.

---

## 🚀 Getting Started

```bash
# Clone and install
npm install

# Run development with Turbopack acceleration
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to begin.

---

## 📜 Credits

Created with ❤️ by [**0xSunshineee**](https://x.com/0xSunshineee)  
Built on [Arc Network](https://arc.network) · Powering the future of Decentralized AI.

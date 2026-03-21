import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ToastContainer } from "@/components/ToastContainer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Arc Agent Registry",
    template: "%s · Arc Agent Registry",
  },
  description:
    "Explore and discover onchain AI agents registered on Arc Testnet via the ERC-8004 standard.",
  keywords: ["Arc Network", "AI agents", "ERC-8004", "blockchain", "testnet", "NFT registry"],
  openGraph: {
    title: "Arc Agent Registry",
    description:
      "Explore and discover onchain AI agents registered on Arc Testnet via the ERC-8004 standard.",
    type: "website",
    siteName: "Arc Agent Registry",
  },
  twitter: {
    card: "summary",
    title: "Arc Agent Registry",
    description: "Explore onchain AI agents registered on Arc Testnet.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {/* ── Desktop Header ── */}
        <header className="header">
          <div className="container">
            <div className="header-inner">
              {/* Logo */}
              <Link href="/" className="header-logo" id="header-logo">
                <Image
                  src="/logo.png"
                  alt="Arc Logo"
                  width={28}
                  height={28}
                  className="header-logo-img"
                  priority
                />
                Arc Registry
              </Link>

              {/* Nav */}
              <nav className="header-nav" aria-label="Main navigation">
                <Link href="/" className="header-nav-link" id="nav-registry">
                  Registry
                </Link>
                <Link href="/profile" className="header-nav-link" id="nav-profile">
                  My Agents
                </Link>
              </nav>

              {/* External links */}
              <div className="header-actions">
                <a
                  href="https://testnet.arcscan.app/token/0x8004A818BFB912233c491871b3d84c89A494BD9e"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  id="header-arcscan-link"
                >
                  ArcScan ↗
                </a>
                <a
                  href="https://docs.arc.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  id="header-docs-link"
                >
                  Docs
                </a>
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <div className="mobile-nav-inner">
            <Link href="/" className="mobile-nav-link" id="mobile-nav-registry">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
              </svg>
              Registry
            </Link>
            <Link href="/profile" className="mobile-nav-link" id="mobile-nav-agents">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10c-2.029 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
              </svg>
              My Agents
            </Link>
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-nav-link"
              id="mobile-nav-arcscan"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
                <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
              </svg>
              ArcScan
            </a>
          </div>
        </nav>

        {/* ── Footer ── */}
        <footer className="footer">
          <div className="container">
            <div className="footer-inner">
              <p className="footer-text" style={{ flex: 1, margin: 0 }}>
                Built on{" "}
                <a
                  href="https://arc.network"
                  className="footer-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Arc Network
                </a>{" "}
                · ERC-8004
              </p>
              
              <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                 Built by{" "}
                 <a
                    href="https://x.com/0xSunshineee"
                    className="footer-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', marginLeft: '4px' }}
                  >
                    0xSunshineee
                  </a>
              </div>

              <div className="footer-links" style={{ flex: 1, justifyContent: 'flex-end' }}>
                <a
                  href="https://testnet.arcscan.app/address/0x8004A818BFB912233c491871b3d84c89A494BD9e"
                  className="footer-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contract
                </a>
                <a
                  href="https://eips.ethereum.org/EIPS/eip-8004"
                  className="footer-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ERC-8004
                </a>
                <a
                  href="https://discord.com/invite/buildonarc"
                  className="footer-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* ── Toast ── */}
        <ToastContainer />
      </body>
    </html>
  );
}

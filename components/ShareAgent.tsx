"use client";

import React, { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { AgentInstance, ValidationSummary, ReputationSummary, IDENTITY_REGISTRY, resolveIpfs } from "@/lib/api";
import { formatValidationTag } from "@/lib/api";

interface ShareAgentProps {
  agent: AgentInstance;
  validation?: ValidationSummary | null;
  reputation?: ReputationSummary | null;
}

export const ShareAgent: React.FC<ShareAgentProps> = ({ agent, validation, reputation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const name = agent.metadata?.name || `Agent #${agent.id}`;
  const rawImageUrl = agent.metadata?.image || agent.image_url;
  const imageUrl = resolveIpfs(rawImageUrl);
  const capabilities = agent.metadata?.capabilities || [];
  const tweetText = `Identity registered on @arc Agent Registry.

Agent Name: ${name}
Registry ID: #${agent.id}`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  
  const [readyImageUrl, setReadyImageUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  // Safely pre-load image to detect broken links without crashing
  useEffect(() => {
    if (!imageUrl || !isOpen) {
      setReadyImageUrl(null);
      setIsProcessingImage(false);
      return;
    }

    setIsProcessingImage(true);

    const img = new Image();
    // Use the local proxy to bypass CORS
    const proxiedUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
    img.crossOrigin = "anonymous";
    
    const handleLoad = () => {
      setReadyImageUrl(proxiedUrl);
      setIsProcessingImage(false);
    };
    
    const handleError = () => {
      setReadyImageUrl(null);
      setIsProcessingImage(false);
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = proxiedUrl;
  }, [imageUrl, isOpen]);

  // Helper to format underscores to spaces and title case
  const formatLabel = (txt: string) => txt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: false,
        backgroundColor: '#000000',
        filter: (node: any) => {
          // If it's an image that hasn't loaded properly, skip it
          if (node.tagName === 'IMG') {
            return node.complete && node.naturalWidth > 0;
          }
          return true;
        },
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const link = document.createElement("a");
      link.download = `agent-${agent.id}-share.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error("Failed to generate image", err);
      alert(`Generation Error: Could not generate a clean PNG card. Check if you have an active internet connection. ${err?.message || ""}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: false,
        backgroundColor: '#000000',
        filter: (node: any) => {
          if (node.tagName === 'IMG') {
            return node.complete && node.naturalWidth > 0;
          }
          return true;
        }
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      if (typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        alert("Image copied to clipboard!");
      } else {
        throw new Error("ClipboardItem not supported");
      }
    } catch (err: any) {
      console.error("Failed to copy image", err);
      alert(`Copy Error: Browser clipboard permission or image generation issue.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareOnX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share
      </button>
    );
  }

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}
        onClick={() => setIsOpen(false)}
      >
        <div 
          style={{
            backgroundColor: '#111111',
            borderRadius: '24px',
            border: '1px solid #333333',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #333333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Share Agent</h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#666666', cursor: 'pointer', padding: '4px' }}
            >
              ✕
            </button>
          </div>

          {/* Capture Area (Off-screen) */}
          <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', pointerEvents: 'none' }}>
            <div 
              ref={cardRef}
              style={{
                width: '600px',
                height: '420px',
                backgroundColor: '#000000',
                backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.15) 0%, transparent 60%), radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
                display: 'flex',
                flexDirection: 'column',
                padding: '44px',
                color: '#ffffff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
            >
              {/* Branding */}
              <div style={{ position: 'absolute', top: '30px', right: '40px', opacity: 0.5, fontSize: '11px', letterSpacing: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                Registry
              </div>

              <div style={{ display: 'flex', marginTop: 'auto', marginBottom: 'auto', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ width: '130px', height: '130px', borderRadius: '24px', backgroundColor: '#111', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {readyImageUrl ? (
                    <img 
                      crossOrigin="anonymous" 
                      src={readyImageUrl || undefined} 
                      alt="" 
                      onError={() => setReadyImageUrl(null)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '48px', fontWeight: 700, color: '#333333' }}>{name.charAt(0)}</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, marginLeft: '32px' }}>
                  <div style={{ fontSize: '14px', color: '#555555', fontWeight: 700, letterSpacing: '0.15em', marginBottom: '6px' }}>#{agent.id}</div>
                  <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{name}</h1>
                  
                    <div style={{ display: 'flex', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
                      {validation?.tags.map(tag => (
                        <span key={tag} style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>
                          {formatValidationTag(tag).replace(/_/g, ' ')}
                        </span>
                      ))}
                      {validation && validation.averageResponse > 0 && (
                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '6px' }}>✓</span>
                          <span>{validation.averageResponse}/100</span>
                        </div>
                      )}
                      {reputation && reputation.count > 0 && (
                        <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.25)', padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '6px' }}>★</span>
                          <span>{reputation.averageScore}</span>
                        </div>
                      )}
                    </div>

                  {/* Capabilities */}
                  {capabilities.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', opacity: 0.9 }}>
                      {capabilities.slice(0, 4).map(cap => (
                        <span key={cap} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#999999', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', marginRight: '6px', marginBottom: '6px' }}>
                          {formatLabel(cap)}
                        </span>
                      ))}
                      {capabilities.length > 4 && <span style={{ fontSize: '10px', color: '#444444', height: '22px', display: 'flex', alignItems: 'center' }}>+{capabilities.length - 4} more</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', marginTop: 'auto' }}>
                <div style={{ fontSize: '11px', opacity: 0.4, fontWeight: 500 }}>
                  arc.network • securely registered on testnet
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                   <span style={{ fontSize: '8px', opacity: 0.25, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Identity Registry</span>
                   <span style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.5, letterSpacing: '0.02em' }}>{IDENTITY_REGISTRY}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actual Visible Preview */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
             <div 
               style={{ 
                 width: '100%', 
                 aspectRatio: '1.5 / 1', 
                 backgroundColor: '#000', 
                 borderRadius: '20px',
                 backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                 display: 'flex',
                 flexDirection: 'column',
                 padding: '24px',
                 border: '1px solid rgba(255,255,255,0.1)',
                 boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                 position: 'relative',
                 overflow: 'hidden'
               }}
             >
                <div style={{ position: 'absolute', top: 16, right: 16, fontSize: '9px', opacity: 0.3, fontWeight: 700, textTransform: 'uppercase' }}>Export Preview</div>
                
                <div style={{ display: 'flex', marginBottom: 'auto', alignItems: 'flex-start' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {readyImageUrl ? (
                      <img 
                        src={readyImageUrl || undefined} 
                        alt="" 
                        onError={() => setReadyImageUrl(null)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '32px', fontWeight: 800, color: '#333' }}>{name.charAt(0)}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, marginLeft: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>#{agent.id}</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{name}</div>
                    <div style={{ display: 'flex', marginTop: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      {validation?.isVerified && (
                        <span style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', fontSize: '10px', padding: '2px 10px', borderRadius: '100px', fontWeight: 700 }}>Verified</span>
                      )}
                      {reputation && (
                        <div style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#facc15', fontSize: '10px', padding: '2px 10px', borderRadius: '100px', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '4px', marginTop: '-1px' }}>★</span>
                          <span>{reputation.averageScore}</span>
                        </div>
                      )}
                    </div>

                    {/* Capabilities in Preview */}
                    {capabilities.length > 0 && (
                       <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px', opacity: 0.7 }}>
                         {capabilities.slice(0, 3).map(cap => (
                           <span key={cap} style={{ fontSize: '9px', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                             {formatLabel(cap)}
                           </span>
                         ))}
                         {capabilities.length > 3 && <span style={{ fontSize: '9px', color: '#444' }}>+{capabilities.length - 3}</span>}
                       </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#444', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Arc Registry Showcase</span>
                  <span>arc.network</span>
                </div>
             </div>

             <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  onClick={handleDownload}
                  disabled={isGenerating || isProcessingImage}
                  className="btn btn-secondary"
                  style={{ gap: '8px', border: '1px solid #333' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {isGenerating ? "Wait..." : "Download PNG"}
                </button>
                <button 
                  onClick={handleCopyImage}
                  disabled={isGenerating || isProcessingImage}
                  className="btn btn-secondary"
                  style={{ gap: '8px', border: '1px solid #333' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {isGenerating ? "Wait..." : "Copy Image"}
                </button>
                <button 
                  onClick={handleShareOnX}
                  className="btn btn-primary"
                  style={{ gridColumn: 'span 2', gap: '8px', background: '#ffffff', color: '#000000', border: 'none', fontWeight: 700 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share on X
                </button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

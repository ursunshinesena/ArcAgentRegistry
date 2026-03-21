"use client";

import { useState } from "react";

interface Props {
  imageUrl: string | null;
  name: string;
}

export default function AgentDetailImage({ imageUrl, name }: Props) {
  const [readyImageUrl, setReadyImageUrl] = useState<string | null>(imageUrl);
  const initial =
    name.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "?";

  return (
    <>
      {readyImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={readyImageUrl}
          alt={name}
          width={64}
          height={64}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          onError={() => setReadyImageUrl(null)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="agent-avatar-initial" style={{ fontSize: '24px' }}>
          {initial}
        </div>
      )}
    </>
  );
}

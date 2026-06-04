"use client";

import { useEffect, useState } from "react";

type NewsCardImageProps = {
  src: string;
  fallback: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export default function NewsCardImage({
  src,
  fallback,
  alt,
  className = "",
  priority,
}: NewsCardImageProps) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    setUrl(src);
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumbnail articol + fallback Unsplash
    <img
      src={url}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (url !== fallback) setUrl(fallback);
      }}
    />
  );
}

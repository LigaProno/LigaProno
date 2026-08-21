"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1030648513142502";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: Window["fbq"];
  }
}

export function MetaPixel({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastTrackedPath.current = null;
      return;
    }

    // Prima PageView vine din snippet-ul oficial; pe navigări client mai trimitem încă una.
    if (lastTrackedPath.current === null) {
      lastTrackedPath.current = pathname;
      return;
    }
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    window.fbq?.("track", "PageView");
  }, [pathname, enabled]);

  if (!enabled) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

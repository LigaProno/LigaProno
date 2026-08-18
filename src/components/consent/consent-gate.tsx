"use client";

import { ConsentModal } from "./consent-modal";

type Props = {
  needsTerms: boolean;
  needsMarketing: boolean;
};

export function ConsentGate({ needsTerms, needsMarketing }: Props) {
  if (!needsTerms && !needsMarketing) return null;

  return <ConsentModal needsTerms={needsTerms} needsMarketing={needsMarketing} />;
}

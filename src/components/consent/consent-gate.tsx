"use client";

import { useState } from "react";
import { ConsentModal } from "./consent-modal";

type Props = {
  needsConsent: boolean;
};

export function ConsentGate({ needsConsent }: Props) {
  const [showModal, setShowModal] = useState(needsConsent);

  if (!showModal) return null;

  return <ConsentModal onComplete={() => setShowModal(false)} />;
}

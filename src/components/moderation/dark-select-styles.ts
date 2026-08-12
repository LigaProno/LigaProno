import type { CSSProperties } from "react";

/** Stil comun pentru <select> pe fundal dark — evită text alb pe dropdown alb (Windows). */
export const darkSelectStyle: CSSProperties = {
  backgroundColor: "#0A0B1E",
  color: "#FFFFFF",
  borderColor: "rgba(255,255,255,0.12)",
  colorScheme: "dark",
};

export const darkOptionStyle: CSSProperties = {
  backgroundColor: "#0A0B1E",
  color: "#FFFFFF",
};

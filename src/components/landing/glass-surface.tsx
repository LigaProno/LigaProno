import type { ElementType, ReactNode } from "react";

/** Reusable liquid-glass surface — pass `className` for shape/size modifiers */
export function Glass({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return <Tag className={`glass ${className}`.trim()}>{children}</Tag>;
}

import type { MermaidConfig } from "mermaid";

export const FONT_STACK =
  '"trebuchet ms", verdana, arial, "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", sans-serif';

export function mermaidConfig(): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "default",
    fontFamily: FONT_STACK,
    er: { useMaxWidth: false },
  };
}

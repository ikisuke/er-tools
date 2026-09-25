import type { MermaidConfig } from "mermaid";

export type ColorScheme = "light" | "dark";

export const FONT_STACK =
  '"Inter", "Segoe UI", system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", sans-serif';

const palettes: Record<ColorScheme, NonNullable<MermaidConfig["themeVariables"]>> = {
  light: {
    background: "#ffffff",
    primaryColor: "#eef2ff",
    primaryBorderColor: "#6366f1",
    primaryTextColor: "#1e1b4b",
    secondaryColor: "#f8fafc",
    tertiaryColor: "#ffffff",
    lineColor: "#94a3b8",
    textColor: "#334155",
    rowOdd: "#ffffff",
    rowEven: "#f8fafc",
    edgeLabelBackground: "#ffffff",
  },
  dark: {
    background: "#0f1422",
    primaryColor: "#1e2240",
    primaryBorderColor: "#818cf8",
    primaryTextColor: "#e0e7ff",
    secondaryColor: "#161b2e",
    tertiaryColor: "#131829",
    lineColor: "#64748b",
    textColor: "#cbd5e1",
    rowOdd: "#121727",
    rowEven: "#181e34",
    edgeLabelBackground: "#0f1422",
  },
};

export function mermaidConfig(scheme: ColorScheme): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    darkMode: scheme === "dark",
    fontFamily: FONT_STACK,
    themeVariables: { ...palettes[scheme], fontFamily: FONT_STACK, fontSize: "14px" },
    er: { useMaxWidth: false },
  };
}

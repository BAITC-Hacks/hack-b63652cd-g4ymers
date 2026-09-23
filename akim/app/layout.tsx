import type { Metadata } from "next";
import "./globals.css";
import "./map-workspace.css";
import "./immersive-map.css";
import "./backend-ui.css";
import "./brand-theme.css";
import "./scenario-flow.css";

export const metadata: Metadata = {
  title: "E-AkimAI — Аким на 5 часов",
  icons: { icon: "/brand/mark.svg" },
  description: "Один бюджет. Пять решений. Интерактивный симулятор развития Астаны — HackAlem AI 2026, команда g4ymers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

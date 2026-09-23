import type { Metadata } from "next";
import "./globals.css";
import "./map-workspace.css";
import "./immersive-map.css";
import "./backend-ui.css";

export const metadata: Metadata = {
  title: "Аким на 5 часов — Astana City Lab",
  description: "Один бюджет. Пять решений. Интерактивный симулятор развития Астаны — HackAlem AI 2026, команда g4ymers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

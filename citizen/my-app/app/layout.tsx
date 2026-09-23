import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Қалаға көмект — город рядом",
  description: "Сообщите о городской проблеме и следите за её решением.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ru"><body>{children}</body></html>;
}

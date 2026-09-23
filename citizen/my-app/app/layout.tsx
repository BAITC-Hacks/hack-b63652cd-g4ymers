import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./onboarding.css";
import { CitizenAuthProvider } from "@/components/citizen/auth-provider";

export const metadata: Metadata = {
  title: "Қалаға көмект — город рядом",
  description: "Сообщите о городской проблеме и следите за её решением.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ru"><body><CitizenAuthProvider>{children}</CitizenAuthProvider></body></html>;
}

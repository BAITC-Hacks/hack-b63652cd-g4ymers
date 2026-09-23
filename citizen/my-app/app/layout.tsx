import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./onboarding.css";
import "./brand-theme.css";
import { CitizenAuthProvider } from "@/components/citizen/auth-provider";

export const metadata: Metadata = {
  title: "E-AkimAI — кабинет жителя",
  description: "Ваш голос меняет город. Выберите район Астаны на карте, сообщите о проблеме и следите за её решением.",
  icons: { icon: "/brand/mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ru"><body><CitizenAuthProvider>{children}</CitizenAuthProvider></body></html>;
}

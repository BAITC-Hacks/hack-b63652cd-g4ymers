import type { Metadata } from "next";
import { CitizenShell } from "@/components/citizen/citizen-shell";

export const metadata: Metadata = {
  title: "E-AkimAI — кабинет жителя",
  description: "Сообщите о городской проблеме и следите за её решением.",
};

export default function CitizenLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <CitizenShell>{children}</CitizenShell>;
}

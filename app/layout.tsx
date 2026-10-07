import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Alma Estudio | Turnos",
  description: "Agendá tu próximo turno en Alma Estudio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`h-full antialiased ${poppins.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

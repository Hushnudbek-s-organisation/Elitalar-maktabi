import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolOS — Maktab boshqaruv tizimi",
  description:
    "O'zbekiston maktablari uchun zamonaviy boshqaruv platformasi: jurnal, davomat, baholar, dars jadvali, ota-onalar bilan aloqa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

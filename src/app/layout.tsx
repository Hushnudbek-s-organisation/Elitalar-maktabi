import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "ELITA | Maktab platformasi",
    template: "%s | ELITA",
  },
  description: "ELITA maktabining ta'lim, aloqa va o'quvchi yutuqlari platformasi.",
  applicationName: "ELITA eMaktab",
};

export const viewport: Viewport = {
  themeColor: "#f5f8ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

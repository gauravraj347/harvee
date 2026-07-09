import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI SQL Assistant",
  description: "Upload CSV/Excel and query your data with natural language",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

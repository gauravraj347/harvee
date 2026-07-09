import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "AI Course Allocation System",
  description: "AI-powered student course allocation with merit + reservation logic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
          AI-Powered Student Course Allocation System · Next.js · PostgreSQL · OpenAI
        </footer>
      </body>
    </html>
  );
}

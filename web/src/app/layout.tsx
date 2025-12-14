import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WalletProvider } from "@/providers/wallet-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacks Receipt of Life",
  description:
    "Stamp your Receipt — a Receipt of Life — on Stacks with Clarity 4.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">
        <WalletProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 bg-white">
              <div className="mx-auto w-full max-w-5xl px-4 py-10">
                {children}
                <Analytics />
              </div>
            </main>
            <Footer />
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}

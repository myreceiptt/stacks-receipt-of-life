import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WalletProvider } from "@/providers/wallet-provider";
import { AppKit } from "@/context/appkit";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacks Receipt of Life",
  description:
    "Stamp your Receipt — a Receipt of Life — on Stacks with Clarity 4.",
  other: {
    "talentapp:project_verification":
      "3a6336008dfd8b5510d66f5cbb6e9dd00be025bfa9774a77478bba7a3b0c1cd99f81a356c31c2d89d7e9d84ae4a7e2bd0c71c00dba2b255fd8d51a9e864bfb23",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">
        <AppKit>
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
        </AppKit>
      </body>
    </html>
  );
}

"use client";

import dynamic from "next/dynamic";

const MyReceiptsClient = dynamic(
  () => import("@/components/my-receipts").then((m) => m.MyReceipts),
  {
    ssr: false, // komponen ini hanya dirender di browser
  }
);

export default function MeClientPage() {
  return <MyReceiptsClient />;
}

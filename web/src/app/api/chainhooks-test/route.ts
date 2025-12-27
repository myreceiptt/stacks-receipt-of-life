import { NextResponse } from "next/server";
import {
  ChainhooksClient,
  CHAINHOOKS_BASE_URL,
} from "@hirosystems/chainhooks-client";

export async function GET() {
  // For now this is just a sanity check that the client can be imported and constructed.
  new ChainhooksClient({
    baseUrl: CHAINHOOKS_BASE_URL.testnet, // switch to .mainnet later if needed
    apiKey: process.env.HIRO_API_KEY || "dummy-key",
  });

  return NextResponse.json({
    ok: true,
    message: "Chainhooks client imported and constructed",
  });
}

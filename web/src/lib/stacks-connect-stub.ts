// src/lib/stacks-connect-stub.ts
// Hanya dipakai di SERVER via webpack alias untuk "@stacks/connect".
// Di browser, Next.js tetap memakai package "@stacks/connect" asli.

export type StacksConnectRequestFn = (
  opts: { forceWalletSelect?: boolean },
  method: string,
  params?: unknown
) => Promise<unknown>;

export const request: StacksConnectRequestFn = async (opts, method, params) => {
  // Supaya tidak dianggap unused oleh ESLint
  void opts;
  void method;
  void params;

  // Stub ini seharusnya TIDAK pernah terpanggil di runtime server.
  // Kalau sampai terpanggil, berarti ada kode wallet yang jalan di server.
  throw new Error(
    "@stacks/connect request() stub was called on the server. " +
      "Wallet calls must only run in the browser."
  );
};

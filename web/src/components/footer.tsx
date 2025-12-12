export function Footer() {
  return (
    <footer className="border-t border-black bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-neutral-700 sm:flex-row">
        <span>
          © {new Date().getFullYear()} Prof. NOTA Inc. · ENDHONESA.COM
        </span>
        <span className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full border border-black" />
          <span>MyReceipt · $MyReceipt</span>
        </span>
      </div>
    </footer>
  );
}

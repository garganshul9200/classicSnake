/** Full-screen blocker — app waits here until the device is back online. */
export function OfflineGate() {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#06120c]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-title"
      aria-describedby="offline-desc"
    >
      <div className="flex w-full max-w-sm flex-col items-center px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-3xl text-emerald-300">
          📡
        </div>
        <h1 id="offline-title" className="mt-5 text-3xl font-black text-emerald-100">
          No Internet
        </h1>
        <p id="offline-desc" className="mt-2 text-sm font-semibold leading-relaxed text-emerald-200/60">
          Snake Line needs a connection to keep playing. The app will resume
          automatically when you’re back online.
        </p>
        <div className="mt-6 flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-lime-300">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lime-300" />
          Waiting for connection
        </div>
        <div className="mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
        </div>
      </div>
    </div>
  );
}

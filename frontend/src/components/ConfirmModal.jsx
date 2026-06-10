export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      {/* Clickable backdrop overlay to close modal */}
      <div className="absolute inset-0 -z-10" onClick={onCancel} />
      
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden text-white">
        <h2 className="text-xl font-bold font-outfit text-white">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
        {children ? <div className="mt-5">{children}</div> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

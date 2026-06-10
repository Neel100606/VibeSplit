import { useToast } from '../context/ToastContext.jsx';

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const toneClasses =
          toast.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${toneClasses}`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}

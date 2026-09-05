import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success' || !toast.type
        const isError = toast.type === 'error'

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-xl border text-[0.85rem] font-medium transition-all animate-slide-up ${
              isError
                ? 'bg-red-50 text-red-800 border-red-200'
                : isSuccess
                ? 'bg-[#101018] text-white border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.4)]'
                : 'bg-white text-navy border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isError ? (
                <AlertCircle size={18} className="text-red-600 shrink-0" />
              ) : isSuccess ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              ) : (
                <Info size={18} className="text-blue-500 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="opacity-70 hover:opacity-100 p-1 rounded-lg border-0 bg-transparent text-current cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

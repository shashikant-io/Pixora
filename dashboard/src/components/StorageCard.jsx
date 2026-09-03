import { Sparkles } from 'lucide-react'

export default function StorageCard({ onUpgrade }) {
  const percentage = 0
  const used = 0
  const total = 1200

  return (
    <section aria-label="Storage Plan" className="px-5 mt-4">
      <div className="storage-card-bg rounded-[22px] px-5 pt-5 pb-5 text-white">
        {/* Top Row: Icon + Title + Upgrade */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-white/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <span className="text-[0.95rem] font-semibold tracking-[-0.01em]">Storage Plan</span>
          </div>

          <button
            onClick={onUpgrade}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 transition-colors text-white text-[0.65rem] font-bold tracking-[0.06em] px-3.5 py-[7px] rounded-full uppercase cursor-pointer border-0"
            aria-label="Upgrade storage plan"
          >
            <Sparkles size={12} className="text-yellow-300" />
            <span>Upgrade</span>
          </button>
        </div>

        {/* Percentage display */}
        <div className="mb-0.5 relative z-10">
          <span className="text-[2.4rem] font-extrabold leading-none tracking-tight">{percentage}%</span>
        </div>

        {/* Photos count */}
        <p className="text-white/55 text-[0.82rem] mb-4 relative z-10">
          {used.toLocaleString()} of {total.toLocaleString()} photos used
        </p>

        {/* Progress Bar */}
        <div className="progress-track h-[7px] relative z-10">
          <div
            className="progress-fill h-full"
            style={{ width: `${Math.max(percentage, 2)}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </section>
  )
}

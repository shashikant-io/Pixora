import { X, Check, Sparkles, Zap, Crown } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    photos: '1,200',
    storage: '5 GB',
    features: ['1,200 photo uploads', '5 GB S3 storage', 'AI face recognition', 'QR code sharing', 'Basic support'],
    isCurrent: true,
    icon: <Zap size={20} />,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
  {
    name: 'Pro',
    price: '₹999',
    period: '/month',
    photos: '25,000',
    storage: '100 GB',
    features: ['25,000 photo uploads', '100 GB S3 storage', 'AI face recognition', 'Priority processing', 'Custom branding', 'Priority support'],
    isPopular: true,
    icon: <Sparkles size={20} />,
    bg: 'bg-card-events',
    border: 'border-icon-events',
  },
  {
    name: 'Enterprise',
    price: '₹2,999',
    period: '/month',
    photos: 'Unlimited',
    storage: '1 TB',
    features: ['Unlimited uploads', '1 TB S3 storage', 'AI face recognition', 'White-label branding', 'API access', 'Dedicated support', 'Custom domain'],
    icon: <Crown size={20} />,
    bg: 'bg-card-photos',
    border: 'border-orange',
  },
]

export default function UpgradeModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div className="modal-enter bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 id="upgrade-title" className="text-[1.2rem] font-bold text-navy">
            Upgrade Storage Plan
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-muted hover:bg-gray-200 transition-colors border-0 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 ${plan.border} ${plan.bg} p-4`}
            >
              {plan.isPopular && (
                <span className="absolute -top-2.5 right-4 bg-icon-events text-white text-[0.65rem] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Popular
                </span>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-navy">{plan.icon}</div>
                  <span className="text-[1rem] font-bold text-navy">{plan.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[1.3rem] font-extrabold text-navy">{plan.price}</span>
                  <span className="text-muted text-[0.75rem]">{plan.period}</span>
                </div>
              </div>

              <ul className="flex flex-col gap-1.5 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[0.8rem] text-gray-600">
                    <Check size={14} className="text-icon-bookings shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-2.5 rounded-xl font-semibold text-[0.85rem] border-0 cursor-pointer transition-colors ${
                  plan.isCurrent
                    ? 'bg-gray-200 text-muted cursor-default'
                    : 'bg-navy text-white hover:bg-navy-light'
                }`}
                disabled={plan.isCurrent}
              >
                {plan.isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

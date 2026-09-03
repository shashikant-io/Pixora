import { Receipt, CreditCard } from 'lucide-react'

export default function BillingPage() {
  return (
    <div className="section-enter px-5 pt-2 pb-6">
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold text-navy">Billing</h1>
        <p className="text-muted text-[0.82rem] mt-0.5">Manage your subscription and invoices</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-card-events flex items-center justify-center">
            <CreditCard size={20} className="text-icon-events" />
          </div>
          <div>
            <p className="text-[0.78rem] text-muted font-medium">Current Plan</p>
            <p className="text-[1rem] font-bold text-navy">Free</p>
          </div>
        </div>
        <div className="bg-[#F5F5F8] rounded-xl p-3 text-[0.82rem] text-muted">
          1,200 photos • 5 GB storage • AI face recognition
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5">
        <h3 className="text-[0.95rem] font-bold text-navy mb-4">Invoice History</h3>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-14 h-14 rounded-full bg-card-photos flex items-center justify-center mb-3">
            <Receipt size={24} className="text-icon-photos" />
          </div>
          <p className="text-muted text-[0.85rem]">No invoices yet</p>
        </div>
      </div>
    </div>
  )
}

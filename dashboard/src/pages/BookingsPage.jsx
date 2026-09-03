import { Calendar } from 'lucide-react'

export default function BookingsPage() {
  return (
    <div className="section-enter px-5 pt-2 pb-6">
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold text-navy">Bookings</h1>
        <p className="text-muted text-[0.82rem] mt-0.5">View and manage your upcoming sessions</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-card-bookings flex items-center justify-center mb-4">
          <Calendar size={28} className="text-icon-bookings" />
        </div>
        <h3 className="text-[1.05rem] font-bold text-navy mb-1.5">No bookings yet</h3>
        <p className="text-muted text-[0.85rem] leading-relaxed max-w-[260px]">
          Once clients start booking your services, they will appear here.
        </p>
      </div>
    </div>
  )
}

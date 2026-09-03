export default function UpcomingBookings({ onViewAll }) {
  return (
    <section aria-label="Upcoming Bookings" className="px-5 mt-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[1.05rem] font-bold text-navy">
          Upcoming Bookings
        </h2>
        <button
          onClick={onViewAll}
          className="text-orange text-[0.85rem] font-semibold bg-transparent border-0 cursor-pointer hover:underline"
          aria-label="View all bookings"
        >
          View all
        </button>
      </div>

      {/* Empty State */}
      <div className="dashed-card rounded-2xl bg-white/70 py-6 px-4 flex items-center justify-center">
        <p className="text-muted text-[0.88rem]">No upcoming bookings</p>
      </div>
    </section>
  )
}

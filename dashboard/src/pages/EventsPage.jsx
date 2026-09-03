import { Calendar, MapPin, Plus, Camera, MoreVertical } from 'lucide-react'

export default function EventsPage({ onCreateEvent }) {
  return (
    <div className="section-enter px-5 pt-2 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[1.4rem] font-bold text-navy">Events</h1>
          <p className="text-muted text-[0.82rem] mt-0.5">Manage your wedding & event shoots</p>
        </div>
        <button
          onClick={onCreateEvent}
          className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center border-0 cursor-pointer hover:bg-navy-light transition-colors shadow-md"
          aria-label="Create new event"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-card-events flex items-center justify-center mb-4">
          <Calendar size={28} className="text-icon-events" />
        </div>
        <h3 className="text-[1.05rem] font-bold text-navy mb-1.5">No events yet</h3>
        <p className="text-muted text-[0.85rem] leading-relaxed mb-5 max-w-[240px]">
          Create your first event to start uploading and sharing photos.
        </p>
        <button
          onClick={onCreateEvent}
          className="bg-navy hover:bg-navy-light text-white font-bold text-[0.88rem] py-3 px-8 rounded-2xl transition-colors cursor-pointer border-0 flex items-center gap-2"
        >
          <Plus size={16} />
          Create Event
        </button>
      </div>
    </div>
  )
}

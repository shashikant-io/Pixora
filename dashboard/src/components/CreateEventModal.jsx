import { useState } from 'react'
import { X, Calendar, MapPin, Plus } from 'lucide-react'

export default function CreateEventModal({ isOpen, onClose }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !date) return

    setIsSubmitting(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200))
    setIsSubmitting(false)
    setName('')
    setDate('')
    setLocation('')
    onClose()
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
    >
      <div className="modal-enter bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[90vh] overflow-y-auto">
        {/* Close handle (mobile) */}
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="create-event-title" className="text-[1.2rem] font-bold text-navy">
            Create New Event
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-muted hover:bg-gray-200 transition-colors border-0 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Event Name */}
          <div>
            <label className="text-[0.78rem] font-semibold text-navy mb-1.5 block">
              Event Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul & Priya's Wedding"
              required
              className="w-full bg-[#F5F5F8] border border-gray-200 rounded-xl px-4 py-3 text-[0.88rem] text-navy placeholder-muted outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-[0.78rem] font-semibold text-navy mb-1.5 block">
              Event Date
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#F5F5F8] border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-[0.88rem] text-navy outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-[0.78rem] font-semibold text-navy mb-1.5 block">
              Venue / Location
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Udaipur Palace, Rajasthan"
                className="w-full bg-[#F5F5F8] border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-[0.88rem] text-navy placeholder-muted outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !date}
            className="w-full bg-navy hover:bg-navy-light active:bg-navy-dark disabled:opacity-50 text-white font-bold text-[0.92rem] py-3.5 rounded-2xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Creating…
              </span>
            ) : (
              <>
                <Plus size={18} />
                Create Event
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

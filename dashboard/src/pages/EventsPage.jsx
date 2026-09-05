import { useState } from 'react'
import { Calendar, MapPin, Plus, Camera, Trash2, Copy, Check, ExternalLink } from 'lucide-react'

export default function EventsPage({ events = [], onCreateEvent, onDeleteEvent, isLoading = false }) {
  const [copiedId, setCopiedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const handleCopyLink = async (ev) => {
    const token = ev.accessToken || ev.eventId
    const url = ev.guestUrl || `${window.location.origin}/guest-login.html?token=${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(ev.eventId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (e) {
      console.warn('Copy failed:', e)
    }
  }

  const handleDelete = async (ev) => {
    if (!window.confirm(`Are you sure you want to delete event "${ev.name}"? This cannot be undone.`)) {
      return
    }
    setDeletingId(ev.eventId)
    try {
      if (onDeleteEvent) {
        await onDeleteEvent(ev.eventId)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="section-enter px-5 pt-2 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[1.4rem] font-bold text-navy">Events</h1>
          <p className="text-muted text-[0.82rem] mt-0.5">
            {events.length > 0
              ? `${events.length} active event${events.length === 1 ? '' : 's'} managed`
              : 'Manage your wedding & event shoots'}
          </p>
        </div>
        <button
          onClick={onCreateEvent}
          className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center border-0 cursor-pointer hover:bg-navy-light transition-colors shadow-md"
          aria-label="Create new event"
        >
          <Plus size={20} />
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-3 border-navy border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-muted text-[0.85rem]">Loading wedding events…</p>
        </div>
      ) : events.length === 0 ? (
        /* Empty State */
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
            className="bg-navy hover:bg-navy-light text-white font-bold text-[0.88rem] py-3 px-8 rounded-2xl transition-colors cursor-pointer border-0 flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Create Event
          </button>
        </div>
      ) : (
        /* Real Event Cards List */
        <div className="flex flex-col gap-3.5">
          {events.map((ev) => {
            const token = ev.accessToken || ev.eventId
            const guestUrl =
              ev.guestUrl || `${window.location.origin}/guest-login.html?token=${token}`
            const formattedDate = ev.date
              ? new Date(ev.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Date not set'

            return (
              <div
                key={ev.eventId || ev._id}
                className="bg-white rounded-3xl border border-gray-100/90 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col gap-3 transition-all hover:border-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[1.1rem] font-bold text-navy leading-snug">
                      {ev.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-muted text-[0.78rem]">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {formattedDate}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[0.72rem] font-mono font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg shrink-0">
                    {ev.eventId}
                  </span>
                </div>

                {/* Photo count pill */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[0.78rem] font-semibold rounded-full">
                    <Camera size={13} />
                    {ev.photoCount || 0} Photos
                  </span>
                </div>

                {/* Guest access link box */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center justify-between gap-2 mt-1">
                  <div className="overflow-hidden">
                    <div className="text-[0.68rem] uppercase font-bold tracking-wider text-muted">
                      Guest Access Token
                    </div>
                    <div className="text-[0.76rem] font-mono text-navy truncate max-w-[160px] sm:max-w-[220px]">
                      {token}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(ev)}
                      className="px-2.5 py-1.5 text-[0.75rem] font-semibold bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-navy flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy guest login link"
                    >
                      {copiedId === ev.eventId ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <a
                      href={guestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-navy hover:bg-gray-50 transition-colors"
                      title="Open guest view"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleDelete(ev)}
                    disabled={deletingId === ev.eventId}
                    className="text-[0.76rem] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-xl flex items-center gap-1 border-0 cursor-pointer transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>{deletingId === ev.eventId ? 'Deleting…' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

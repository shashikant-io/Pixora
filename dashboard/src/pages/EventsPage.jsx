import { useState } from 'react'
import {
  Calendar,
  MapPin,
  Plus,
  Camera,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Upload,
  Search,
  SlidersHorizontal,
} from 'lucide-react'

export default function EventsPage({
  events = [],
  onCreateEvent,
  onOpenQr,
  onOpenDelete,
  onQuickUpload,
  onToast,
  isLoading = false,
}) {
  const [copiedId, setCopiedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'name'

  const handleCopyLink = async (ev) => {
    const token = ev.accessToken || ev.eventId
    const url =
      ev.guestUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/guest-login.html?token=${token}`
        : `/guest-login.html?token=${token}`)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(ev.eventId)
      if (onToast) onToast(`Guest link copied for "${ev.name}"`, 'success')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (e) {
      if (onToast) onToast('Failed to copy link.', 'error')
    }
  }

  const filteredEvents = events
    .filter((ev) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        (ev.name && ev.name.toLowerCase().includes(q)) ||
        (ev.location && ev.location.toLowerCase().includes(q)) ||
        (ev.eventId && ev.eventId.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '')
      }
      const dateA = new Date(a.date || 0).getTime()
      const dateB = new Date(b.date || 0).getTime()
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA
    })

  return (
    <div className="section-enter px-5 pt-2 pb-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[1.5rem] font-bold text-navy">Events Management</h1>
          <p className="text-muted text-[0.84rem] mt-0.5">
            {events.length > 0
              ? `${events.length} active event album${events.length === 1 ? '' : 's'} managed`
              : 'Create and distribute your wedding albums'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateEvent}
          className="bg-navy hover:bg-navy-light text-white font-bold text-[0.88rem] py-3 px-5 rounded-2xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          <Plus size={18} />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Search & Sort Filters */}
      {events.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by name, location, or ID..."
              className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-[0.85rem] text-navy outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all placeholder-muted shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal size={16} className="text-muted shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-[0.82rem] font-semibold text-navy outline-none cursor-pointer shadow-2xs"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name">Sort: Event Name</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-3 border-navy border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-muted text-[0.85rem]">Loading wedding events…</p>
        </div>
      ) : events.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-gray-100 p-12 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-card-events flex items-center justify-center mb-4 text-icon-events">
            <Calendar size={28} />
          </div>
          <h3 className="text-[1.1rem] font-bold text-navy mb-1.5">No events found</h3>
          <p className="text-muted text-[0.85rem] leading-relaxed mb-6 max-w-xs">
            Create your first wedding event to generate a guest QR code and upload photos to AWS S3.
          </p>
          <button
            type="button"
            onClick={onCreateEvent}
            className="bg-navy hover:bg-navy-light text-white font-bold text-[0.9rem] py-3.5 px-8 rounded-2xl transition-colors cursor-pointer border-0 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span>Create First Event</span>
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center text-muted text-[0.88rem]">
          No events match "{searchQuery}".
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => {
            const token = ev.accessToken || ev.eventId
            const guestUrl =
              ev.guestUrl ||
              (typeof window !== 'undefined'
                ? `${window.location.origin}/guest-login.html?token=${token}`
                : `/guest-login.html?token=${token}`)
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
                className="bg-white rounded-3xl border border-gray-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4 transition-all hover:border-gray-200 hover:shadow-md"
              >
                <div>
                  {/* Top: Name + Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[1.1rem] font-bold text-navy leading-snug">
                      {ev.name}
                    </h3>
                    <span className="text-[0.72rem] font-mono font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg shrink-0">
                      {ev.eventId}
                    </span>
                  </div>

                  {/* Date & Location */}
                  <div className="flex flex-wrap items-center gap-3 text-muted text-[0.78rem] mb-3">
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

                  {/* Photo count pill */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-[0.76rem] font-bold rounded-full border border-amber-200/50">
                      <Camera size={13} className="text-amber-600" />
                      {ev.photoCount || 0} Photos
                    </span>
                  </div>

                  {/* Guest Access Link Box */}
                  <div className="bg-[#F8F8FA] border border-gray-200/80 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="overflow-hidden min-w-0">
                      <div className="text-[0.66rem] uppercase font-bold tracking-wider text-muted">
                        Guest Access Token
                      </div>
                      <div className="text-[0.76rem] font-mono text-navy truncate" title={token}>
                        {token}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(ev)}
                        className="px-2.5 py-1.5 text-[0.74rem] font-semibold bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-navy flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Copy Guest URL"
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
                        className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-navy hover:bg-gray-50 transition-colors shadow-2xs no-underline"
                        title="Open Guest View"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons: QR Code, Upload, Delete */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenQr && onOpenQr(ev)}
                      className="px-3 py-1.5 text-[0.78rem] font-semibold bg-[#F5F5F8] hover:bg-gray-200 text-navy rounded-xl border-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="View & Download QR Code"
                    >
                      <QrCode size={14} />
                      <span>QR Code</span>
                    </button>

                    {onQuickUpload && (
                      <button
                        type="button"
                        onClick={() => onQuickUpload(ev.eventId)}
                        className="px-3 py-1.5 text-[0.78rem] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Upload photos to this event"
                      >
                        <Upload size={14} className="text-amber-600" />
                        <span>Upload</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDelete && onOpenDelete(ev)}
                    className="text-[0.78rem] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 border-0 cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
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

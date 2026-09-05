import { useEffect, useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { deleteEvent } from '../services/api'

export default function DeleteConfirmModal({ event, isOpen, onClose, onDeleted, onToast }) {
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen || !event) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      const data = await deleteEvent(event.eventId)
      if (data.success) {
        if (onToast) onToast(`Event "${event.name}" deleted successfully.`, 'success')
        if (onDeleted) await onDeleted(event.eventId)
        onClose()
      } else {
        throw new Error(data.message || 'Could not delete event.')
      }
    } catch (err) {
      console.error('Delete error:', err)
      if (onToast) onToast(err.message || 'Failed to delete event.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && !isDeleting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="modal-enter bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center flex flex-col items-center">
        {/* Warning Badge */}
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
          <AlertTriangle size={24} />
        </div>

        <h3 id="delete-modal-title" className="text-[1.2rem] font-bold text-navy mb-2">
          Delete Event?
        </h3>

        <p className="text-muted text-[0.82rem] leading-relaxed mb-6">
          Are you sure you want to permanently delete event{' '}
          <strong className="text-navy">"{event.name}"</strong> (
          <code className="text-[0.76rem] font-mono bg-gray-100 px-1 py-0.5 rounded">
            {event.eventId}
          </code>
          )?
          <br />
          <br />
          All uploaded photos will be removed from <strong className="text-navy">AWS S3 cloud storage</strong> and freed from your storage quota. This action cannot be undone.
        </p>

        <div className="w-full flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold text-[0.86rem] py-3.5 rounded-2xl border-0 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold text-[0.86rem] py-3.5 rounded-2xl border-0 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Delete Event</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

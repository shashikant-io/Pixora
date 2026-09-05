import { useEffect, useRef, useState } from 'react'
import { X, QrCode, Copy, Check, Download, ExternalLink } from 'lucide-react'
import QRCodeLib from 'qrcode'

export default function QrCodeModal({ event, isOpen, onClose, onToast }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [qrLoaded, setQrLoaded] = useState(false)

  const token = event?.accessToken || event?.eventId || ''
  const guestUrl =
    event?.guestUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/guest-login.html?token=${token}`
      : `/guest-login.html?token=${token}`)

  useEffect(() => {
    if (!isOpen || !event) return

    let isMounted = true
    setQrLoaded(false)

    const renderQr = async () => {
      if (canvasRef.current) {
        try {
          await QRCodeLib.toCanvas(canvasRef.current, guestUrl, {
            width: 240,
            margin: 1,
            color: {
              dark: '#09090B',
              light: '#FFFFFF',
            },
          })
          if (isMounted) setQrLoaded(true)
        } catch (err) {
          console.warn('Local QRCode render failed, trying image fallback:', err)
        }
      }
    }

    // Allow canvas DOM node to attach
    const timer = setTimeout(renderQr, 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      isMounted = false
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, event, guestUrl, onClose])

  if (!isOpen || !event) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl)
      setCopied(true)
      if (onToast) onToast('Guest access link copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      if (onToast) onToast('Failed to copy link.', 'error')
    }
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (canvas) {
      try {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `${event.eventId}-guest-qr.png`
        a.click()
        if (onToast) onToast(`Downloaded QR Code for "${event.name}"`, 'success')
        return
      } catch (e) {
        console.warn('Canvas download error:', e)
      }
    }

    // Direct endpoint fallback
    const a = document.createElement('a')
    a.href = `/api/events/${encodeURIComponent(event.eventId)}/qr?format=png&download=true&guestUrl=${encodeURIComponent(guestUrl)}`
    a.download = `${event.eventId}-guest-qr.png`
    a.click()
    if (onToast) onToast(`Downloaded QR Code for "${event.name}"`, 'success')
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[110] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="modal-enter bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center flex flex-col items-center">
        {/* Header Badge */}
        <div className="w-12 h-12 rounded-2xl bg-navy/10 text-navy flex items-center justify-center mb-3">
          <QrCode size={24} />
        </div>

        <h3 id="qr-modal-title" className="text-[1.2rem] font-bold text-navy mb-1 leading-tight">
          {event.name} — Guest QR
        </h3>
        <p className="text-muted text-[0.8rem] mb-4 max-w-[260px]">
          Guests can scan this code to sign in and find their photos automatically.
        </p>

        {/* QR Code Canvas Frame */}
        <div className="bg-white p-3.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-gray-100 inline-flex items-center justify-center mb-4 min-w-[240px] min-h-[240px]">
          <canvas
            ref={canvasRef}
            width={240}
            height={240}
            className="block max-w-full h-auto rounded-lg"
          />
        </div>

        {/* URL Box */}
        <div className="w-full bg-[#F5F5F8] border border-gray-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 mb-4 text-left">
          <div className="overflow-hidden min-w-0">
            <div className="text-[0.66rem] uppercase font-bold tracking-wider text-muted">
              Guest Access URL
            </div>
            <div className="text-[0.76rem] font-mono text-navy truncate" title={guestUrl}>
              {guestUrl}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 text-[0.75rem] font-semibold bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-navy flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            {copied ? (
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
        </div>

        {/* Modal Actions */}
        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full bg-navy hover:bg-navy-light active:bg-navy-dark text-white font-bold text-[0.88rem] py-3.5 rounded-2xl border-0 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Download size={16} />
            <span>Download QR Code (PNG)</span>
          </button>

          <div className="flex gap-2 w-full">
            <a
              href={guestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white hover:bg-gray-50 text-navy font-semibold text-[0.84rem] py-3 rounded-2xl border border-gray-200 transition-colors flex items-center justify-center gap-1.5 no-underline"
            >
              <ExternalLink size={14} />
              <span>Open Guest Page</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[0.84rem] py-3 rounded-2xl border-0 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

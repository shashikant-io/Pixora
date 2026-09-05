import { useState, useRef, useEffect } from 'react'
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { uploadPhotoFile } from '../services/api'

export default function UploadWorkspace({
  events = [],
  selectedEventId = '',
  onSelectEvent,
  onUploadComplete,
  onToast,
}) {
  const [targetEventId, setTargetEventId] = useState(selectedEventId || '')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [uploadLog, setUploadLog] = useState([])

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (selectedEventId) {
      setTargetEventId(selectedEventId)
    } else if (events.length > 0 && !targetEventId) {
      setTargetEventId(events[0].eventId)
    }
  }, [selectedEventId, events, targetEventId])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files?.length) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e) => {
    if (e.target?.files?.length) {
      addFiles(Array.from(e.target.files))
    }
  }

  const addFiles = (newFiles) => {
    const validImages = newFiles.filter((f) => f.type.startsWith('image/'))
    if (!validImages.length) {
      if (onToast) onToast('Please select valid image files (JPG, PNG, WEBP).', 'error')
      return
    }

    const fileObjects = validImages.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      preview: URL.createObjectURL(file),
      status: 'queued', // 'queued' | 'uploading' | 'done' | 'error'
      error: null,
    }))

    setSelectedFiles((prev) => [...prev, ...fileObjects])
  }

  const removeFile = (id) => {
    setSelectedFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((f) => f.id !== id)
    })
  }

  const clearAllFiles = () => {
    selectedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview)
    })
    setSelectedFiles([])
    setUploadLog([])
    setOverallProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!targetEventId) {
      if (onToast) onToast('Please choose an event to upload photos to.', 'error')
      return
    }

    if (!selectedFiles.length) {
      if (onToast) onToast('Please select photos to upload.', 'error')
      return
    }

    setIsUploading(true)
    setOverallProgress(0)

    const total = selectedFiles.length
    let successful = 0
    let failed = 0

    const initialLogs = selectedFiles.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      status: 'pending',
      error: null,
    }))
    setUploadLog(initialLogs)

    for (let i = 0; i < total; i++) {
      const currentItem = selectedFiles[i]

      setUploadLog((prev) =>
        prev.map((log) =>
          log.id === currentItem.id ? { ...log, status: 'uploading' } : log
        )
      )

      try {
        await uploadPhotoFile(targetEventId, currentItem.file, (filePercent) => {
          const overall = Math.round(((i + filePercent / 100) / total) * 100)
          setOverallProgress(overall)
        })

        successful++
        setUploadLog((prev) =>
          prev.map((log) =>
            log.id === currentItem.id ? { ...log, status: 'done' } : log
          )
        )
      } catch (err) {
        failed++
        setUploadLog((prev) =>
          prev.map((log) =>
            log.id === currentItem.id
              ? { ...log, status: 'error', error: err.message || 'Upload failed' }
              : log
          )
        )
      }

      setOverallProgress(Math.round(((i + 1) / total) * 100))
    }

    setIsUploading(false)

    if (successful > 0) {
      if (onToast) {
        onToast(
          `Successfully uploaded ${successful} photo${successful > 1 ? 's' : ''}!`,
          'success'
        )
      }
      if (onUploadComplete) {
        onUploadComplete()
      }
    }

    if (failed > 0 && onToast) {
      onToast(`${failed} photo${failed > 1 ? 's' : ''} failed to upload.`, 'error')
    }
  }

  const selectedEventObj = events.find((e) => e.eventId === targetEventId)

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Upload size={20} />
          </div>
          <div>
            <h2 className="text-[1.15rem] font-bold text-navy">
              Upload Photos Workspace
            </h2>
            <p className="text-muted text-[0.8rem]">
              Bulk upload high-resolution photos with Buffalo AI face indexing.
            </p>
          </div>
        </div>
      </div>

      {/* Target Event Selector */}
      <div>
        <label className="text-[0.78rem] font-semibold text-navy mb-1.5 block">
          Select Target Event
        </label>
        {events.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[0.82rem]">
            No events found. Please create an event first to upload photos.
          </div>
        ) : (
          <select
            value={targetEventId}
            onChange={(e) => {
              setTargetEventId(e.target.value)
              if (onSelectEvent) onSelectEvent(e.target.value)
            }}
            disabled={isUploading}
            className="w-full bg-[#F5F5F8] border border-gray-200 rounded-xl px-4 py-3 text-[0.88rem] text-navy outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all cursor-pointer"
          >
            <option value="">-- Choose an event --</option>
            {events.map((ev) => (
              <option key={ev.eventId} value={ev.eventId}>
                {ev.name} ({ev.eventId}) — {ev.photoCount || 0} Photos
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-navy bg-navy/5 scale-[0.99]'
            : 'border-gray-200 hover:border-navy/40 hover:bg-gray-50/50 bg-[#FAFAFC]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isUploading || !events.length}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-navy mb-3">
          <Upload size={24} />
        </div>

        <p className="text-navy font-bold text-[0.95rem] mb-1">
          Drop high-resolution photos here
        </p>
        <p className="text-muted text-[0.8rem] mb-4 max-w-[280px]">
          or click to browse from your computer (batch upload supported)
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-gray-700 text-[0.72rem] font-semibold rounded-full shadow-2xs">
            <ImageIcon size={12} />
            JPG, PNG, WEBP
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-purple-700 text-[0.72rem] font-semibold rounded-full shadow-2xs">
            <Sparkles size={12} className="text-purple-600" />
            Buffalo AI Face Indexing
          </span>
        </div>
      </div>

      {/* Selected Files Queue Preview */}
      {selectedFiles.length > 0 && (
        <div className="bg-[#F8F8FA] border border-gray-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[0.84rem] font-bold text-navy">
                Selected Photos
              </span>
              <span className="px-2.5 py-0.5 bg-navy text-white text-[0.72rem] font-bold rounded-full">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''}
              </span>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={clearAllFiles}
                className="text-[0.75rem] font-semibold text-red-600 hover:text-red-700 bg-transparent border-0 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto pr-1">
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                className="relative group bg-white border border-gray-200 rounded-xl p-1.5 flex flex-col items-center text-center shadow-2xs"
              >
                <img
                  src={item.preview}
                  alt={item.name}
                  className="w-full h-20 object-cover rounded-lg mb-1"
                />
                <span className="text-[0.7rem] font-medium text-navy truncate w-full px-1">
                  {item.name}
                </span>
                <span className="text-[0.65rem] text-muted">{item.size}</span>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(item.id)
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center border-0 cursor-pointer shadow hover:bg-red-600"
                    aria-label="Remove photo"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !events.length}
          className="flex-1 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 text-navy font-semibold text-[0.88rem] py-3.5 px-4 rounded-2xl border border-gray-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <FolderOpen size={17} />
          <span>Browse Files</span>
        </button>

        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !selectedFiles.length || !targetEventId}
          className="flex-1 bg-navy hover:bg-navy-light active:bg-navy-dark disabled:opacity-50 text-white font-bold text-[0.88rem] py-3.5 px-4 rounded-2xl border-0 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          {isUploading ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Uploading ({overallProgress}%)</span>
            </>
          ) : (
            <>
              <Upload size={17} />
              <span>
                Upload {selectedFiles.length ? `(${selectedFiles.length})` : ''}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Live Upload Progress Queue Log */}
      {(isUploading || uploadLog.length > 0) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mt-2">
          <div className="flex items-center justify-between mb-2 text-[0.82rem]">
            <span className="font-semibold text-navy">
              {isUploading ? 'Processing uploads…' : 'Upload Complete'}
            </span>
            <span className="font-bold text-navy">{overallProgress}%</span>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-linear-to-r from-navy via-purple-600 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1 text-[0.76rem]">
            {uploadLog.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-1 px-2 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {log.status === 'uploading' && (
                    <Loader2 size={13} className="animate-spin text-navy shrink-0" />
                  )}
                  {log.status === 'done' && (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  )}
                  {log.status === 'error' && (
                    <AlertCircle size={13} className="text-red-600 shrink-0" />
                  )}
                  {log.status === 'pending' && (
                    <div className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
                  )}
                  <span className="truncate text-gray-700">{log.name}</span>
                </div>
                <span
                  className={`font-semibold shrink-0 ml-2 ${
                    log.status === 'done'
                      ? 'text-emerald-600'
                      : log.status === 'error'
                      ? 'text-red-600'
                      : 'text-muted'
                  }`}
                >
                  {log.status === 'uploading'
                    ? 'Uploading…'
                    : log.status === 'done'
                    ? 'Uploaded'
                    : log.status === 'error'
                    ? log.error || 'Failed'
                    : 'Queued'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

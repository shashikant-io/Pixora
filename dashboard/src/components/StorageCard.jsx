import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, HardDrive, AlertTriangle } from 'lucide-react'
import { getStorageStats } from '../services/api'

export default function StorageCard({ onUpgrade, onToast }) {
  const [storageData, setStorageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchStats = useCallback(async (force = false) => {
    if (force) setIsSyncing(true)
    else setIsLoading(true)

    try {
      const data = await getStorageStats(force)
      if (data.success) {
        setStorageData(data)
        if (force && onToast) {
          onToast('Live AWS S3 storage synchronized!', 'success')
        }
      }
    } catch (err) {
      console.warn('Could not fetch storage stats:', err)
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }, [onToast])

  useEffect(() => {
    fetchStats()
    const timer = setInterval(() => fetchStats(false), 60000)
    return () => clearInterval(timer)
  }, [fetchStats])

  const percentage = storageData?.storagePercentage !== undefined ? storageData.storagePercentage : 0
  const displayPercentage =
    percentage < 0.1 && percentage > 0 ? '< 0.1' : percentage.toFixed(1)
  const photoCount = storageData?.photoCount || 0

  const storageUsedDisplay =
    storageData?.storageUsedGB >= 1
      ? `${storageData.storageUsedGB} GB`
      : `${storageData?.storageUsedMB || 0} MB`

  const storageLimitDisplay =
    storageData?.storageLimitTB !== undefined
      ? `${storageData.storageLimitTB} TB`
      : storageData?.storageLimitGB !== undefined
      ? storageData.storageLimitGB >= 1024
        ? `${(storageData.storageLimitGB / 1024).toFixed(0)} TB`
        : `${storageData.storageLimitGB} GB`
      : '1 TB'

  const remainingCapacityText =
    storageData?.storageRemainingTB !== undefined && storageData.storageRemainingTB >= 0.1
      ? `${storageData.storageRemainingTB} TB remaining`
      : storageData?.storageRemainingGB !== undefined
      ? storageData.storageRemainingGB >= 1024
        ? `${(storageData.storageRemainingGB / 1024).toFixed(1)} TB remaining`
        : `${storageData.storageRemainingGB} GB remaining`
      : '1 TB capacity'

  const isFull = storageData?.isFull || percentage >= 100
  const isNearFull = storageData?.isNearFull || percentage >= 90

  let progressFillClass = 'from-blue-400 via-indigo-400 to-purple-500'
  if (isFull) {
    progressFillClass = 'from-red-500 to-rose-600'
  } else if (isNearFull) {
    progressFillClass = 'from-amber-400 to-orange-500'
  }

  const progressWidth = Math.min(100, Math.max(photoCount > 0 ? 1.5 : 0, percentage))

  return (
    <section aria-label="Storage Plan" className="w-full">
      <div className="storage-card-bg rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Top Row: Icon + Title + AWS S3 / Upgrade Button */}
        <div className="flex items-center justify-between mb-5 relative z-10 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <HardDrive size={20} className="text-white" />
            </div>
            <div>
              <span className="text-[0.95rem] font-bold tracking-tight block">
                {storageData?.planName || 'AWS S3 Private Storage (1 TB Plan)'}
              </span>
              <span className="text-[0.7rem] text-white/60 font-medium">
                Region: ap-south-1 • Bucket: pixora-images-2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchStats(true)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-[0.72rem] font-semibold px-3 py-1.5 rounded-full cursor-pointer border-0"
              title="Sync live usage from AWS S3"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing…' : 'Sync'}</span>
            </button>

            <a
              href={storageData?.upgradeUrl || 'https://s3.console.aws.amazon.com/s3/buckets/pixora-images-2026?region=ap-south-1'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-[0.72rem] font-bold px-3 py-1.5 rounded-full uppercase cursor-pointer border-0 no-underline"
              aria-label="Open AWS S3 Console"
            >
              <Sparkles size={12} className="text-yellow-300" />
              <span>AWS S3</span>
            </a>
          </div>
        </div>

        {/* Percentage display */}
        <div className="flex items-baseline gap-3 mb-1 relative z-10">
          <span className="text-[2.6rem] font-extrabold leading-none tracking-tight">
            {displayPercentage}%
          </span>
          {isFull && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/30 border border-red-400 text-white text-[0.72rem] font-bold">
              <AlertTriangle size={12} />
              Storage Full
            </span>
          )}
        </div>

        {/* Photos count & remaining capacity */}
        <p className="text-white/70 text-[0.84rem] mb-4 relative z-10">
          <strong>{photoCount.toLocaleString()}</strong> photos uploaded ({remainingCapacityText})
        </p>

        {/* Progress Bar */}
        <div className="progress-track h-2 relative z-10 mb-4 bg-white/15 rounded-full overflow-hidden">
          <div
            className={`h-full bg-linear-to-r ${progressFillClass} rounded-full transition-all duration-500`}
            style={{ width: `${progressWidth}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Footer Meta Row */}
        <div className="flex items-center justify-between text-[0.74rem] text-white/60 relative z-10 flex-wrap gap-2 pt-1 border-t border-white/10">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live AWS S3 Cloud Sync
          </span>
          <span>
            Storage: <strong className="text-white font-semibold">{storageUsedDisplay}</strong> / {storageLimitDisplay}
          </span>
        </div>
      </div>
    </section>
  )
}

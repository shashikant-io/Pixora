import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  Clock,
  Shield,
  UserCheck,
  AlertCircle,
} from 'lucide-react'
import { getUsersActivity } from '../services/api'

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently'
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 45) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 172800) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UserActivityPanel({ onToast }) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ totalUsers: 0, totalCustomers: 0, activeLast24h: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    else setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getUsersActivity()
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users)
        if (data.stats) {
          setStats(data.stats)
        }
        if (isManual && onToast) {
          onToast('User activity updated.', 'info')
        }
      } else {
        throw new Error(data.message || 'Could not load user activity.')
      }
    } catch (err) {
      console.error('Error fetching user activity:', err)
      setErrorMessage(err.message || 'Network error fetching user activity.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [onToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    )
  })

  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-[1.15rem] font-bold text-navy">
              Login & Access Activity
            </h2>
            <p className="text-muted text-[0.8rem]">
              Live list of all guests and photographers who have logged in or scanned QR codes.
            </p>
          </div>
        </div>

        {/* Stats & Refresh */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 text-[0.74rem]">
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold rounded-lg">
              Total: <strong>{stats.totalUsers || users.length}</strong>
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg">
              Guests: <strong>{stats.totalCustomers || 0}</strong>
            </span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg">
              Active 24h: <strong>{stats.activeLast24h || 0}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-navy flex items-center justify-center border-0 cursor-pointer transition-colors shrink-0"
            title="Refresh Users"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or role..."
          className="w-full bg-[#F5F5F8] border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-[0.84rem] text-navy outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all placeholder-muted"
        />
      </div>

      {/* Users List Container */}
      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-muted text-[0.82rem]">Loading user activity…</p>
        </div>
      ) : errorMessage ? (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-[0.82rem] rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-8 text-center text-muted text-[0.85rem]">
          {searchQuery ? 'No user logins found matching your search.' : 'No active users recorded yet.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {filteredUsers.map((u) => {
            const isAdmin = u.role === 'admin'
            const initial = (u.name || u.email || 'U').charAt(0).toUpperCase()
            const timeAgo = formatRelativeTime(u.lastLoginAt)
            const displayName = u.name || (isAdmin ? 'Photographer Admin' : 'Guest User')

            return (
              <div
                key={u.id || u.email}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#FAFAFC] border border-gray-100/90 hover:border-gray-200 transition-colors"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {u.picture ? (
                    <img
                      src={u.picture}
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[0.85rem] shrink-0 ${
                        isAdmin
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-navy/10 text-navy'
                      }`}
                    >
                      {initial}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-[0.84rem] font-bold text-navy truncate" title={displayName}>
                      {displayName}
                    </p>
                    <p className="text-[0.74rem] text-muted truncate" title={u.email}>
                      {u.email}
                    </p>
                  </div>
                </div>

                {/* Role Pill & Time */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold ${
                      isAdmin
                        ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}
                  >
                    {isAdmin ? <Shield size={11} /> : <UserCheck size={11} />}
                    <span>{isAdmin ? 'Admin' : 'Guest'}</span>
                  </span>

                  <span className="text-[0.7rem] text-muted flex items-center gap-1">
                    <Clock size={11} />
                    <span>{timeAgo}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

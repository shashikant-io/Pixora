import { LogOut, Activity, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Header({
  userName = 'Admin',
  userEmail = '',
  serverOnline = true,
  aiReady = true,
  onLogout,
}) {
  const initial = (userName || userEmail || 'A').charAt(0).toUpperCase()

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100/90 sticky top-0 z-40 px-5 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand + Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-6 text-navy"
              viewBox="0 0 40 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="14" cy="12" r="9" stroke="#090963" strokeWidth="2.8" />
              <circle cx="26" cy="12" r="9" stroke="#6C5CE7" strokeWidth="2.8" />
            </svg>
            <span className="text-[1.15rem] font-black text-navy tracking-tight">
              Pixora
            </span>
          </div>

          <div className="hidden md:block w-px h-6 bg-gray-200" />

          <div className="hidden md:block">
            <h1 className="text-[0.88rem] font-bold text-navy leading-tight">
              Photographer Admin App
            </h1>
            <p className="text-[0.72rem] text-muted leading-tight">
              AWS S3 Albums & Buffalo AI Face Distribution
            </p>
          </div>
        </div>

        {/* Center: Live Server & AI Status Badges */}
        <div className="hidden lg:flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-semibold border ${
              serverOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {serverOnline ? (
              <CheckCircle2 size={12} className="text-emerald-600" />
            ) : (
              <AlertCircle size={12} className="text-red-600" />
            )}
            <span>{serverOnline ? 'Server Online' : 'Server Offline'}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-semibold border ${
              aiReady
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Sparkles size={12} className="text-purple-600" />
            <span>{aiReady ? 'Buffalo ONNX AI Ready' : 'AI Offline'}</span>
          </span>
        </div>

        {/* Right: User Profile + Logout */}
        <div className="flex items-center gap-3">
          {/* User Badge */}
          <div
            className="flex items-center gap-2 bg-[#F5F5F8] border border-gray-200/80 rounded-full pl-1.5 pr-3 py-1"
            title={`Signed in as ${userEmail || userName}`}
          >
            <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center font-bold text-[0.75rem]">
              {initial}
            </div>
            <span className="text-[0.78rem] font-bold text-navy max-w-[120px] truncate">
              {userName}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-white hover:bg-red-50 active:bg-red-100 text-red-600 hover:text-red-700 text-[0.78rem] font-bold px-3 py-1.5 rounded-xl border border-red-200 transition-colors cursor-pointer shadow-2xs"
            title="Sign out of Admin App"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

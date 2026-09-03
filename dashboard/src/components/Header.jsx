import { Bell, LogOut } from 'lucide-react'

export default function Header({ userName = 'Shashikant', onLogout }) {
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'GOOD MORNING'
    if (hour < 17) return 'GOOD AFTERNOON'
    return 'GOOD EVENING'
  }

  const initial = userName.charAt(0).toUpperCase()

  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-4">
      {/* Left: Avatar + Greeting */}
      <div className="flex items-center gap-3.5">
        <div
          className="w-[48px] h-[48px] rounded-full bg-navy flex items-center justify-center text-white text-[1.15rem] font-bold shrink-0"
          aria-label={`Avatar for ${userName}`}
        >
          {initial}
        </div>
        <div>
          <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-muted uppercase leading-none mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-[1.18rem] font-extrabold text-navy leading-tight tracking-[-0.01em]">
            {userName}
          </h1>
        </div>
      </div>

      {/* Right: Notification + Logout */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="relative w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-gray-100/80 text-navy hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-gray-100/80 text-navy hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut size={19} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}

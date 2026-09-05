import { LayoutDashboard, Calendar, Upload, Users, User } from 'lucide-react'

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: <LayoutDashboard size={20} />,
  },
  {
    id: 'events',
    label: 'Events',
    icon: <Calendar size={20} />,
  },
  {
    id: 'upload',
    label: 'Upload',
    icon: <Upload size={20} />,
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: <Users size={20} />,
  },
  {
    id: 'account',
    label: 'Account',
    icon: <User size={20} />,
  },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.04)] md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'activity' && (activeTab === 'bookings' || activeTab === 'inquiries')) ||
            (item.id === 'upload' && activeTab === 'photos')

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`nav-item flex flex-col items-center justify-center gap-1 border-0 bg-transparent cursor-pointer px-3 py-1.5 relative transition-colors ${
                isActive ? 'text-navy font-bold' : 'text-muted hover:text-gray-700'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div>{item.icon}</div>
              <span className="text-[0.68rem] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-navy dot-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

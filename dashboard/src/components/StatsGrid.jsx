import { ChevronRight } from 'lucide-react'

const STATS = [
  {
    id: 'events',
    label: 'Events',
    value: 0,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
    bgColor: 'bg-card-events',
    iconBg: 'bg-[#dddafb]',
    iconColor: 'text-icon-events',
    labelColor: 'text-icon-events',
  },
  {
    id: 'photos',
    label: 'Photos',
    value: 0,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    bgColor: 'bg-card-photos',
    iconBg: 'bg-[#ffe0c7]',
    iconColor: 'text-icon-photos',
    labelColor: 'text-icon-photos',
  },
  {
    id: 'bookings',
    label: 'Bookings',
    value: 0,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    bgColor: 'bg-card-bookings',
    iconBg: 'bg-[#bdf0de]',
    iconColor: 'text-icon-bookings',
    labelColor: 'text-icon-bookings',
  },
  {
    id: 'inquiries',
    label: 'Inquiries',
    value: 0,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    bgColor: 'bg-card-inquiries',
    iconBg: 'bg-[#fbc8d8]',
    iconColor: 'text-icon-inquiries',
    labelColor: 'text-icon-inquiries',
  },
]

export default function StatsGrid({ onNavigate, eventsCount = 0, photosCount = 0 }) {
  const stats = [
    {
      id: 'events',
      label: 'Events',
      value: eventsCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      ),
      bgColor: 'bg-card-events',
      iconBg: 'bg-[#dddafb]',
      iconColor: 'text-icon-events',
      labelColor: 'text-icon-events',
    },
    {
      id: 'photos',
      label: 'Photos',
      value: photosCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      ),
      bgColor: 'bg-card-photos',
      iconBg: 'bg-[#ffe0c7]',
      iconColor: 'text-icon-photos',
      labelColor: 'text-icon-photos',
    },
    {
      id: 'bookings',
      label: 'Bookings',
      value: 0,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      bgColor: 'bg-card-bookings',
      iconBg: 'bg-[#bdf0de]',
      iconColor: 'text-icon-bookings',
      labelColor: 'text-icon-bookings',
    },
    {
      id: 'inquiries',
      label: 'Inquiries',
      value: 0,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      bgColor: 'bg-card-inquiries',
      iconBg: 'bg-[#fbc8d8]',
      iconColor: 'text-icon-inquiries',
      labelColor: 'text-icon-inquiries',
    },
  ]

  return (
    <section aria-label="Dashboard Statistics" className="grid grid-cols-2 gap-3.5 px-5 mt-1">
      {stats.map((stat) => (
        <button
          key={stat.id}
          onClick={() => onNavigate?.(stat.id)}
          className={`stat-card ${stat.bgColor} rounded-2xl px-4 pt-3.5 pb-3 flex flex-col items-start text-left cursor-pointer border-0 outline-none relative`}
          aria-label={`${stat.value} ${stat.label}`}
        >
          {/* Icon container */}
          <div className={`${stat.iconBg} ${stat.iconColor} w-[38px] h-[38px] rounded-[11px] flex items-center justify-center mb-2.5`}>
            {stat.icon}
          </div>

          {/* Value + Arrow row */}
          <div className="flex items-center w-full gap-1">
            <span className="text-[1.5rem] font-extrabold text-navy leading-none">
              {stat.value}
            </span>
            <ChevronRight size={15} className="text-muted-light ml-auto mt-0.5" strokeWidth={2.5} />
          </div>

          {/* Label */}
          <span className={`text-[0.82rem] font-semibold ${stat.labelColor} mt-0.5`}>
            {stat.label}
          </span>
        </button>
      ))}
    </section>
  )
}

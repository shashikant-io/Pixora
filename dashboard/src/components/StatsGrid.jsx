import { ChevronRight, Calendar, Camera, Users, Zap } from 'lucide-react'

export default function StatsGrid({
  onNavigate,
  eventsCount = 0,
  photosCount = 0,
  usersCount = 0,
  active24hCount = 0,
}) {
  const stats = [
    {
      id: 'events',
      label: 'Events',
      value: eventsCount,
      icon: <Calendar size={20} />,
      bgColor: 'bg-card-events',
      iconBg: 'bg-[#dddafb]',
      iconColor: 'text-icon-events',
      labelColor: 'text-icon-events',
    },
    {
      id: 'photos',
      label: 'Photos',
      value: photosCount,
      icon: <Camera size={20} />,
      bgColor: 'bg-card-photos',
      iconBg: 'bg-[#ffe0c7]',
      iconColor: 'text-icon-photos',
      labelColor: 'text-icon-photos',
    },
    {
      id: 'users',
      label: 'Total Users',
      value: usersCount,
      icon: <Users size={20} />,
      bgColor: 'bg-card-bookings',
      iconBg: 'bg-[#bdf0de]',
      iconColor: 'text-icon-bookings',
      labelColor: 'text-icon-bookings',
    },
    {
      id: 'activity',
      label: 'Active (24h)',
      value: active24hCount,
      icon: <Zap size={20} />,
      bgColor: 'bg-card-inquiries',
      iconBg: 'bg-[#fbc8d8]',
      iconColor: 'text-icon-inquiries',
      labelColor: 'text-icon-inquiries',
    },
  ]

  return (
    <section aria-label="Dashboard Statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
      {stats.map((stat) => (
        <button
          key={stat.id}
          type="button"
          onClick={() => onNavigate?.(stat.id)}
          className={`stat-card ${stat.bgColor} rounded-2xl p-4 flex flex-col items-start text-left cursor-pointer border-0 outline-none relative transition-all hover:shadow-md`}
          aria-label={`${stat.value} ${stat.label}`}
        >
          {/* Icon container */}
          <div
            className={`${stat.iconBg} ${stat.iconColor} w-[38px] h-[38px] rounded-[11px] flex items-center justify-center mb-2.5`}
          >
            {stat.icon}
          </div>

          {/* Value + Arrow row */}
          <div className="flex items-center w-full gap-1">
            <span className="text-[1.6rem] font-extrabold text-navy leading-none">
              {stat.value.toLocaleString()}
            </span>
            <ChevronRight size={16} className="text-muted-light ml-auto mt-0.5" strokeWidth={2.5} />
          </div>

          {/* Label */}
          <span className={`text-[0.82rem] font-bold ${stat.labelColor} mt-1`}>
            {stat.label}
          </span>
        </button>
      ))}
    </section>
  )
}

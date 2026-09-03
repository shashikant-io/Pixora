import { User, Mail, Shield, LogOut, ChevronRight, Bell, Lock, HelpCircle } from 'lucide-react'

export default function AccountPage({ userName = 'Shashikant', onLogout }) {
  const initial = userName.charAt(0).toUpperCase()

  const menuItems = [
    { icon: <User size={18} />, label: 'Edit Profile', desc: 'Update your name and photo' },
    { icon: <Bell size={18} />, label: 'Notifications', desc: 'Manage alert preferences' },
    { icon: <Lock size={18} />, label: 'Security', desc: 'Password and two-factor auth' },
    { icon: <HelpCircle size={18} />, label: 'Help & Support', desc: 'Get help or report an issue' },
  ]

  return (
    <div className="section-enter px-5 pt-2 pb-6">
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold text-navy">Account</h1>
        <p className="text-muted text-[0.82rem] mt-0.5">Your profile and settings</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[1.05rem] font-bold text-navy">{userName}</p>
          <p className="text-muted text-[0.82rem] flex items-center gap-1.5 mt-0.5">
            <Shield size={13} />
            <span>Administrator</span>
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-4">
        {menuItems.map((item, i) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3.5 px-5 py-4 bg-transparent border-0 cursor-pointer text-left hover:bg-gray-50 transition-colors ${
              i < menuItems.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F8] flex items-center justify-center text-navy shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.88rem] font-semibold text-navy">{item.label}</p>
              <p className="text-[0.75rem] text-muted">{item.desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-light shrink-0" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 bg-white rounded-2xl border border-red-100 py-3.5 text-red-500 font-semibold text-[0.9rem] cursor-pointer hover:bg-red-50 transition-colors"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  )
}

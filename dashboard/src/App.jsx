import { useState, useCallback, useEffect } from 'react'
import Header from './components/Header'
import StatsGrid from './components/StatsGrid'
import StorageCard from './components/StorageCard'
import UploadWorkspace from './components/UploadWorkspace'
import UserActivityPanel from './components/UserActivityPanel'
import BottomNav from './components/BottomNav'
import CreateEventModal from './components/CreateEventModal'
import QrCodeModal from './components/QrCodeModal'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import UpgradeModal from './components/UpgradeModal'
import ToastContainer from './components/ToastContainer'
import EventsPage from './pages/EventsPage'
import BillingPage from './pages/BillingPage'
import AccountPage from './pages/AccountPage'
import {
  getEvents,
  getMe,
  checkHealth,
  clearAdminToken,
  getUsersActivity,
} from './services/api'
import {
  LayoutDashboard,
  Calendar,
  Upload,
  Users,
  CreditCard,
  User,
  Plus,
} from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [events, setEvents] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [selectedUploadEventId, setSelectedUploadEventId] = useState('')

  // System & Auth status
  const [user, setUser] = useState({ name: 'Shashikant', email: '', role: 'admin' })
  const [serverOnline, setServerOnline] = useState(true)
  const [aiReady, setAiReady] = useState(true)
  const [userStats, setUserStats] = useState({ totalUsers: 0, activeLast24h: 0 })

  // Modals state
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [qrModalEvent, setQrModalEvent] = useState(null)
  const [deleteModalEvent, setDeleteModalEvent] = useState(null)

  // Toast notifications state
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3800)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Load events safely
  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true)
    try {
      const eventList = await getEvents()
      setEvents(eventList)
    } catch (err) {
      console.warn('Could not load events:', err.message)
      addToast(err.message || 'Could not load events from server.', 'error')
    } finally {
      setIsLoadingEvents(false)
    }
  }, [addToast])

  // Load system & user info
  const loadSystemInfo = useCallback(async () => {
    try {
      const health = await checkHealth()
      if (health.success) {
        setServerOnline(true)
        setAiReady(true)
      }
    } catch (e) {
      setServerOnline(false)
      setAiReady(false)
    }

    try {
      const meData = await getMe()
      if (meData.success && meData.user) {
        setUser(meData.user)
      }
    } catch (e) {
      // If running locally, keep graceful fallback
      console.log('Session check fallback')
    }

    try {
      const userRes = await getUsersActivity()
      if (userRes.success) {
        setUserStats({
          totalUsers: userRes.stats?.totalUsers || userRes.users?.length || 0,
          activeLast24h: userRes.stats?.activeLast24h || 0,
        })
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    loadEvents()
    loadSystemInfo()
  }, [loadEvents, loadSystemInfo])

  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to sign out of the Photographer Dashboard?')) {
      clearAdminToken()
      window.location.href = '../client/admin-login.html'
    }
  }, [])

  const handleQuickUpload = useCallback((eventId) => {
    setSelectedUploadEventId(eventId)
    setActiveTab('upload')
  }, [])

  const totalPhotos = events.reduce((acc, ev) => acc + (ev.photoCount || 0), 0)

  const navTabs = [
    { id: 'home', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { id: 'events', label: 'Events', icon: <Calendar size={17} /> },
    { id: 'upload', label: 'Upload Photos', icon: <Upload size={17} /> },
    { id: 'activity', label: 'User Activity', icon: <Users size={17} /> },
    { id: 'billing', label: 'S3 Storage & Billing', icon: <CreditCard size={17} /> },
    { id: 'account', label: 'Account & Settings', icon: <User size={17} /> },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5F8] text-navy relative pb-20 md:pb-10 font-sans">
      {/* Top Header */}
      <Header
        userName={user.name || 'Admin'}
        userEmail={user.email}
        serverOnline={serverOnline}
        aiReady={aiReady}
        onLogout={handleLogout}
      />

      {/* Desktop Navigation Tabs Bar */}
      <div className="hidden md:block bg-white border-b border-gray-100 px-5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1 overflow-x-auto py-2">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.84rem] font-bold transition-all cursor-pointer border-0 ${
                    isActive
                      ? 'bg-navy text-white shadow-xs'
                      : 'text-muted hover:text-navy hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={() => setShowCreateEvent(true)}
            className="flex items-center gap-2 bg-navy hover:bg-navy-light text-white font-bold text-[0.84rem] px-4 py-2 rounded-xl transition-colors cursor-pointer border-0 shadow-xs"
          >
            <Plus size={16} />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ===================== HOME TAB ===================== */}
        {activeTab === 'home' && (
          <div className="page-enter flex flex-col gap-6">
            {/* Top Stats KPI Grid */}
            <StatsGrid
              onNavigate={(id) => {
                if (id === 'events') setActiveTab('events')
                else if (id === 'photos') setActiveTab('upload')
                else if (id === 'users' || id === 'activity') setActiveTab('activity')
              }}
              eventsCount={events.length}
              photosCount={totalPhotos}
              usersCount={userStats.totalUsers}
              active24hCount={userStats.activeLast24h}
            />

            {/* 2-Column Responsive Workspace Grid (S3 Storage Card + Upload Photos Workspace) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Storage Card */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <StorageCard
                  onUpgrade={() => setShowUpgrade(true)}
                  onToast={addToast}
                />
              </div>

              {/* Right Column: Upload Photos Workspace */}
              <div className="lg:col-span-7">
                <UploadWorkspace
                  events={events}
                  selectedEventId={selectedUploadEventId}
                  onSelectEvent={(id) => setSelectedUploadEventId(id)}
                  onUploadComplete={() => {
                    loadEvents()
                    loadSystemInfo()
                  }}
                  onToast={addToast}
                />
              </div>
            </div>

            {/* Events Management Section */}
            <div className="mt-2">
              <EventsPage
                events={events}
                isLoading={isLoadingEvents}
                onCreateEvent={() => setShowCreateEvent(true)}
                onOpenQr={(ev) => setQrModalEvent(ev)}
                onOpenDelete={(ev) => setDeleteModalEvent(ev)}
                onQuickUpload={handleQuickUpload}
                onToast={addToast}
              />
            </div>

            {/* User Login & Access Activity Section */}
            <div className="mt-2">
              <UserActivityPanel onToast={addToast} />
            </div>
          </div>
        )}

        {/* ===================== EVENTS TAB ===================== */}
        {activeTab === 'events' && (
          <EventsPage
            events={events}
            isLoading={isLoadingEvents}
            onCreateEvent={() => setShowCreateEvent(true)}
            onOpenQr={(ev) => setQrModalEvent(ev)}
            onOpenDelete={(ev) => setDeleteModalEvent(ev)}
            onQuickUpload={handleQuickUpload}
            onToast={addToast}
          />
        )}

        {/* ===================== UPLOAD TAB ===================== */}
        {activeTab === 'upload' && (
          <div className="page-enter max-w-4xl mx-auto">
            <div className="mb-5">
              <h1 className="text-[1.5rem] font-bold text-navy">Photo Upload Workspace</h1>
              <p className="text-muted text-[0.84rem] mt-0.5">
                Bulk upload high-resolution albums directly to Amazon S3 Private Bucket with Buffalo AI indexing.
              </p>
            </div>
            <UploadWorkspace
              events={events}
              selectedEventId={selectedUploadEventId}
              onSelectEvent={(id) => setSelectedUploadEventId(id)}
              onUploadComplete={() => {
                loadEvents()
                loadSystemInfo()
              }}
              onToast={addToast}
            />
          </div>
        )}

        {/* ===================== ACTIVITY TAB ===================== */}
        {activeTab === 'activity' && (
          <div className="page-enter max-w-5xl mx-auto">
            <UserActivityPanel onToast={addToast} />
          </div>
        )}

        {/* ===================== BILLING / STORAGE TAB ===================== */}
        {activeTab === 'billing' && (
          <div className="page-enter max-w-4xl mx-auto flex flex-col gap-6">
            <StorageCard
              onUpgrade={() => setShowUpgrade(true)}
              onToast={addToast}
            />
            <BillingPage />
          </div>
        )}

        {/* ===================== ACCOUNT TAB ===================== */}
        {activeTab === 'account' && (
          <div className="page-enter max-w-2xl mx-auto">
            <AccountPage
              userName={user.name || 'Admin'}
              userEmail={user.email}
              onLogout={handleLogout}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Floating Global Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modals */}
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onEventCreated={() => {
          loadEvents()
          loadSystemInfo()
        }}
        onToast={addToast}
      />

      <QrCodeModal
        event={qrModalEvent}
        isOpen={Boolean(qrModalEvent)}
        onClose={() => setQrModalEvent(null)}
        onToast={addToast}
      />

      <DeleteConfirmModal
        event={deleteModalEvent}
        isOpen={Boolean(deleteModalEvent)}
        onClose={() => setDeleteModalEvent(null)}
        onDeleted={() => {
          loadEvents()
          loadSystemInfo()
        }}
        onToast={addToast}
      />

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  )
}

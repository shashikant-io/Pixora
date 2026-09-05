import { useState, useCallback, useEffect } from 'react'
import Header from './components/Header'
import StatsGrid from './components/StatsGrid'
import StorageCard from './components/StorageCard'
import UpcomingBookings from './components/UpcomingBookings'
import WelcomeCard from './components/WelcomeCard'
import BottomNav from './components/BottomNav'
import CreateEventModal from './components/CreateEventModal'
import UpgradeModal from './components/UpgradeModal'
import EventsPage from './pages/EventsPage'
import BookingsPage from './pages/BookingsPage'
import BillingPage from './pages/BillingPage'
import AccountPage from './pages/AccountPage'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [events, setEvents] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true)
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events)
      }
    } catch (err) {
      console.warn('Could not load events from API:', err)
    } finally {
      setIsLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleDeleteEvent = useCallback(async (eventId) => {
    try {
      const token =
        localStorage.getItem('photo_finder_admin_token') ||
        localStorage.getItem('photo_finder_token') ||
        sessionStorage.getItem('photo_finder_admin_token') ||
        sessionStorage.getItem('photo_finder_token')

      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (data.success) {
        setEvents((prev) => prev.filter((e) => e.eventId !== eventId))
      } else {
        alert(data.message || 'Could not delete event.')
      }
    } catch (err) {
      console.error('Delete event error:', err)
      alert('Network error while deleting event.')
    }
  }, [])

  const handleNavigate = useCallback((section) => {
    setActiveTab(section)
  }, [])

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
  }, [])

  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to sign out?')) {
      window.location.href = '../client/admin-login.html'
    }
  }, [])

  const totalPhotos = events.reduce((acc, ev) => acc + (ev.photoCount || 0), 0)

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto relative">
      {/* Header — always visible */}
      <Header userName="Shashikant" onLogout={handleLogout} />

      {/* Main Content Area */}
      <main className="pb-24">
        {activeTab === 'home' && (
          <div className="page-enter">
            <StatsGrid
              onNavigate={handleNavigate}
              eventsCount={events.length}
              photosCount={totalPhotos}
            />
            <StorageCard onUpgrade={() => setShowUpgrade(true)} />
            <UpcomingBookings onViewAll={() => setActiveTab('bookings')} />
            {events.length === 0 && (
              <WelcomeCard onCreateEvent={() => setShowCreateEvent(true)} />
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <EventsPage
            events={events}
            isLoading={isLoadingEvents}
            onCreateEvent={() => setShowCreateEvent(true)}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {activeTab === 'photos' && (
          <EventsPage
            events={events}
            isLoading={isLoadingEvents}
            onCreateEvent={() => setShowCreateEvent(true)}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {activeTab === 'bookings' && <BookingsPage />}

        {activeTab === 'inquiries' && <BookingsPage />}

        {activeTab === 'billing' && <BillingPage />}

        {activeTab === 'account' && (
          <AccountPage userName="Shashikant" onLogout={handleLogout} />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Modals */}
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onEventCreated={loadEvents}
      />
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  )
}

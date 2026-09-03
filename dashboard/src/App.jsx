import { useState, useCallback } from 'react'
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

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto relative">
      {/* Header — always visible */}
      <Header userName="Shashikant" onLogout={handleLogout} />

      {/* Main Content Area */}
      <main className="pb-24">
        {activeTab === 'home' && (
          <div className="page-enter">
            <StatsGrid onNavigate={handleNavigate} />
            <StorageCard onUpgrade={() => setShowUpgrade(true)} />
            <UpcomingBookings onViewAll={() => setActiveTab('bookings')} />
            <WelcomeCard onCreateEvent={() => setShowCreateEvent(true)} />
          </div>
        )}

        {activeTab === 'events' && (
          <EventsPage onCreateEvent={() => setShowCreateEvent(true)} />
        )}

        {activeTab === 'photos' && (
          <EventsPage onCreateEvent={() => setShowCreateEvent(true)} />
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
      />
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  )
}

export default function WelcomeCard({ onCreateEvent }) {
  return (
    <section aria-label="Welcome to PicsDrop" className="px-5 mt-5 mb-6">
      <div className="bg-white rounded-3xl p-7 flex flex-col items-center text-center shadow-[0_1px_8px_rgba(0,0,0,0.04)] border border-gray-100/50">
        {/* Sparkle / Magic icon */}
        <div className="w-[56px] h-[56px] rounded-full bg-card-events flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-[1.12rem] font-bold text-navy mb-1.5">
          Welcome to PicsDrop!
        </h2>

        {/* Description */}
        <p className="text-muted text-[0.85rem] leading-[1.55] mb-6 max-w-[250px]">
          Create your first event to start
          <br />
          sharing photos with clients.
        </p>

        {/* CTA Button */}
        <button
          onClick={onCreateEvent}
          className="w-full max-w-[280px] bg-navy hover:bg-navy-light active:bg-navy-dark text-white font-bold text-[0.9rem] py-[14px] rounded-[14px] transition-colors cursor-pointer border-0 tracking-[-0.01em]"
          aria-label="Create your first event"
        >
          Create Event
        </button>
      </div>
    </section>
  )
}

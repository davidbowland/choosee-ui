import React from 'react'

export const NavContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <nav className="px-4 pt-4 pb-2 relative z-40">
    <div className="mx-auto flex max-w-[960px] items-center justify-between rounded-full border border-white/[0.07] bg-white/[0.03] px-6 py-2">
      {children}
    </div>
  </nav>
)

export const BrandLink = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <span className="choosee-brand text-2xl text-[#F59E0B]">{children}</span>
)

const Mark = (): React.ReactNode => (
  <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
    <path d="M4 6H9V12" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
    <path d="M20 6H15V12" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
    <path d="M9 12H15" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
    <path d="M12 12V17" stroke="#F59E0B" strokeLinecap="round" strokeWidth={2.6} />
    <circle cx="4" cy="6" fill="#F59E0B" r="1.7" />
    <circle cx="20" cy="6" fill="#F59E0B" r="1.7" />
    <circle cx="12" cy="19.4" fill="#F59E0B" r="2.3" />
  </svg>
)

// A phone with a plus, drawn in lucide's idiom so it sits beside the app's other icons. Not a
// download arrow: an arrow into a tray says "save a file", not "put this on my phone".
const PhonePlus = (): React.ReactNode => (
  <svg
    aria-hidden="true"
    fill="none"
    height="18"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
    width="18"
  >
    <rect height="19" rx="2.5" width="11" x="2.5" y="2.5" />
    <path d="M6.5 18.5h3" />
    <path d="M18 5v6" />
    <path d="M21 8h-6" />
  </svg>
)

// Amber, the app's action color, so the icon reads as pressable rather than as a status marker.
// Label rather than visible text: this is the slot Google sign-in vacated, and the bar has room
// for a disc, not a sentence.
export const InstallIconButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <button
    aria-label="Add Choosee to your Home Screen"
    className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/[0.12] text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20 focus:outline-none"
    onClick={onPress}
    title="Add Choosee to your Home Screen"
    type="button"
  >
    <PhonePlus />
  </button>
)

export const Brand = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <span className="flex items-center gap-2.5">
    <span className="rounded-[11px] border border-[#F59E0B]/20 bg-[#F59E0B]/[0.12] p-[3px]">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-[#0D0D0E]">
        <Mark />
      </span>
    </span>
    <BrandLink>{children}</BrandLink>
  </span>
)

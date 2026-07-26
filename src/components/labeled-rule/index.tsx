import React from 'react'

/** Hairline rule with a centered uppercase micro-label — the app's section-break device. */
export const LabeledRule = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="flex w-full items-center justify-center gap-3">
    <div className="h-px flex-1 bg-white/[0.04]" />
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4B5563]">
      {children}
    </div>
    <div className="h-px flex-1 bg-white/[0.04]" />
  </div>
)

import { Drawer } from '@heroui/react'
import React from 'react'

export const BracketDrawer = ({
  children,
  onClose,
  open,
}: {
  children: React.ReactNode
  onClose: () => void
  open: boolean
}): React.ReactNode => (
  <Drawer.Backdrop isOpen={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()} variant="blur">
    <Drawer.Content placement="right">
      <Drawer.Dialog>
        <Drawer.CloseTrigger />
        <Drawer.Header>
          <Drawer.Heading className="choosee-brand pr-8 text-2xl">Tournament Bracket</Drawer.Heading>
        </Drawer.Header>
        <Drawer.Body>
          {/* Inner scroll container overrides the Drawer.Body inline touch-action: pan-y
              to allow both horizontal and vertical panning for the bracket grid */}
          <div className="min-h-full overflow-auto" style={{ touchAction: 'manipulation' }}>
            <div className="inline-flex min-w-max gap-6">{children}</div>
          </div>
        </Drawer.Body>
      </Drawer.Dialog>
    </Drawer.Content>
  </Drawer.Backdrop>
)

export const RoundColumn = ({
  children,
  roundNumber,
}: {
  children: React.ReactNode
  roundNumber: number
}): React.ReactNode => (
  <div className="flex min-w-[200px] flex-col gap-4">
    <h3 className="choosee-brand text-lg tracking-wider text-default-400">Round {roundNumber}</h3>
    {children}
  </div>
)

export const MatchupCard = ({
  nameA,
  nameB,
  winnerSlot,
}: {
  nameA: string
  nameB: string
  winnerSlot: 'a' | 'b' | null
}): React.ReactNode => (
  <div className="relative overflow-visible rounded-xl border border-divider bg-surface shadow-sm">
    <div
      className={`rounded-t-xl border-b border-divider px-3 pb-4 pt-2.5 text-sm font-medium transition-colors ${
        winnerSlot === 'a' ? 'bg-success/15 text-success' : 'text-foreground'
      }`}
    >
      {winnerSlot === 'a' && <span className="mr-1.5 text-success">▶</span>}
      {nameA}
    </div>
    <div
      className={`rounded-b-xl px-3 pb-2.5 pt-4 text-sm font-medium transition-colors ${
        winnerSlot === 'b' ? 'bg-success/15 text-success' : 'text-foreground'
      }`}
    >
      {winnerSlot === 'b' && <span className="mr-1.5 text-success">▶</span>}
      {nameB}
    </div>
    <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-divider bg-background shadow-sm">
        <span className="choosee-brand text-xs text-default-500">VS</span>
      </div>
    </div>
  </div>
)

export const ByeCard = ({ name }: { name: string }): React.ReactNode => (
  <div className="rounded-xl border border-dashed border-divider px-3 py-2.5 text-sm italic text-default-400">
    {name} — bye
  </div>
)

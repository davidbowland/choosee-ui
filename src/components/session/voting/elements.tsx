import { Button, Skeleton } from '@heroui/react'
import { Eye, MousePointerClick, Pencil } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export const VotingContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 p-4">{children}</div>
)

export const TournamentHeader = ({
  matchCurrent,
  matchTotal,
  onNameSave,
  playerName,
  roundCurrent,
  roundTotal,
}: {
  matchCurrent: number
  matchTotal: number
  onNameSave: (name: string) => void
  playerName: string
  roundCurrent: number
  roundTotal: number
}): React.ReactNode => {
  const roundPct = Math.round((roundCurrent / roundTotal) * 100)
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-default-200 bg-default-50">
      <div className="flex items-stretch divide-x divide-default-200">
        <div className="flex flex-1 flex-col items-center gap-0.5 py-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-default-400">Round</span>
          <div className="choosee-brand text-5xl leading-none text-foreground">
            {roundCurrent}
            <span className="text-2xl text-default-400"> / {roundTotal}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5 py-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-default-400">Match</span>
          <div className="choosee-brand text-5xl leading-none text-foreground">
            {matchCurrent}
            <span className="text-2xl text-default-400"> / {matchTotal}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-default-200 bg-default-100/50 px-4 py-2.5">
        <span className="text-[10px] font-medium uppercase tracking-widest text-default-400">Voting as</span>
        <InlineNameEditor name={playerName} onSave={onNameSave} />
      </div>
      <div className="h-1.5 w-full bg-default-200">
        <div className="h-full bg-primary transition-all duration-700" style={{ width: `${roundPct}%` }} />
      </div>
    </div>
  )
}

export const MatchupContainer = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
  <div className="relative w-full scroll-mt-16 p-2" ref={ref}>
    <span
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-default-200"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-default-200"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-default-200"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-default-200"
    />
    <div className="grid w-full grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_48px_1fr]">{children}</div>
  </div>
))
MatchupContainer.displayName = 'MatchupContainer'

export const VsLabel = (): React.ReactNode => (
  <div className="flex items-center justify-center py-1 md:flex-col md:py-0">
    <span className="choosee-brand select-none text-3xl text-default-400">VS</span>
  </div>
)

export const VoteCallToAction = (): React.ReactNode => {
  const [verb, setVerb] = useState<string | null>(null)

  useEffect(() => {
    setVerb(window.matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click')
  }, [])

  return (
    <div className="flex w-full items-center justify-center gap-3">
      <div className="h-px flex-1 bg-default-200" />
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-default-400">
        <MousePointerClick className="h-3.5 w-3.5" />
        {verb ? <span>{verb} a card to vote</span> : <Skeleton className="h-3 w-28 rounded-sm" />}
      </div>
      <div className="h-px flex-1 bg-default-200" />
    </div>
  )
}

export const ActionRow = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="flex items-center justify-center gap-3">{children}</div>
)

export const BracketButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <Button onPress={onPress} variant="outline">
    <Eye className="h-4 w-4" />
    View bracket
  </Button>
)

export const InlineNameEditor = ({
  name,
  onSave,
}: {
  name: string
  onSave: (newName: string) => void
}): React.ReactNode => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  useEffect(() => {
    if (!editing) setValue(name)
  }, [name, editing])

  const commit = (): void => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed) {
      onSave(trimmed)
    } else {
      setValue(name)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="rounded border border-default-300 bg-transparent px-2 py-1 text-lg font-semibold outline-none focus:border-primary"
        onBlur={commit}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setValue(name)
            setEditing(false)
          }
        }}
        value={value}
      />
    )
  }

  return (
    <button
      className="flex cursor-pointer items-center gap-2 text-lg font-semibold hover:text-primary"
      onClick={() => {
        setValue(name)
        setEditing(true)
      }}
      type="button"
    >
      {name}
      <Pencil className="h-4 w-4 text-default-400" />
    </button>
  )
}

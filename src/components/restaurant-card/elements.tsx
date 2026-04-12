import { Button, CardContent, CardRoot, Spinner } from '@heroui/react'
import { Check, Clock, Info, MapPin, Phone, Star, Store, Tag as TagIcon, UtensilsCrossed, X } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import PhotoCarousel from '@components/photo-carousel'

export const CardContainer = ({
  children,
  disabled,
  selected,
  winner,
}: {
  children: React.ReactNode
  disabled?: boolean
  selected?: boolean
  winner?: boolean
}): React.ReactNode => (
  <CardRoot
    className={`w-full transition-shadow ${selected ? 'ring-2 ring-primary' : ''} ${
      winner ? 'border-2 border-success' : ''
    } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
  >
    <CardContent className="flex flex-col gap-3 p-4">{children}</CardContent>
  </CardRoot>
)

/** Single image with fade-in loading state for voting cards */
export const VotingCardImage = ({
  alt,
  overlay,
  src,
}: {
  alt: string
  overlay?: React.ReactNode
  src?: string
}): React.ReactNode => {
  const [loaded, setLoaded] = useState(!src)

  if (!src) {
    return (
      <div className="relative flex h-60 w-full items-center justify-center bg-default-100">
        <UtensilsCrossed className="h-20 w-20 text-default-300" />
        {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
      </div>
    )
  }

  return (
    <div className="relative h-60 w-full overflow-hidden bg-default-100">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-default-200 border-t-primary" />
        </div>
      )}
      <img
        alt={alt}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        src={src}
      />
      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  )
}

/** Name + rating gradient overlay for voting card photos — matches the copy card look */
export const VotingPhotoOverlay = ({
  name,
  priceLabel,
  rating,
  ratingsTotal,
}: {
  name: string
  priceLabel: string | null
  rating?: number
  ratingsTotal?: number
}): React.ReactNode => (
  <>
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-3">
      <h3 className="text-base font-bold leading-snug text-white drop-shadow">{name}</h3>
      <div className="mt-1 flex items-center gap-3">
        {rating != null && (
          <span className="flex items-center gap-1 text-sm text-white/90">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            {rating}
            {ratingsTotal != null && <span className="text-xs text-white/60">({ratingsTotal})</span>}
          </span>
        )}
        {priceLabel && <span className="text-sm font-medium text-white/90">{priceLabel}</span>}
      </div>
    </div>
  </>
)

/** ✓ overlay — shown on the chosen card after voting */
export const ChosenOverlay = (): React.ReactNode => (
  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-success/30">
    <div className="rounded-full bg-success/90 p-3 shadow-lg">
      <Check className="h-10 w-10 stroke-[2.5] text-white" />
    </div>
  </div>
)

/** ✗ overlay — shown on the card that was NOT chosen */
export const RejectedOverlay = (): React.ReactNode => (
  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/50">
    <div className="rounded-full bg-black/60 p-3 shadow-lg">
      <X className="h-10 w-10 stroke-[2.5] text-white/70" />
    </div>
  </div>
)

/** Hours list — compact (sm) for voting toggle, standard (md) for winner/default cards */
export const HoursList = ({ hours, size = 'md' }: { hours: string[]; size?: 'sm' | 'md' }): React.ReactNode => {
  const sm = size === 'sm'
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex items-center ${sm ? 'gap-1.5 text-xs text-default-400' : 'gap-2 text-sm text-default-500'}`}
      >
        <Clock className={sm ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className="font-medium">Hours</span>
      </div>
      <ul className={sm ? 'space-y-0.5 pl-4 text-xs text-default-500' : 'space-y-1 pl-6 text-sm text-default-500'}>
        {hours.map((hour) => (
          <li key={hour}>{hour}</li>
        ))}
      </ul>
    </div>
  )
}

/** Sorted place-type chips — compact (sm) for voting toggle, standard (md) for winner/default cards */
const MAX_VISIBLE_TYPES = 5

export const PlaceTypeChips = ({ types, size = 'md' }: { types: string[]; size?: 'sm' | 'md' }): React.ReactNode => {
  const sorted = useMemo(() => [...types].sort((a, b) => a.localeCompare(b)), [types])
  const [expanded, setExpanded] = useState(false)
  const sm = size === 'sm'

  const hasOverflow = sorted.length > MAX_VISIBLE_TYPES
  const visible = expanded || !hasOverflow ? sorted : sorted.slice(0, MAX_VISIBLE_TYPES)
  const hiddenCount = sorted.length - MAX_VISIBLE_TYPES

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`flex items-center ${sm ? 'gap-1.5 text-xs text-default-400' : 'gap-2 text-sm text-default-500'}`}
      >
        <TagIcon className={sm ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className="font-medium">Type</span>
      </div>
      <div className={`flex flex-wrap ${sm ? 'gap-1.5 pl-4' : 'gap-2 pl-6'}`}>
        {visible.map((type) => (
          <span
            className={`inline-flex items-center rounded-full border border-default-200 bg-default-100 font-medium text-default-700 ${
              sm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
            }`}
            key={type}
          >
            {type}
          </span>
        ))}
      </div>
      {hasOverflow && (
        <Button
          aria-label={expanded ? 'Show fewer place types' : `Show ${hiddenCount} more place types`}
          className={sm ? 'ml-4 mt-0.5' : 'ml-6 mt-0.5'}
          onPress={() => setExpanded((prev) => !prev)}
          size="sm"
          variant="outline"
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
        </Button>
      )}
    </div>
  )
}

/** Expandable "More details" section for voting cards */
export const VotingInfoToggle = ({ children }: { children: React.ReactNode }): React.ReactNode => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        className="flex items-center gap-1.5 py-0.5 text-xs text-default-400 hover:text-default-600"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        type="button"
      >
        <Info className="h-3 w-3" />
        {open ? 'Hide details' : 'More details'}
      </button>
      {/* stopPropagation on the content so phone/website links don't trigger a vote */}
      {open && (
        <div className="mt-2 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  )
}

/** Address that opens in Google Maps / Apple Maps */
export const AddressMapLink = ({ address }: { address: string }): React.ReactNode => (
  <a
    className="flex items-start gap-1.5 text-xs text-default-500 hover:text-primary"
    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
    onClick={(e) => e.stopPropagation()}
    rel="noopener noreferrer"
    target="_blank"
  >
    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
    <span>{address}</span>
  </a>
)

const PhotoImage = ({ alt, src }: { alt: string; src: string }): React.ReactNode => (
  <img alt={alt} className="h-48 w-full rounded-md object-cover" src={src} />
)

const PhotoPlaceholder = (): React.ReactNode => (
  <div className="flex h-48 w-full items-center justify-center rounded-md bg-default-100">
    <UtensilsCrossed className="h-16 w-16 text-default-400" />
  </div>
)

export const AddressLine = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <a
    className="flex items-start gap-2 text-sm text-default-500 hover:text-primary"
    href={`https://maps.google.com/?q=${encodeURIComponent(String(children))}`}
    rel="noopener noreferrer"
    target="_blank"
  >
    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{children}</span>
  </a>
)

export const PhoneLink = ({ phone }: { phone: string }): React.ReactNode => (
  <div className="flex items-center gap-2 text-sm">
    <Phone className="h-4 w-4 shrink-0 text-default-500" />
    <a className="text-primary underline" href={`tel:${phone}`}>
      {phone}
    </a>
  </div>
)

export const CardName = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <h3 className="text-lg font-semibold">{children}</h3>
)

export const CardMeta = ({
  priceLabel,
  rating,
  ratingsTotal,
}: {
  priceLabel: string | null
  rating?: number
  ratingsTotal?: number
}): React.ReactNode => (
  <div className="flex flex-wrap items-center gap-3 text-sm">
    {priceLabel && <span className="font-medium text-default-600">{priceLabel}</span>}
    {rating != null && (
      <span className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-warning text-warning" />
        {rating}
        {ratingsTotal != null && <span className="text-default-400">({ratingsTotal})</span>}
      </span>
    )}
  </div>
)

export const WebsiteLink = ({ url }: { url: string }): React.ReactNode => (
  <div className="flex min-w-0 max-w-[250px] items-center gap-2 overflow-hidden text-sm">
    <Store className="h-4 w-4 shrink-0 text-default-500" />
    <a
      className="min-w-0 truncate text-primary underline"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
      title={url}
    >
      {url}
    </a>
  </div>
)

export const PhotoGallery = ({ name, photos }: { name: string; photos: string[] }): React.ReactNode => {
  if (photos.length === 0) return <PhotoPlaceholder />
  if (photos.length === 1) return <PhotoImage alt={name} src={photos[0]} />

  const images = photos.map((src, i) => ({
    src,
    alt: `${name} photo ${i + 1} of ${photos.length}`,
  }))
  return <PhotoCarousel images={images} />
}

export const ChooseButton = ({ disabled, onClick }: { disabled?: boolean; onClick: () => void }): React.ReactNode => (
  <Button className="w-full" isDisabled={disabled} onPress={onClick} variant="primary">
    {disabled && <Spinner color="current" size="sm" />}
    {disabled ? 'Choosing...' : 'Choose'}
  </Button>
)

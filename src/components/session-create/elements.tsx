import {
  Autocomplete,
  AutocompleteFilter,
  AutocompleteIndicator,
  AutocompletePopover,
  AutocompleteTrigger,
  AutocompleteValue,
  Button,
  Description,
  EmptyState,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  SearchField,
  SliderFill,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  Spinner,
  Switch,
  Tag,
  TagGroup,
  Input,
  useFilter,
} from '@heroui/react'
import type { Key } from '@heroui/react'
import { Clock, LocateFixed } from 'lucide-react'
import React from 'react'

import { PillArrowButton } from '@components/pill-arrow-button'
import { LoadingSpinner } from '@components/session/loading'
import type { SortOption } from '@types'

/* The settled height of <CreateCard>, reserved here so that swapping this card for the real form
   moves nothing. This column's height is the grid row's height, and on md+ `.home-grid` centers the
   two columns against each other — so the column growing from a spinner to the finished form did not
   just fill space below itself, it pulled the hero down with it. That single swap measured as the
   bulk of the home page's 0.24 CLS.

   Hard-coding a pixel height is only safe because the md grid pins this column to exactly 460px
   (`md:grid-cols-[1fr_460px]` in src/pages/index.tsx), so above md the form has one width and one
   height. To re-derive it, load the page and read the settled `.arena-glass-outer` height in the
   right column at any viewport ≥ md. It will drift if the API's sort options change count or a field
   is added to the form — both of which change the form's height by a row.

   Deliberately not applied below md, where the column is fluid and the form is taller than this
   (≈968px at 390px wide), so this would under-reserve rather than over-reserve. Nothing is above the
   card there to be pushed anyway — it is the last thing on the page — and mobile CLS measures 0.03. */
export const LoadingCard = ({ error }: { error?: string }): React.ReactNode => (
  <div className="arena-glass-outer flex flex-col md:min-h-[770px]">
    {/* Centers vertically in the reserved height, but deliberately does not center horizontally:
        `items-center` would shrink these children to their content width, and LoadingSpinner cycles
        a status message on a timer, so every message of a different length would resize the box and
        shift the layout. Stretching them keeps the width fixed and lets them center their own text. */}
    <div className="arena-glass-inner flex flex-1 flex-col justify-center p-6">
      {error ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-center text-sm text-red-400" role="alert">
            {error}
          </p>
          <Button
            className="rounded-full border-white/[0.09] bg-white/[0.05] text-default-800"
            onPress={() => window.location.reload()}
            variant="secondary"
          >
            Refresh
          </Button>
        </div>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  </div>
)

/**
 * A real <form>, so the create card can be completed without a pointer.
 *
 * There was no form element anywhere in this app and PillArrowButton had no type, so pressing Enter
 * in the address field did nothing at all. Nobody noticed because every submit here is also a mouse
 * target — which is exactly the shape of a defect that only ever affects people using a keyboard.
 */
export const CreateCard = ({
  children,
  onSubmit,
}: {
  children: React.ReactNode
  onSubmit: () => void
}): React.ReactNode => (
  <div className="arena-glass-outer">
    <div className="arena-glass-inner p-6">
      <form
        className="flex flex-col gap-[18px]"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        {children}
      </form>
    </div>
  </div>
)

export const AddressField = ({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string
  error?: string
  disabled: boolean
  onChange: (value: string) => void
}): React.ReactNode => (
  <div className="w-full">
    <div className="mb-[5px] text-[9px] font-bold uppercase tracking-[0.18em] text-default-600">Your location</div>
    <Input
      aria-describedby={error ? 'address-error' : undefined}
      aria-invalid={error ? true : undefined}
      aria-label="Your location"
      autoComplete="postal-code"
      className="w-full"
      disabled={disabled}
      name="address"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder="Address or ZIP code"
      type="text"
      value={value}
    />
    {/* The field already had an accessible name; what it lacked was any relationship between itself
        and the reason it was rejected. Colour was the whole signal, and colour is not a signal to
        anyone using this without sight. */}
    {error && (
      <span className="mt-1 block text-sm text-red-400" id="address-error" role="alert">
        {error}
      </span>
    )}
  </div>
)

export const UseMyLocationButton = ({
  error,
  isLoading,
  onPress,
}: {
  error?: string
  isLoading: boolean
  onPress: () => void
}): React.ReactNode => (
  <div className="flex flex-col gap-1">
    <button
      className="flex items-center gap-1.5 self-start text-xs text-[#F59E0B] hover:text-[#FBBF24] hover:underline disabled:opacity-40"
      disabled={isLoading}
      onClick={onPress}
      type="button"
    >
      {isLoading ? <Spinner className="h-3 w-3" size="sm" /> : <LocateFixed className="h-3 w-3" />}
      {isLoading ? 'Detecting location…' : 'Use my location'}
    </button>
    {error && (
      <span className="text-xs text-red-400" role="alert">
        {error}
      </span>
    )}
  </div>
)

const radioContentClass = [
  'group relative flex w-full flex-col items-start gap-0.5 rounded-[10px] border px-3 py-2.5 text-[11px] font-medium transition-all',
  'border-white/[0.06] bg-white/[0.02] text-default-500',
  'data-[selected=true]:border-[rgba(245,158,11,0.25)] data-[selected=true]:bg-[rgba(245,158,11,0.08)] data-[selected=true]:text-[#F59E0B]',
  'data-[focus-visible=true]:border-[rgba(245,158,11,0.25)] data-[focus-visible=true]:bg-[rgba(245,158,11,0.08)]',
].join(' ')

export const SortByFieldset = ({
  rankBy,
  isLoading,
  options,
  onChange,
}: {
  rankBy: string
  isLoading: boolean
  options: SortOption[]
  onChange: (value: string) => void
}): React.ReactNode => (
  <RadioGroup isDisabled={isLoading} onChange={(v) => onChange(v)} value={rankBy} variant="secondary">
    <Label className="text-[9px] font-bold uppercase tracking-[0.18em] text-default-600">Sort by</Label>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map(({ value, label, description }) => (
        <Radio key={value} value={value}>
          <Radio.Content className={radioContentClass}>
            <Radio.Control className="absolute top-2.5 right-2.5 size-4">
              <Radio.Indicator />
            </Radio.Control>
            <Label className="text-[11px] font-semibold">{label}</Label>
            <Description className="text-[10px]">{description}</Description>
          </Radio.Content>
        </Radio>
      ))}
    </div>
  </RadioGroup>
)

export const VoteCountHint = ({ maxChoices }: { maxChoices: number }): React.ReactNode => {
  const maxVotes = maxChoices - 1
  return (
    <p className="text-[11px] text-default-500">
      Up to <span className="font-semibold text-[#F59E0B]">{maxChoices}</span> restaurants —{' '}
      <span className="font-semibold text-[#F59E0B]">{maxVotes}</span> {maxVotes === 1 ? 'vote' : 'votes'} per person
    </p>
  )
}

export const MaxChoicesSlider = ({
  value,
  disabled,
  min,
  max,
  onChange,
}: {
  value: number
  disabled: boolean
  min: number
  max: number
  onChange: (v: number) => void
}): React.ReactNode => (
  <div className="w-full">
    <div className="mb-3 flex items-center justify-between text-sm">
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-default-600">Maximum restaurants</span>
      <span className="font-semibold text-[#F59E0B]">{value}</span>
    </div>
    <SliderRoot
      aria-label="Maximum restaurants"
      isDisabled={disabled}
      maxValue={max}
      minValue={min}
      onChange={(v: number | number[]) => onChange(Array.isArray(v) ? v[0] : v)}
      step={1}
      value={value}
    >
      <SliderTrack>
        <SliderFill />
        <SliderThumb />
      </SliderTrack>
    </SliderRoot>
  </div>
)

export const DistanceSlider = ({
  value,
  disabled,
  min,
  max,
  onChange,
}: {
  value: number
  disabled: boolean
  min: number
  max: number
  onChange: (v: number) => void
}): React.ReactNode => (
  <div className="w-full">
    <div className="mb-3 flex items-center justify-between text-sm">
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-default-600">Maximum distance</span>
      <span className="font-semibold text-[#F59E0B]">
        {value} {value === 1 ? 'mile' : 'miles'}
      </span>
    </div>
    <SliderRoot
      aria-label="Maximum distance"
      isDisabled={disabled}
      maxValue={max}
      minValue={min}
      onChange={(v: number | number[]) => onChange(Array.isArray(v) ? v[0] : v)}
      step={1}
      value={value}
    >
      <SliderTrack>
        <SliderFill />
        <SliderThumb />
      </SliderTrack>
    </SliderRoot>
  </div>
)

/**
 * Submission goes through the form, not through this button.
 *
 * With both an onPress and type="submit" the handler fires twice for one press — once from the press
 * handler and once from the native submit — which is how a click ended up clearing the very error it
 * had just produced. The form is the single path, so keyboard and pointer take exactly the same one.
 */
export const SubmitButton = ({ isLoading }: { isLoading: boolean }): React.ReactNode => (
  <PillArrowButton
    isLoading={isLoading}
    label="Find restaurants"
    loadingLabel="Loading..."
    onPress={() => undefined}
    type="submit"
  />
)

export interface MultiSelectItem {
  id: string
  name: string
}

export const MultiSelect = ({
  items,
  selectedKeys,
  onChange,
  label,
  disabled,
}: {
  items: MultiSelectItem[]
  selectedKeys: string[]
  onChange: (key: string) => void
  label: string
  disabled?: boolean
}): React.ReactNode => {
  const { contains } = useFilter({ sensitivity: 'base' })

  const onRemoveTags = (keys: Set<Key>) => {
    keys.forEach((key) => onChange(String(key)))
  }

  const handleChange = (keys: Key | Key[] | null) => {
    const newKeys = new Set(Array.isArray(keys) ? keys.map(String) : [])
    const oldKeys = new Set(selectedKeys)
    for (const key of newKeys) {
      if (!oldKeys.has(key)) onChange(key)
    }
    for (const key of oldKeys) {
      if (!newKeys.has(key)) onChange(key)
    }
  }

  return (
    <Autocomplete
      aria-label={label}
      isDisabled={disabled}
      onChange={handleChange}
      selectionMode="multiple"
      value={selectedKeys as Key[]}
    >
      <Label className="text-[9px] font-bold uppercase tracking-[0.18em] text-default-600">{label}</Label>
      <AutocompleteTrigger>
        <AutocompleteValue>
          {({ defaultChildren, isPlaceholder, state }: any) => {
            if (isPlaceholder || !state?.selectedItems?.length) {
              return defaultChildren
            }
            const selectedItemsKeys = state.selectedItems.map((item: { key: Key }) => item.key)
            return (
              <TagGroup aria-label={`Selected ${label}`} onRemove={onRemoveTags} size="sm">
                <TagGroup.List>
                  {selectedItemsKeys.map((key: Key) => {
                    const item = items.find((s) => s.id === String(key))
                    if (!item) return null
                    return (
                      <Tag id={item.id} key={item.id}>
                        {item.name}
                      </Tag>
                    )
                  })}
                </TagGroup.List>
              </TagGroup>
            )
          }}
        </AutocompleteValue>
        <AutocompleteIndicator />
      </AutocompleteTrigger>
      <AutocompletePopover>
        <AutocompleteFilter filter={contains}>
          <SearchField aria-label={`Search ${label}`} autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {items.map((item) => (
              <ListBox.Item id={item.id} key={item.id} textValue={item.name}>
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </AutocompleteFilter>
      </AutocompletePopover>
    </Autocomplete>
  )
}

export const FilterClosingSoonToggle = ({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}): React.ReactNode => (
  <Switch isDisabled={disabled} isSelected={checked} onChange={onChange}>
    <Switch.Content
      className={`flex w-full items-center justify-between gap-3 rounded-[10px] border p-3 transition-all ${
        checked
          ? 'border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)]'
          : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
            checked ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]' : 'bg-white/[0.05] text-default-500'
          }`}
        >
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Label className="text-sm font-medium text-default-800">Skip closed & closing places</Label>
          <Description className="cursor-[inherit]! text-xs text-default-500">
            Skip places already closed or closing within an hour
          </Description>
        </div>
      </div>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch.Content>
  </Switch>
)

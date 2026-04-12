import {
  Autocomplete,
  AutocompleteFilter,
  AutocompleteIndicator,
  AutocompletePopover,
  AutocompleteTrigger,
  AutocompleteValue,
  Button,
  Card,
  CardContent,
  CardHeader,
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
  Tag,
  TagGroup,
  Input,
  useFilter,
} from '@heroui/react'
import type { Key } from '@heroui/react'
import React from 'react'

import { LoadingSpinner } from '@components/session/loading'
import type { SortOption } from '@types'

export const LoadingCard = ({ error }: { error?: string }): React.ReactNode => (
  <Card className="mx-auto w-full max-w-[600px] p-4">
    <CardContent>
      {error ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-center text-sm text-danger">{error}</p>
          <Button onPress={() => window.location.reload()} variant="secondary">
            Refresh
          </Button>
        </div>
      ) : (
        <LoadingSpinner />
      )}
    </CardContent>
  </Card>
)

export const CreateCard = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <Card className="mx-auto w-full max-w-[600px] p-4">
    <CardHeader className="flex-col items-start gap-1 pb-2">
      <h3 className="choosee-brand text-3xl text-foreground">What are we eating?</h3>
      <p className="text-sm text-default-500">Set up a bracket to find the winner</p>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-5">{children}</div>
    </CardContent>
  </Card>
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
    <Label>Your address</Label>
    <Input
      aria-label="Your address"
      autoComplete="postal-code"
      className="w-full"
      disabled={disabled}
      name="address"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder="Enter your address"
      type="text"
      value={value}
    />
    {error && <span className="text-sm text-red-500">{error}</span>}
  </div>
)

const radioBaseClass = [
  'group relative flex-col gap-4 rounded-xl border px-4 py-3 transition-all',
  'border-default-200 hover:border-default-300 hover:bg-default-50',
  'data-[selected=true]:border-primary data-[selected=true]:bg-primary/10',
  'data-[focus-visible=true]:border-primary data-[focus-visible=true]:bg-primary/10',
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
    <Label>Sort by</Label>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {options.map(({ value, label, description }) => (
        <Radio className={radioBaseClass} key={value} value={value}>
          <Radio.Control className="absolute top-3 right-3 size-5">
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content className="flex flex-col gap-1">
            <Label>{label}</Label>
            <Description>{description}</Description>
          </Radio.Content>
        </Radio>
      ))}
    </div>
  </RadioGroup>
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
      <span className="font-medium">Maximum distance</span>
      <span className="font-semibold text-primary">
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

export const SubmitButton = ({ isLoading, onPress }: { isLoading: boolean; onPress: () => void }): React.ReactNode => (
  <Button className="w-full" isDisabled={isLoading} onPress={onPress} variant="primary">
    {isLoading && <Spinner color="current" size="sm" />}
    {isLoading ? 'Loading...' : 'Choose restaurants'}
  </Button>
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
      <Label>{label}</Label>
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

import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError } from 'aws-amplify/api'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  AddressField,
  CreateCard,
  DistanceSlider,
  FilterClosingSoonToggle,
  LoadingCard,
  MultiSelect,
  SortByFieldset,
  SubmitButton,
} from './elements'
import FeedbackMessage from '@components/feedback-message'
import { createSession, fetchAddress, fetchSessionConfig } from '@services/api'
import { NewSessionRequest, PlaceTypeDisplay, SessionConfig } from '@types'

const RECAPTCHA_SCRIPT_ID = 'recaptcha-v3-script'

const RECAPTCHA_TIMEOUT_MS = 10_000

/** Polls for the reCAPTCHA global then waits for it to be ready. Handles the case where
    the script tag hasn't finished loading yet when this is called. */
const waitForRecaptcha = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + RECAPTCHA_TIMEOUT_MS
    const check = () => {
      if (typeof grecaptcha !== 'undefined' && grecaptcha.ready) {
        grecaptcha.ready(resolve)
      } else if (Date.now() > deadline) {
        reject(new Error('reCAPTCHA failed to load'))
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })

const SessionCreate = (): React.ReactNode => {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState<string | undefined>()
  const [choiceTypes, setChoiceTypes] = useState<PlaceTypeDisplay[]>([])
  const [excludedTypes, setExcludedTypes] = useState<PlaceTypeDisplay[]>([])
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [radiusMiles, setRadiusMiles] = useState<number | undefined>()
  const [rankBy, setRankBy] = useState<string | undefined>()
  const [filterClosingSoon, setFilterClosingSoon] = useState(false)
  const addressTouchedRef = useRef(false)
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  const clearError = useCallback(() => setErrorMessage(undefined), [])
  const [isNavigating, setIsNavigating] = useState(false)

  const {
    data: config,
    isLoading: isConfigLoading,
    isError: isConfigError,
  } = useQuery<SessionConfig>({
    queryKey: ['sessionConfig'],
    queryFn: fetchSessionConfig,
    staleTime: Infinity,
  })

  const sessionMutation = useMutation({
    mutationFn: async (session: NewSessionRequest) => {
      await waitForRecaptcha()
      const token = await grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'CREATE_SESSION' })
      return createSession(session, token)
    },
    onSuccess: (data) => {
      setIsNavigating(true)
      router.push(`/s/${data.sessionId}`)
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.response?.statusCode === 403) {
        setErrorMessage('Unusual traffic detected. Please try again later.')
      } else {
        setErrorMessage('Error generating voting session. Please try again later.')
      }
    },
  })

  useEffect(() => {
    if (!config || defaultsApplied) return
    setChoiceTypes(config.placeTypes.filter((t) => t.defaultType))
    setExcludedTypes(config.placeTypes.filter((t) => t.defaultExclude))
    setRankBy(config.sortOptions[0]?.value)
    setRadiusMiles(config.radius.defaultMiles)
    setDefaultsApplied(true)
  }, [config, defaultsApplied])

  useEffect(() => {
    if (!document.getElementById(RECAPTCHA_SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = RECAPTCHA_SCRIPT_ID
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await waitForRecaptcha()
          const token = await grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'GEOCODE' })
          const result = await fetchAddress(pos.coords.latitude, pos.coords.longitude, token)
          if (!addressTouchedRef.current) {
            setAddress(result.address)
          }
        } catch {
          // Silently ignore — reverse geocode 404 or reCAPTCHA failure just leaves the field empty for manual entry
        }
      },
      undefined,
      { enableHighAccuracy: true },
    )
  }, [])

  const handleChoiceTypeChange = (value: string): void => {
    if (!config) return
    const selected = config.placeTypes.find((t) => t.value === value)
    if (!selected) return
    if (selected.mustBeSingleType) {
      setChoiceTypes([selected])
    } else {
      const exists = choiceTypes.find((t) => t.value === value)
      if (exists) {
        setChoiceTypes(choiceTypes.filter((t) => t.value !== value))
      } else {
        setChoiceTypes([...choiceTypes.filter((t) => !t.mustBeSingleType), selected])
      }
    }
  }

  const handleExcludedTypeChange = (value: string): void => {
    if (!config) return
    const selected = config.placeTypes.find((t) => t.value === value && t.canBeExcluded !== false)
    if (!selected) return
    const exists = excludedTypes.find((t) => t.value === value)
    if (exists) {
      setExcludedTypes(excludedTypes.filter((t) => t.value !== value))
    } else {
      setExcludedTypes([...excludedTypes, selected])
    }
  }

  const handleSubmit = (): void => {
    if (radiusMiles === undefined || rankBy === undefined) return

    if (!address) {
      setAddressError('Please enter your address to begin')
      return
    }
    setAddressError(undefined)

    if (choiceTypes.length === 0) {
      setErrorMessage('Please select at least one restaurant type')
      return
    }

    sessionMutation.mutate({
      address,
      type: choiceTypes.map((t) => t.value),
      exclude: excludedTypes.map((t) => t.value),
      radiusMiles,
      rankBy,
      filterClosingSoon,
    })
  }

  if (isConfigLoading) {
    return <LoadingCard />
  }

  if (isConfigError || !config) {
    return <LoadingCard error="Failed to load session options. Please refresh or try again later." />
  }

  const isLoading = sessionMutation.isPending || isNavigating

  return (
    <>
      <CreateCard>
        <AddressField
          disabled={isLoading}
          error={addressError}
          onChange={(v) => {
            addressTouchedRef.current = true
            setAddress(v)
          }}
          value={address}
        />
        <MultiSelect
          disabled={isLoading}
          items={config.placeTypes.map((t) => ({ id: t.value, name: t.display }))}
          label="Restaurant type"
          onChange={handleChoiceTypeChange}
          selectedKeys={choiceTypes.map((t) => t.value)}
        />
        <MultiSelect
          disabled={isLoading}
          items={config.placeTypes
            .filter((type) => type.canBeExcluded !== false)
            .map((t) => ({ id: t.value, name: t.display }))}
          label="Excluded types"
          onChange={handleExcludedTypeChange}
          selectedKeys={excludedTypes.map((t) => t.value)}
        />
        <SortByFieldset
          isLoading={isLoading}
          onChange={setRankBy}
          options={config.sortOptions}
          rankBy={rankBy ?? config.sortOptions[0]?.value}
        />
        <DistanceSlider
          disabled={isLoading}
          max={config.radius.maxMiles}
          min={config.radius.minMiles}
          onChange={(v) => setRadiusMiles(v)}
          value={radiusMiles ?? config.radius.defaultMiles}
        />
        <FilterClosingSoonToggle checked={filterClosingSoon} disabled={isLoading} onChange={setFilterClosingSoon} />
        <p className="text-center text-xs">Voting sessions automatically expire after 24 hours</p>
        <SubmitButton isLoading={isLoading} onPress={handleSubmit} />
      </CreateCard>
      <FeedbackMessage autoHideDuration={15_000} message={errorMessage} onClose={clearError} severity="error" />
    </>
  )
}

export default SessionCreate

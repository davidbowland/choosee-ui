export { AmplifyUser } from '@aws-amplify/ui'
export { Operation as PatchOperation } from 'fast-json-patch'
export { Theme } from '@mui/material/styles'

export type AuthState = 'signIn' | 'signUp' | 'resetPassword'

export type PlaceType = string
export type RankByType = 'DISTANCE' | 'POPULARITY'

export interface AddressResult {
  address: string
}

export interface PlaceDetails {
  formattedAddress?: string
  formattedPhoneNumber?: string
  formattedPriceLevel: { label: string; rating: number }
  internationalPhoneNumber?: string
  name: string
  openHours?: string[]
  photos: string[]
  priceLevel: number
  rating: number
  ratingsTotal?: number
  vicinity: string
  website?: string
}

export interface PlaceTypeDisplay {
  canBeExcluded?: boolean
  defaultExclude?: boolean
  defaultType?: boolean
  display: string
  mustBeSingleType?: boolean
  value: PlaceType
}

// Decisions

export interface DecisionObject {
  [key: string]: boolean
}

export interface Decision {
  decisions: DecisionObject
}

// Sessions

export interface StatusObject {
  current: 'waiting' | 'deciding' | 'winner' | 'finished' | 'expired'
  winner?: PlaceDetails
}

export interface SessionData {
  address: string
  choiceId: string
  exclude: PlaceType[]
  expiration: number
  lastAccessed: number
  location: { latitude: number; longitude: number }
  owner?: string
  sessionId?: string
  status: StatusObject
  type: PlaceType[]
  voterCount: number
}

export interface NewSession {
  address: string
  exclude: PlaceType[]
  expiration?: number
  radius?: number
  rankBy?: string
  type: PlaceType[]
  voterCount: number
}

// Misc

export interface StringObject {
  [key: string]: string
}

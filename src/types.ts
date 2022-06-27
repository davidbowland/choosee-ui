export { CognitoUserAmplify } from '@aws-amplify/ui'
export { Operation as PatchOperation } from 'fast-json-patch'
export { Theme } from '@mui/material/styles'

export type AuthState = 'signIn' | 'signUp' | 'resetPassword'

export type PlaceType = 'restaurant' | 'meal_delivery' | 'meal_takeaway'

export type RankByType = 'distance' | 'prominence'

export interface AddressResult {
  address: string
}

export interface PlaceDetails {
  formattedAddress?: string
  formattedPhoneNumber?: string
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

export interface DecisionObject {
  [key: string]: boolean
}

export interface Decision {
  decisions: DecisionObject
}

export interface StatusObject {
  current: 'deciding' | 'winner' | 'finished' | 'expired'
  pageId: number
  winner?: PlaceDetails
}

export interface SessionData {
  address: string
  choiceId: string
  expiration: number
  lastAccessed: number
  location: { lat: number; lng: number }
  maxPrice: number
  minPrice: number
  openNow: boolean
  owner?: string
  pagesPerRound: number
  sessionId?: string
  status: StatusObject
  type: PlaceType
  voterCount: number
}

export interface NewSession {
  address: string
  expiration?: number
  maxPrice?: number
  minPrice?: number
  openNow?: boolean
  pagesPerRound?: number
  radius?: number
  rankBy?: string
  type: PlaceType
  voterCount: number
}

export interface StringObject {
  [key: string]: string
}

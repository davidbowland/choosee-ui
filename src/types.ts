export { CognitoUserAmplify } from '@aws-amplify/ui'
export { Operation as PatchOperation } from 'fast-json-patch'
export { Theme } from '@mui/material/styles'

export type AuthState = 'signIn' | 'signUp' | 'resetPassword'

export type PlaceType = 'restaurant' | 'meal_delivery' | 'meal_takeaway'

export interface AddressResult {
  address: string
}

export interface Place {
  name: string
  openHours?: string[]
  pic?: string
  priceLevel: number
  rating: number
  vicinity: string
}

export interface PlaceDetails extends Place {
  formattedAddress?: string
  formattedPhoneNumber?: string
  internationalPhoneNumber?: string
  website?: string
}

export interface DecisionObject {
  [key: string]: boolean
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
  openNow: boolean
  pagesPerRound: number
  status: StatusObject
  type: PlaceType
  voterCount: number
}

export interface NewSession {
  address: string
  expiration?: number
  openNow?: boolean
  pagesPerRound?: number
  type: PlaceType
  voterCount: number
}

export interface StringObject {
  [key: string]: string
}

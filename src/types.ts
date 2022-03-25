export { CognitoUserAmplify } from '@aws-amplify/ui'
export { Operation as PatchOperation } from 'fast-json-patch'

export type AuthState = 'signIn' | 'signUp' | 'resetPassword'

export type PlaceType = 'restaurant' | 'meal_delivery' | 'meal_takeaway'

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
  address: string
  current: 'deciding' | 'winner' | 'finished' | 'expired'
  pageId: number
  winner?: PlaceDetails
}

export interface NewSession {
  address: string
  expiration?: number
  openNow?: boolean
  type: PlaceType
  voterCount: number
}

export interface StringObject {
  [key: string]: string
}

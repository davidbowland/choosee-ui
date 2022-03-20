export { CognitoUserAmplify } from '@aws-amplify/ui'
export { Operation as PatchOperation } from 'fast-json-patch'

export type AuthState = 'signIn' | 'signUp' | 'resetPassword'

export type RestaurantType = 'restaurant' | 'meal_delivery' | 'meal_takeaway'

export interface Restaurant {
  name: string
  openHours?: string[]
  pic?: string
  priceLevel: number
  rating: number
  vicinity: string
}

export interface DecisionObject {
  [key: string]: boolean
}

export interface StatusObject {
  current: 'deciding' | 'winner' | 'finished'
  pageId: number
  winner?: Restaurant
}

export interface NewSession {
  address: string
  expiration?: number
  radius: number
  type: RestaurantType
}

export interface StringObject {
  [key: string]: string
}

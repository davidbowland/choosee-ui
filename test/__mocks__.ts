import { CognitoUserAmplify, DecisionObject, NewSession, PatchOperation, Restaurant, StatusObject } from '@types'

export const choices: Restaurant[] = [
  {
    name: "Shakespeare's Pizza - Downtown",
    pic: 'https://lh3.googleusercontent.com/places/Shakespeares',
    priceLevel: 2,
    rating: 4.6,
    vicinity: '225 South 9th Street, Columbia',
  },
  {
    name: 'Subway',
    pic: 'https://lh3.googleusercontent.com/places/Subway',
    priceLevel: 1,
    rating: 3.8,
    vicinity: '503 East Nifong Boulevard Suite D, Columbia',
  },
]

export const decisions: DecisionObject = {
  "Dave's Place": false,
}

export const jsonPatchOperations: PatchOperation[] = [{ op: 'replace', path: '/address', value: '90036' }]

export const newSession: NewSession = {
  address: '90210',
  radius: 43_659,
  type: 'restaurant',
}

export const restaurant: Restaurant = {
  name: "Dave's Place",
  openHours: undefined,
  pic:
    'Aap_uEDinckK9Ca3tIgxigpNxy1THsppgE5H9ie_tFEc5pDYIDTSC52cWtEWifvmRD6_jhRuo4IsiRY5AZK2Y6_NRv4i_vsANZZpvsXj4gfkT4iYwpAp_i7tVHYRAgJ03ki3JzRv5_ouIPOpa9_uYavGE5fdhADeXeGRhkZnGWPXu5RxJpD1',
  priceLevel: 1,
  rating: 2,
  vicinity: 'Columbia',
}

export const sessionId = 'aeio'

export const statusDeciding: StatusObject = {
  address: '90210',
  current: 'deciding',
  pageId: 0,
}

export const user: CognitoUserAmplify = ({
  attributes: {
    email: '',
    name: 'Steve',
    phone_number: '+18005551234',
  },
} as unknown) as CognitoUserAmplify

export const userId = '+18005551234'

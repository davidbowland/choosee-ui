import {
  CognitoUserAmplify,
  DecisionObject,
  NewSession,
  PatchOperation,
  Place,
  PlaceDetails,
  StatusObject,
} from '@types'

export const choices: Place[] = [
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
  type: 'restaurant',
  voterCount: 2,
}

export const place: Place = {
  name: "Dave's Place",
  openHours: [
    'Monday: 10:00 AM – 2:00 AM',
    'Tuesday: 10:00 AM – 2:00 AM',
    'Wednesday: 10:00 AM – 2:00 AM',
    'Thursday: 10:00 AM – 2:00 AM',
    'Friday: 10:00 AM – 2:00 AM',
    'Saturday: 10:00 AM – 2:00 AM',
    'Sunday: 10:00 AM – 2:00 AM',
  ],
  pic:
    'Aap_uEDinckK9Ca3tIgxigpNxy1THsppgE5H9ie_tFEc5pDYIDTSC52cWtEWifvmRD6_jhRuo4IsiRY5AZK2Y6_NRv4i_vsANZZpvsXj4gfkT4iYwpAp_i7tVHYRAgJ03ki3JzRv5_ouIPOpa9_uYavGE5fdhADeXeGRhkZnGWPXu5RxJpD1',
  priceLevel: 1,
  rating: 2,
  vicinity: 'Columbia',
}

export const placeDetails: PlaceDetails = {
  ...place,
  formattedAddress: '65203, USA',
  internationalPhoneNumber: '+18005550000',
  website: 'https://dbowland.com/',
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

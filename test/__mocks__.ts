import { CognitoUserAmplify, DecisionObject, NewSession, Restaurant, StatusObject } from '@types'

export const choices: Restaurant[] = [
  {
    name: "Shakespeare's Pizza - Downtown",
    pic:
      'Aap_uECXKoGiIwCfoSYS6Ky6NcEiA3t0t-Tyko6HgQNNcNgRsMl2Rzl7ILZpem_hqo7Rg99xgf0qAwUrTT7rWoo31kGzhXyRBX1SBOMGiYMMVZHqOi_mw-nKqs9--bGa6Tz4K6QiJY3m8P0s7uFpvqqKX09nEiQ5wbwdMkb3t5ETLsu0QnbY',
    priceLevel: 2,
    rating: 4.6,
    vicinity: '225 South 9th Street, Columbia',
  },
  {
    name: 'Subway',
    pic:
      'Aap_uECX5Crf8Zv-Nqi9bwkZDiKuEZHmI5kfxoxaa9U6UVuHs3XPALntSg8EXsESgI455fjC7OmzZ18asy_yzI1fF2Et_XCB2BgRkZHjNJr9UhcLdmLKgkfbQxIl5oIbTacStmQ9HaDYUHn93tpreUPDT2bsvn3wCxt_8Zw4E_mSeTePGNg',
    priceLevel: 1,
    rating: 3.8,
    vicinity: '503 East Nifong Boulevard Suite D, Columbia',
  },
]

export const decisions: DecisionObject = {
  "Dave's Place": false,
}

export const newSession: NewSession = {
  address: '90210',
  radius: 43_659,
  type: 'restaurant',
}

export const resturant: Restaurant = {
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
  current: 'deciding',
  pageId: 1,
}

export const user: CognitoUserAmplify = ({
  attributes: {
    email: '',
    name: 'Steve',
    phone_number: '+1800JENNYCRAIG',
  },
} as unknown) as CognitoUserAmplify

export const userId = '+1800JENNYCRAIG'

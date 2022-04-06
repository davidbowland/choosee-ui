import { API } from 'aws-amplify'

import { AddressResult, Place } from '@types'
import { mapsApiName, mapsApiNameUnauthenticated } from '@config/amplify'

export const fetchAddress = (lat: number, lng: number): Promise<AddressResult> =>
  API.get(mapsApiName, '/reverse-geocode', { queryStringParameters: { lat, lng } })

export const fetchChoices = (choiceId: string): Promise<Place[]> =>
  API.get(mapsApiNameUnauthenticated, `/choices/${encodeURIComponent(choiceId)}`, {}).then(
    (response) => response.choices
  )

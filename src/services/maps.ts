import { API } from 'aws-amplify'

import { AddressResult, PlaceDetails } from '@types'
import { mapsApiName, mapsApiNameUnauthenticated } from '@config/amplify'

export const fetchAddress = (lat: number, lng: number, token: string): Promise<AddressResult> =>
  API.get(mapsApiNameUnauthenticated, '/reverse-geocode', {
    headers: { 'x-recaptcha-token': token },
    queryStringParameters: { lat, lng },
  })

export const fetchAddressAuthenticated = (lat: number, lng: number): Promise<AddressResult> =>
  API.get(mapsApiName, '/reverse-geocode/authed', {
    queryStringParameters: { lat, lng },
  })

export const fetchChoices = (choiceId: string): Promise<PlaceDetails[]> =>
  API.get(mapsApiNameUnauthenticated, `/choices/${encodeURIComponent(choiceId)}`, {}).then(
    (response) => response.choices
  )

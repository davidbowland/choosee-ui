import { API } from 'aws-amplify'

import { chooseeApiName, chooseeApiNameUnauthenticated } from '@config/amplify'
import {
  AddressResult,
  Decision,
  NewSession,
  PatchOperation,
  PlaceDetails,
  PlaceTypeDisplay,
  SessionData,
  StringObject,
} from '@types'

// Geocode

export const fetchAddress = (latitude: number, longitude: number, token: string): Promise<AddressResult> =>
  API.get(chooseeApiNameUnauthenticated, '/reverse-geocode', {
    headers: { 'x-recaptcha-token': token },
    queryStringParameters: { latitude, longitude },
  })

export const fetchAddressAuthenticated = (latitude: number, longitude: number): Promise<AddressResult> =>
  API.get(chooseeApiName, '/reverse-geocode/authed', {
    queryStringParameters: { latitude, longitude },
  })

// Choices

export const fetchChoices = (choiceId: string): Promise<PlaceDetails[]> =>
  API.get(chooseeApiNameUnauthenticated, `/choices/${encodeURIComponent(choiceId)}`, {}).then(
    (response) => response.choices,
  )

// Decisions

export const fetchDecision = (sessionId: string, userId: string): Promise<Decision> =>
  API.get(
    chooseeApiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    {},
  )

export const updateDecision = (
  sessionId: string,
  userId: string,
  patchOperations: PatchOperation[],
): Promise<Decision> =>
  API.patch(
    chooseeApiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    { body: patchOperations },
  )

// Sessions

export const createSession = (session: NewSession, token: string): Promise<StringObject> =>
  API.post(chooseeApiNameUnauthenticated, '/sessions', { body: session, headers: { 'x-recaptcha-token': token } })

export const createSessionAuthenticated = (session: NewSession): Promise<StringObject> =>
  API.post(chooseeApiName, '/sessions/authed', { body: session })

export const fetchSession = (sessionId: string): Promise<SessionData> =>
  API.get(chooseeApiNameUnauthenticated, `/sessions/${encodeURIComponent(sessionId)}`, {})

export const textSession = (sessionId: string, voterId: string): Promise<StringObject> =>
  API.post(chooseeApiName, `/sessions/${encodeURIComponent(sessionId)}/send-text/${encodeURIComponent(voterId)}`, {
    body: {},
  })

export const updateSession = (sessionId: string, patchOperations: PatchOperation[]): Promise<SessionData> =>
  API.patch(chooseeApiName, `/sessions/${encodeURIComponent(sessionId)}`, { body: patchOperations })

// Places

export const fetchPlaceTypes = (): Promise<PlaceTypeDisplay[]> =>
  API.get(chooseeApiNameUnauthenticated, '/places/types', {}).then((response) => response.types)

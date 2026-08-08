import { SessionConfig } from '@types'

export const sessionConfigResult: SessionConfig = {
  placeTypes: [
    { defaultType: true, display: 'Any restaurant', value: 'restaurant', mustBeSingleType: true, canBeExcluded: false },
    { display: 'Cat cafe', value: 'cat_cafe' },
    { defaultExclude: true, display: 'Fast food', value: 'fast_food_restaurant' },
    { display: 'Bar', value: 'bar', canBeExcluded: false },
  ],
  sortOptions: [
    { value: 'POPULARITY', label: 'Most popular', description: 'Highest rated first', maxChoices: 20 },
    { value: 'DISTANCE', label: 'Closest', description: 'Nearest to you', maxChoices: 20 },
    { value: 'ALL', label: 'Both', description: 'Popular & nearby', maxChoices: 40 },
  ],
  radius: { defaultMiles: 10, minMiles: 1, maxMiles: 30 },
}

export const recaptchaToken = 'qwertyuiokjhgffgh'

export const sessionId = 'aeio'

/**
 * A rejection shaped exactly like the one `@services/api` throws for a non-2xx response, so error
 * paths are exercised against the real thing rather than a guess at it.
 */
export const apiError = (statusCode: number, body = '{}'): Error =>
  Object.assign(new Error(`responded with ${statusCode}`), { body, statusCode })

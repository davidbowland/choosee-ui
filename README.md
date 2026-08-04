# choosee-ui

Next.js and Amplify implementation of choosee-api and choosee-infrastructure. Example: <https://choosee.dbowland.com/>

## Static Site

### Prerequisites

1. [Node](https://nodejs.org/en/)
1. [NPM](https://www.npmjs.com/)

### Local Development

The Next.js development server automatically rerenders in the browser when the source code changes. Start the local development server with:

```bash
npm run start
```

Alternatively, run a production build and serve that static content with:

```bash
npm run serve
```

Then view the server at <http://localhost:3000/>

### Unit Tests

[Jest](https://jestjs.io/) tests are run automatically on commit and push. If the test coverage threshold is not met, the push will fail. See `jest.config.mjs` for coverage threshold.

Manually run tests with:

```bash
npm run test
```

### Prettier / Linter

Both [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/) are executed on commit. Manually prettify and lint code with:

```bash
npm run lint
```

### Deploying to Production

This project automatically deploys to production when a merge to `master` is made via a pull request.

## Deploy Script

In extreme cases, the UI can be deployed with:

```bash
npm run deploy
```

The `developer` role and [AWS SAM CLI](https://aws.amazon.com/serverless/sam/) are required to deploy this project.

## Deploy prerequisites

### VAPID keys (choosee-api)

Web Push signing keys must exist in SSM **before the first notification is sent**, in each
environment. Nothing in the stack creates them and nothing fails at deploy time if they are
missing — the round advances normally and every notification fails with an AccessDenied visible
only in CloudWatch.

Generate once, in `choosee-api`:

```bash
npm run generate-vapid-keys
```

Rotating the pair silently invalidates every live subscription, and nothing tells the affected
devices — they simply stop receiving notifications. Generate once and leave it alone.

Store both halves at the paths derived from `EnvironmentMap.ssmPrefix` in `template.yaml`
(`/choosee-api` for prod, `/choosee-api-test` for test):

```bash
aws ssm put-parameter --name "/choosee-api-test/vapid-public-key"  --type String       --value "<publicKey>"
aws ssm put-parameter --name "/choosee-api-test/vapid-private-key" --type SecureString --value "<privateKey>"
```

Two things about the types are load-bearing:

- The **public** key must be a plain `String`. `GetVapidPublicKeyFunction` is unauthenticated and
  deliberately has no `kms:Decrypt` grant, so a SecureString there cannot be read at runtime.
- The **private** key must be a `SecureString` under the account's default `aws/ssm` key — the ARN
  hardcoded in `template.yaml`, which every SecureString-reading function is granted. Encrypting it
  under a different CMK makes it unreadable by the functions that need it.

### Deploy order

`choosee-api` first, then `choosee-ui`. Neither stack imports from the other, so CloudFormation
enforces nothing — but the UI expects the push endpoints to exist, and the API drops the `/authed`
routes the previously deployed UI still calls. API-first puts the new contract in place for the UI
that is about to ship.

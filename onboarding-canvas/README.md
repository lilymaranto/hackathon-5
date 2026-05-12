# Braze Onboarding Canvas

## Required env vars

Create `onboarding-canvas/.env.local`:

```env
CABOODLE_CONFIGS_API=https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com/api/v1/ALRKKYeY
CABOODLE_TILES_API=https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com/api/v1/PLLzcDoN
CABOODLE_API_KEY=PASTE_ME

GOOGLE_CLIENT_ID=PASTE_ME
GOOGLE_CLIENT_SECRET=PASTE_ME
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=PASTE_ME
AUTH_URL=http://localhost:3000
AUTH_SECRET=PASTE_ME
```

`AUTH_SECRET` can be generated with:

```bash
openssl rand -base64 32
```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

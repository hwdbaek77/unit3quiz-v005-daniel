# Overdose Trends Dashboard

Single-page React/Vite app that visualizes overdose data (per-month, filterable by **Drug / indicator**) and includes a
**Firestore-backed** live vote widget.

## Data

- The CSV is served from `public/overdoseRates.csv` and parsed in the browser (PapaParse worker).
- The chart UI lets you segment by **Drug / indicator** and **Location** (defaults to US).
- Dataset source: `https://catalog.data.gov/dataset/provisional-drug-overdose-death-counts-for-specific-drugs`

## Firestore (Voting) Setup

### 1) Create a Firebase project + Firestore database

- In the Firebase Console, create a project.
- In **Build → Firestore Database**, click **Create database** and start in **test mode** (fine for a class demo).
- In **Project settings → Your apps**, add a **Web app** and copy the Firebase config values.

### 2) Add your Firebase config to Vite env vars

Create a file named **`.env.local`** in the project root (this file is not committed), and paste your values:

```env
# Copy from env.example and fill these in
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=... # optional
```

An example template is included in `env.example`.

> Note: This repo also includes a fallback Firebase config so the deployed site can work without extra setup. You can
> override it with `.env.local` if needed.

### 3) Install + run

```bash
npm install
npm run dev
```

### What gets written to Firestore?

Votes are stored in:

- Collection: `votes`
- Document: `political-statement-v1`

Fields:
- `support` (number)
- `against` (number)
- `statement` (string)
- `createdAt`, `updatedAt` (timestamps)


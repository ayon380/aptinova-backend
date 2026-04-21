# Aptinova Backend

Backend API for the Aptinova hiring platform, built with Node.js, Express, Sequelize, and PostgreSQL.

## Overview

This service powers:
- multi-role authentication (Candidate, HR, HR Manager)
- job posting and application workflows
- hiring test creation and evaluation
- interview scheduling and feedback
- team and organization operations
- subscription and payment flows (Razorpay)
- AI-assisted resume parsing and analysis features (Gemini)
- passkey/WebAuthn support
- code execution for technical assessments

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL + Sequelize
- **Auth:** JWT, refresh tokens, Passport (Local + OAuth providers), WebAuthn
- **Sessions:** `express-session` + `connect-session-sequelize`
- **Storage/Media:** Cloudinary
- **Payments:** Razorpay
- **Email:** Nodemailer
- **AI services:** Google Generative AI (Gemini)
- **Deployment routing:** Vercel rewrites (`vercel.json`)

## Project Structure

```text
api/
  index.js                  # App bootstrap, middleware, route mounting
config/
  database.js               # Sequelize + PostgreSQL connection/retry
  passport.js               # Local/OAuth passport strategies
  subscriptionPlans.js      # Candidate/HR manager plan definitions
middleware/
  auth.js                   # JWT auth + role authorization middleware
  jwtAuth.js                # Additional JWT auth middleware
models/                     # Sequelize models
routes/                     # Feature route modules
utils/                      # Email, tokens, code execution, and helper logic
```

## Installation

### Prerequisites

- Node.js 18+ (recommended)
- npm
- PostgreSQL instance

### Setup

```bash
npm install
```

Create a `.env` file in the repo root and add the required variables from the next section.

### Run locally

```bash
npm run dev
```

or

```bash
npm start
```

By default, the API listens on **port 3000**.

## Environment Variables

Set these in `.env` (or deployment environment). Required status depends on enabled features.

### Core app/auth

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | No | Enables production cookie/SSL behavior when `production`. |
| `DATABASE_URL` | No* | PostgreSQL connection string. If missing, local fallback is used. |
| `SESSION_SECRET` | Yes | Session signing secret. |
| `JWT_SECRET` | Yes | JWT access token signing/verifying secret. |
| `REFRESH_TOKEN_SECRET` | Yes | JWT refresh token signing/verifying secret. |
| `FRONTEND_URL` | Yes | Frontend redirect/callback base URL. |

\*Strongly recommended to define explicitly (and typically required in production environments).

### OAuth & calendar

| Variable | Required | Purpose |
|---|---:|---|
| `GOOGLE_CLIENT_ID` | For Google auth/interviews | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | For Google auth/interviews | Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | For interview calendar flow | OAuth redirect URI used by calendar integration. |
| `MICROSOFT_CLIENT_ID` | For Microsoft login | Microsoft OAuth client ID. |
| `MICROSOFT_CLIENT_SECRET` | For Microsoft login | Microsoft OAuth client secret. |
| `LINKEDIN_CLIENT_ID` | For LinkedIn login | LinkedIn OAuth client ID. |
| `LINKEDIN_CLIENT_SECRET` | For LinkedIn login | LinkedIn OAuth client secret. |
| `REFRESH_TOKEN` | For interview scheduling | Google refresh token used for Calendar API calls. |

### WebAuthn/passkeys

| Variable | Required | Purpose |
|---|---:|---|
| `WEBAUTHN_RP_ID` | For passkeys | Relying Party ID (defaults to `localhost`). |
| `WEBAUTHN_ORIGIN` | For passkeys | Expected origin (defaults to `http://localhost:4000`). |

### Email

| Variable | Required | Purpose |
|---|---:|---|
| `EMAIL_USER` | For email features | SMTP sender account. |
| `EMAIL_PASSWORD` | For email features | SMTP password/app password. |

### Media/storage

| Variable | Required | Purpose |
|---|---:|---|
| `CLOUDINARY_CLOUD_NAME` | For upload routes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | For upload routes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | For upload routes | Cloudinary API secret. |

### Payments/subscriptions

| Variable | Required | Purpose |
|---|---:|---|
| `RAZORPAY_KEY_ID` | For payment routes | Razorpay API key ID. |
| `RAZORPAY_KEY_SECRET` | For payment routes | Razorpay API key secret. |
| `RAZORPAY_WEBHOOK_SECRET` | For webhook validation | Razorpay webhook signature secret. |

### AI features

| Variable | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | For AI parsing/analysis routes | Google Gemini API key. |

### Domain management

| Variable | Required | Purpose |
|---|---:|---|
| `VERCEL_TOKEN` | For domain routes | Token for Vercel project domain APIs. |
| `VERCEL_PROJECT_ID` | For domain routes | Target Vercel project ID. |

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `start` | `node api/index.js` | Start production-like server process. |
| `dev` | `nodemon api/index.js` | Start server with auto-reload in development. |
| `test` | `echo "Error: no test specified" && exit 1` | Placeholder; no automated test suite is currently configured. |

## API Modules

Base URL is the server origin (local default: `http://localhost:3000`).

Mounted route groups:

- `/auth` – registration, login, OAuth callbacks, passkeys, password reset, token refresh/logout
- `/candidate` – candidate profile and candidate-facing operations
- `/payments` – subscription plans, creation/cancelation, tier changes, webhook handling
- `/jobs` – job listing, creation, update, delete, applications views
- `/get-started` – onboarding/get-started workflows
- `/hiring-tests` – hiring test CRUD and test lifecycle operations
- `/applicants` – applicant listing, status updates, invitation/management operations
- `/hrm` – HR manager profile/organization-related operations
- `/hr` – HR profile and HR-scoped operations
- `/domains` – subdomain availability, add/delete domain in Vercel
- `/interviews` – interview scheduling, feedback submission, interview retrieval
- `/code` – code execution and supported language metadata
- `/traits` – traits analysis endpoints
- `/hrrequest` – AI-assisted job description analysis endpoint
- `/validate-subjective` – subjective answer grading endpoint
- `/parser` – resume parsing endpoint
- `/teams` – team management and HR onboarding token workflows

Notable endpoint examples:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/logout`
- `GET /auth/user`
- `POST /code/execute`
- `GET /code/supported-languages`
- `POST /interviews/schedule`
- `POST /domains/add`
- `DELETE /domains/delete`
- `POST /payments/create-subscription`
- `POST /payments/webhook`

## Authentication and Authorization

- Most protected routes expect `Authorization: Bearer <token>`.
- JWT middleware is provided by:
  - `middleware/auth.js` (`authenticateJWT`, role guards)
  - `middleware/jwtAuth.js` (legacy/simple JWT guard)
- Role-based authorization is enforced for user types such as:
  - `candidate`
  - `hr`
  - `hrManager`
- Refresh token flow is cookie-based in auth routes.

## Data Models

Current Sequelize model files include:

- `applicant`
- `candidate`
- `hiringTest`
- `hr`
- `hrManager`
- `interview`
- `invalidToken`
- `job`
- `organization`
- `passkey`
- `passkeyChallenge`
- `subscriptionHistory`
- `verificationCode`
- `webAuthnSession`

## Deployment Notes

- `vercel.json` rewrites all incoming paths to `/api`.
- Cookies are configured with production-safe flags when `NODE_ENV=production`.
- Database SSL mode is enabled in production in `config/database.js`.

## Troubleshooting

- **App boots but DB errors occur:** verify `DATABASE_URL` and PostgreSQL connectivity.
- **401/invalid token:** verify `JWT_SECRET` consistency and `Authorization` header format.
- **OAuth callback issues:** verify provider client IDs/secrets and callback URLs.
- **Email not sending:** verify SMTP credentials (`EMAIL_USER`, `EMAIL_PASSWORD`).
- **Payment webhook failures:** verify `RAZORPAY_WEBHOOK_SECRET` and raw payload/signature handling.
- **AI routes failing:** verify `GEMINI_API_KEY` availability.

## Current Validation Status

- Repository has no configured automated tests/lint pipeline in `package.json`.
- `npm test` currently fails intentionally with: `Error: no test specified`.

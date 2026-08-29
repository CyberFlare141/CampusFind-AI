# CampusFind AI — Frontend

A React (Vite) frontend for the existing CampusFind AI ASP.NET Core backend.
This project is **frontend-only** — no backend files were modified.

## Stack

- React 18 + Vite 5
- React Router 6 (client-side routing, protected/role-gated routes)
- Plain CSS (design tokens in `src/styles/global.css`) — no UI framework, no
  unnecessary dependencies
- `fetch`-based API client with JWT auth (`src/api/client.js`)

## Prerequisites

- Node.js 18+ and npm
- The CampusFind AI backend running locally (see `backend/README` / the
  `.NET` project) — by default at `http://localhost:5001`

## Setup

```bash
cd frontend
npm install
```

Configure the API URL if needed. `.env` already points at the backend's
`http` profile:

```
VITE_API_BASE_URL=http://localhost:5001/api
```

If you run the backend on its `https` profile instead (`https://localhost:7001`),
update `VITE_API_BASE_URL` accordingly — you may need to accept the local dev
HTTPS certificate in your browser first.

**Important:** the backend's CORS policy (`backend/Extensions/ServiceExtensions.cs`)
only allows requests from `http://localhost:5173`. The dev server is pinned to
that port in `vite.config.js`, so just run `npm run dev` as-is — don't change
the port unless you also update the backend's CORS policy.

## Run

1. Start the backend first (from the `backend` folder):
   ```bash
   dotnet run
   ```
   It should be listening on `http://localhost:5001` (Swagger UI at
   `http://localhost:5001/swagger` in Development).

2. In a separate terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173`.

3. Register a new account (registers as a `Student` by default — see
   "Known limitations" below for Security Office accounts).

## Build for production

```bash
npm run build
```

Output goes to `frontend/dist/`. Preview it locally with `npm run preview`.

## Project structure

```
src/
  api/            fetch wrapper + one file per backend controller
  context/        AuthContext (session state, localStorage persistence)
  components/     Layout/Navbar, route guards, shared UI primitives
  pages/
    LoginPage, RegisterPage, DashboardPage, NotFoundPage
    LostItems/    list, create form, detail
    FoundItems/   list, create form, detail (+ claim filing)
    Claims/       "My Claims" page
    Security/     overview, claims review, suggested matches, login history
  styles/         global.css design system
```

## How authentication works

- On login/register, the backend returns `{ token, expiresAt, user }`
  (`AuthResponseDto`). The frontend stores the JWT, its expiry, and the user
  object in `localStorage` (`src/api/client.js`), so a page refresh keeps you
  signed in.
- Every authenticated request attaches `Authorization: Bearer <token>`.
- A 401 response from any endpoint clears the cached session and the app
  treats the user as signed out.
- Role (`Student` / `SecurityOfficer` / `Administrator`) comes directly from
  `user.role` in the auth response — the JWT itself is never decoded
  client-side, since the backend already gives us the role.

## Known limitations (backend gaps, not modified per your instructions)

- **No Category/Location lookup endpoint.** `CreateLostItemDto` and
  `CreateFoundItemDto` accept optional `categoryId`/`locationId`, but there is
  no controller exposing a list of valid categories or campus
  locations/buildings, and `DbInitializer.cs` seeds none. The "Report Lost/Found
  Item" forms intentionally omit these fields rather than inventing an
  endpoint or hardcoding GUIDs. If you add a `CategoriesController` /
  `LocationsController` later, wire them into `LostItemFormPage.jsx` and
  `FoundItemFormPage.jsx`.
- **No way to become a Security Officer via the API.** `UserService.RegisterAsync`
  always assigns the `Student` role. To test the Security Office pages, you'll
  need to promote a user to `SecurityOfficer` or `Administrator` directly in
  the database (or add seed/admin tooling on the backend) — this is backend
  work, so it wasn't done here.
- **`FoundItemDto` has no `status` field** (unlike `LostItemDto`), so found
  item cards/detail pages don't show a status badge — there's nothing to show.
- Image upload isn't wired up: `LostItem`/`FoundItem` models have an `Images`
  navigation property, but no controller action accepts image uploads, so
  there's no endpoint for the frontend to call.

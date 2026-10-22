# ProxiSpeak — Frontend

The frontend prototype for **ProxiSpeak**, a shared virtual office for teams. It includes a welcoming sign-in experience and a flow for creating or joining an office.

> **Prototype status:** This project is frontend-only. Sign-in and account creation are not connected to a backend. Rooms and the visitor's session are demo data stored in the browser; room codes are not shared between devices.

## What's included

- An animated office-door sign-in experience with email and password form validation.
- A guest flow for choosing a display name and creating or joining an office.
- A sample office that can be joined in a fresh browser.
- Browser-local demo storage, with an in-memory fallback if browser storage is unavailable.
- Responsive layouts, accessible form feedback, keyboard navigation, and reduced-motion support.

## Run locally

Use a recent Node.js release with npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The development command attempts to download the optional rooms-screen photo into `public/studio.png`. If that download is unavailable, the app still runs with a plain green background; the image can also be added manually at that path.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check the project and create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run fetch-photo` | Attempt to download the optional rooms-screen photo. |

## App routes

| Route | Purpose |
| --- | --- |
| `/` | Sign-in prototype and guest entry point. |
| `/rooms` | Create an office or join one with a code. |
| `/office` | Placeholder destination after entering an office. |

## Backend integration notes

Authentication is currently a UI-only stub: valid-looking email and password values produce an explanatory message and do not make a network request.

The office flow uses demo service functions in `src/services/demoRooms.ts` and `src/services/demoSession.ts`. They are intended to be replaced or connected to backend APIs while keeping the screens consistent:

- `createRoom({ displayName, roomName? })` creates a demo room and returns a `DemoRoom`.
- `findRoom(code)` looks up a room by its code.
- `DemoRoom` contains `code`, `name`, `hostName`, and `createdAt`.
- Room codes are six uppercase letters or numbers in canonical form, displayed with a hyphen after the third character.
- Display names are trimmed and limited to 32 characters; room names are trimmed and limited to 48 characters.
- The selected display name and room code are kept in the current tab's session storage. Created rooms are kept in this browser's local storage.

These client-side behaviors are for the prototype only. A backend should own authentication, room persistence, and cross-device room lookup.

## Tech stack

- React 18
- TypeScript
- Vite
- React Router

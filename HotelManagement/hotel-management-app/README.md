# Heritage Hotel frontend

React frontend for hotel guests and staff. The app is ready to run independently with its browser-based mock API while the backend is being developed.

## Run locally

From this directory:

```bash
npm install
npm start
```

The mock API seeds demo rooms, reservations, users, and activity data into browser `localStorage`. Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@heritage.test` | `admin123` |
| Front Desk | `frontdesk@heritage.test` | `frontdesk123` |
| Staff | `staff@heritage.test` | `staff12345` |
| Guest | `maria@example.com` | `guest12345` |

To reset demo data, clear this site's local storage in the browser.

## Validate

```bash
npm test -- --watchAll=false
npm run build
```

## Backend handoff

The frontend calls one API adapter, `src/services/api.js`. Mock mode is enabled by default and is suitable for UI development and demos. To connect a backend, create `.env.local` in this directory:

```dotenv
REACT_APP_USE_MOCK=false
REACT_APP_API_URL=http://localhost:8000/api
```

Restart the development server after changing environment variables. The `realApi` adapter in `src/services/realApi.js` is the endpoint contract the backend should implement. Requests and responses use JSON. Failed responses should use a non-2xx status and `{ "error": "Human-readable message" }`; paginated lists should return `{ "items": [], "total": 0 }`. Dates use `YYYY-MM-DD`; timestamps use ISO 8601.

### Endpoints used by the frontend

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Sign in; return account fields and `token` |
| POST | `/auth/register` | Guest registration |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Apply reset code and password |
| POST | `/auth/change-password` | Change signed-in user's password |
| PATCH | `/users/me` | Update signed-in user's profile |
| GET | `/users` | Paginated staff/user list |
| POST | `/users` | Create Front Desk or Staff account |
| POST | `/users/:id/deactivate` | Deactivate account with reason |
| POST | `/users/:id/reactivate` | Reactivate account |
| GET | `/rooms` | Paginated, filterable room list |
| GET | `/rooms/floors` | List room floors |
| GET | `/rooms/:number/availability` | Check room availability for dates/occupancy |
| POST | `/rooms` | Add a room |
| PATCH | `/rooms/:number` | Update room details/status |
| DELETE | `/rooms/:number` | Delete a room |
| POST | `/rooms/:number/maintenance` | Set/clear maintenance with optional note |
| POST | `/rooms/:number/clean` | Mark a room clean |
| GET | `/reservations` | Paginated, filterable reservation list |
| POST | `/reservations` | Create a reservation |
| POST | `/reservations/:id/cancel` | Cancel a reservation |
| POST | `/reservations/:id/check-in` | Check in |
| POST | `/reservations/:id/check-out` | Check out |
| POST | `/reservations/:id/archive` | Archive a completed/cancelled reservation |
| POST | `/reservations/:id/restore` | Restore an archived reservation |
| GET | `/dashboard` | Front desk summary metrics |
| GET | `/arrivals` | Paginated arrival list |
| GET | `/departures` | Paginated departure list |
| GET | `/guests` | Paginated guest list |
| GET | `/guests/history` | Paginated guest stay history; accepts `email` |
| GET | `/reports` | Summary and daily/by-room-type report for date range |
| GET | `/events` | Paginated, searchable, filterable activity log |

Authenticated requests send `Authorization: Bearer <token>`. Enforce authentication, role permissions, input validation, and reservation/room business rules on the server; frontend role checks are only for navigation and user experience.

`src/services/mockApi.js` is a frontend-only stand-in, not a security boundary or production data store. Keep its returned shapes aligned with the real API so the same screens work in both modes.

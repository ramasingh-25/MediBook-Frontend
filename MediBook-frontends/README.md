# MediBook Frontend

React frontend for the MediBook Appointment Service API.

## Tech Stack
- React 18 + React Router v6
- Axios for API calls
- date-fns for date formatting
- react-hot-toast for notifications
- lucide-react for icons

## Getting Started

### Prerequisites
- Node.js 16+
- MediBook backend running (default: http://localhost:5000)

### Install & Run

```bash
npm install
npm start
```

App runs at http://localhost:3000

### Configure API URL

Edit `.env` to point to your backend:

```
REACT_APP_API_URL=http://localhost:5000
```

### Build for Production

```bash
npm run build
```

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — stats, upcoming appointments, quick actions |
| `/appointments` | All appointments with search and status filters |
| `/appointments/book` | Book a new appointment |
| `/appointments/:id` | View appointment details, cancel, complete |
| `/appointments/:id/reschedule` | Reschedule an appointment |
| `/provider-schedule` | Search provider schedule by ID and/or date |

## Demo IDs

The app uses `patient-001` and `provider-001` as demo defaults.
You can change these in the relevant page files or via the form inputs.

## API Endpoints Used

All endpoints from `/api/v1/appointments`:

- `POST /` — Book appointment
- `GET /:id` — Get by ID
- `GET /patient/:id` — Get by patient
- `GET /patient/:id/upcoming` — Upcoming by patient
- `GET /provider/:id` — Get by provider
- `GET /provider/:id/date/:date` — Get by provider + date
- `PUT /:id/cancel` — Cancel
- `PUT /:id/reschedule` — Reschedule
- `PUT /:id/complete` — Complete
- `PUT /:id/status` — Update status
- `GET /provider/:id/count` — Count by provider

## Authentication

Set your JWT token in localStorage:

```js
localStorage.setItem('medibook_token', 'your-jwt-token-here');
```

The Axios interceptor will attach it as `Authorization: Bearer <token>`.

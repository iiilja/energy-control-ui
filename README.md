# Energy Control UI

React + TypeScript frontend for the Energy Control API.

## Features

- **Authentication** — login with Basic Auth
- **Thermia heat pump** — real-time monitoring, operation mode, heating/tap water/cooling/internal heater controls, heat curve editor
- **Nordpool prices** — view electricity prices and hourly averages
- **Heating schedule** — configure setpoint schedules based on Nordpool prices
- **Sungrow inverter** — status and power limit control

## Technology Stack

- React 19, TypeScript
- Vite 7
- Axios
- Recharts

## Development

### Prerequisites

- Node.js 18+
- Energy Control API running (locally or on a remote host)

### Install

```bash
npm install
```

### Run

```bash
npm run dev              # proxies /api to http://localhost:8080
npm run dev:bananapi     # proxies /api to banana pi local url
```

The application is available at `http://localhost:3000`.

The `dev:bananapi` mode is useful for testing UI changes locally against the deployed API.
To use a different host, edit `.env.bananapi` (not committed — create it locally):

```
API_HOST=http://<your-host>:8080
```

### Build

```bash
npm run build
```

## Deployment

GitHub Actions builds and pushes the Docker image to `ghcr.io/iiilja/energy-control-ui:latest` on every push to `main`.

The image uses Nginx to serve the static files and proxy `/api` requests to the API host at `172.17.0.1:8080` (Docker bridge).

To run on a server:

```bash
docker run -d \
  --name energy-control-ui \
  -e API_HOST=172.17.0.1:8080 \
  -p 3000:80 \
  --restart unless-stopped \
  ghcr.io/iiilja/energy-control-ui:latest
```

To deploy an update:

```bash
docker pull ghcr.io/iiilja/energy-control-ui:latest
docker restart energy-control-ui
```

## Project Structure

```
src/
├── components/
│   ├── Login.tsx              # Login form
│   ├── Layout.tsx             # Main layout with navigation
│   ├── ModbusApiLive.tsx      # Thermia heat pump monitoring and control
│   ├── NordpoolPrices.tsx     # Electricity price charts
│   ├── HeatingSchedule.tsx    # Setpoint schedule editor
│   └── SungrowInverter.tsx    # Sungrow inverter status and control
├── context/
│   └── AuthContext.tsx        # Authentication state
├── services/
│   └── api.ts                 # Axios clients and all API endpoint definitions
├── App.tsx
└── main.tsx
```

## Default Credentials

Configured in the backend:
- Username: `admin`
- Password: `admin`
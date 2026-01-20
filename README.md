# Energy Control UI

React + TypeScript frontend for the Energy Control API.

## Features

- **Authentication**: Login with username/password using Basic Auth
- **Modbus API Live**: Real-time monitoring and control of Thermia heat pump
- **Nordpool Prices**: View and manage electricity prices (Coming soon)
- **Heating Schedule**: Configure heating setpoint schedules (Coming soon)

## Prerequisites

- Node.js 18+ and npm
- Energy Control API running on http://localhost:8080

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Build

```bash
npm run build
```

## Technology Stack

- React 18
- TypeScript
- Vite
- Axios
- React Context API for state management

## Project Structure

```
src/
├── components/          # React components
│   ├── Login.tsx       # Login form
│   ├── Layout.tsx      # Main layout with tabs
│   └── ModbusApiLive.tsx  # Heat pump monitoring
├── context/            # React contexts
│   └── AuthContext.tsx # Authentication state
├── services/           # API services
│   └── api.ts         # API client and endpoints
├── App.tsx            # Main app component
└── main.tsx           # Entry point
```

## API Proxy Configuration

The development server proxies `/api` requests to `http://localhost:8080`. This is configured in `vite.config.js`.

## Default Credentials

Default credentials are configured in the backend:
- Username: `admin`
- Password: `admin`

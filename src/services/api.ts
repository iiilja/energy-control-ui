import axios, { AxiosResponse } from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

const modbusApi = axios.create({
  baseURL: '/api/v1/thermia',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth header to all requests
const authInterceptor = (config: any) => {
  const auth = localStorage.getItem('auth');
  if (auth) {
    config.headers.Authorization = auth;
  }
  return config;
};

api.interceptors.request.use(authInterceptor);
modbusApi.interceptors.request.use(authInterceptor);

// Handle 401 errors
const errorInterceptor = (error: any) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('auth');
    window.location.href = '/';
  }
  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, errorInterceptor);
modbusApi.interceptors.response.use((response) => response, errorInterceptor);

export interface HeatPumpData {
  status: {
    connected: boolean;
    lastUpdate: number;
    operationMode: number;
    operationModeText: string;
    alarmActive: boolean;
    compressorRunning: boolean;
    currentDemand: number;
    currentDemandText: string;
  };
  temperatures: {
    outdoor: number;
    systemSupplyLine: number;
    systemSupplySetpoint: number;
    systemSupplyIn: number;
    systemSupplyOut: number;
    brineIn: number;
    brineOut: number;
    tapWaterTop: number;
    tapWaterLower: number;
  };
  compressor: {
    rpm: number;
    speed: number;
    hours: number;
  };
  heating: {
    setpoint: number;
    hours: number;
    externalHeaterHours: number;
  };
  heatCurve: {
    outdoorTemp: number[];
    supplyTemp: number[];
  };
  // pump: {
  //   autoMode: boolean;
  //   currentState: boolean;
  //   onDuration: number;
  //   offDuration: number;
  //   remainingMinutes?: number;
  // };
}

export interface RebootStats {
  totalReboots: number;
  watchdogReboots: number;
  panicReboots: number;
  normalReboots: number;
  lastResetReason: string;
  uptimeSeconds: number;
}

export interface SetpointScheduleItem {
  priceTimestamp: string;
  price: number;
  setpoint: number;
  nordpoolPriceId: number;
}

export const authAPI = {
  login: (username: string, password: string) => {
    const token = btoa(`${username}:${password}`);
    return api.get('/v1/auth/test', {
      headers: { Authorization: `Basic ${token}` },
    });
  },
};

export const heatPumpAPI = {
  fetchData: (): Promise<AxiosResponse<HeatPumpData>> => modbusApi.get('/data'),
  fetchRebootStats: (): Promise<AxiosResponse<RebootStats>> => modbusApi.get('/reboot-stats'),
  setMode: (mode: number) => modbusApi.post('/mode', { mode }),
  setSetpoint: (temperature: number) => modbusApi.post('/setpoint', { temperature }),
  updateHeatCurve: (points: number[]) => modbusApi.post('/heatcurve', { points }),
  setPump: (config: any) => modbusApi.post('/hwc-pump', config),
  resetRebootStats: () => modbusApi.post('/reboot-stats'),
};

export const nordpoolAPI = {
  fetchPrices: () => api.post('/v1/nordpool/fetch'),
};

export const heatingAPI = {
  getSchedule: (date: string): Promise<AxiosResponse<SetpointScheduleItem[]>> =>
    api.get('/v1/heating/setpoint/schedule', { params: { date } }),
  saveSchedule: (schedules: { nordpoolPriceId: number; setpoint: number }[]) =>
    api.post('/v1/heating/setpoint/schedule', schedules),
  applyTemplate: (date: string) =>
    api.post('/v1/heating/setpoint/schedule/apply-template', null, { params: { date } }),
};

export interface SungrowStatus {
  running: boolean;
  powerLimitEnabled: boolean;
  powerLimitPercent: number;
  powerLimitKw: number;
  activePowerW: number;
  dailyEnergyKwh: number;
  totalEnergyKwh: number;
}

export const sungrowAPI = {
  getStatus: (): Promise<AxiosResponse<SungrowStatus>> => api.get('/sungrow/status'),
  setPowerLimit: (limit: { kw?: number; percent?: number }) => api.post('/sungrow/power-limit', limit),
  enablePowerLimit: () => api.post('/sungrow/power-limit/enable'),
  disablePowerLimit: () => api.post('/sungrow/power-limit/disable'),
  start: () => api.post('/sungrow/start'),
  stop: () => api.post('/sungrow/stop'),
};

export default api;

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

/** The reason given by the API (ProblemDetail `detail`), or the generic axios message. */
export const apiErrorMessage = (err: any): string =>
  err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Unknown error';

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
  internalHeater: {
    step: number;
  };
  enables: {
    heating: boolean;
    tapWater: boolean;
    cooling: boolean;
    hotGasPump: boolean;
    antiLegionella: boolean;
    internalHeater: boolean;
  };
}

export interface SetpointScheduleItem {
  timestamp: string;
  price: number;
  setpoint: number;
  nordpoolPriceId: number;
}

export const authAPI = {
  login: (username: string, password: string) => {
    const token = btoa(`${username}:${password}`);
    return api.get('/auth/test', {
      headers: { Authorization: `Basic ${token}` },
    });
  },
};

export const heatPumpAPI = {
  fetchData: (): Promise<AxiosResponse<HeatPumpData>> => modbusApi.get('/data'),
  setMode: (mode: number) => modbusApi.post('/mode', { mode }),
  /** A manual change: kept for heating.setpoint.manual_override.hours, then the schedule takes over. */
  setSetpoint: (temperature: number) => modbusApi.post('/setpoint', { temperature }),
  updateHeatCurve: (points: number[]) => modbusApi.post('/heat-curve', { points }),
  enableHeating: () => modbusApi.post('/heating/enable'),
  disableHeating: () => modbusApi.post('/heating/disable'),
  enableTapWater: () => modbusApi.post('/tap-water/enable'),
  disableTapWater: () => modbusApi.post('/tap-water/disable'),
  enableCooling: () => modbusApi.post('/cooling/enable'),
  disableCooling: () => modbusApi.post('/cooling/disable'),
  enableInternalHeater: () => modbusApi.post('/internal-heater/enable'),
  disableInternalHeater: () => modbusApi.post('/internal-heater/disable'),
};

export interface NordpoolPriceEntry {
  timestamp: string;
  price: number;
}

export interface CurrentNordpoolPrice {
  timestamp: string;
  price: number;
  hourlyAvgPrice: number | null;
}

export const nordpoolAPI = {
  fetchPrices: () => api.post('/nordpool/fetch'),
  getPrices: (date?: string): Promise<AxiosResponse<NordpoolPriceEntry[]>> =>
    api.get('/nordpool/prices', { params: date ? { date } : {} }),
  getHourlyAveragePrices: (date?: string): Promise<AxiosResponse<NordpoolPriceEntry[]>> =>
    api.get('/nordpool/prices/hourly-average', { params: date ? { date } : {} }),
  getCurrentPrice: (): Promise<AxiosResponse<CurrentNordpoolPrice>> =>
    api.get('/nordpool/current-price'),
};

export interface WeeklyScheduleEntry {
  id: number;
  dayOfWeek: number;
  startTime: string;
  setpoint: number;
}

export const heatingAPI = {
  getSchedule: (date: string): Promise<AxiosResponse<SetpointScheduleItem[]>> =>
    api.get('/heating/setpoint/schedule', { params: { date } }),
  saveSchedule: (schedules: { nordpoolPriceId: number; setpoint: number }[]) =>
    api.post('/heating/setpoint/schedule', schedules),
  getWeeklySchedule: (): Promise<AxiosResponse<WeeklyScheduleEntry[]>> =>
    api.get('/heating/setpoint/weekly-schedule'),
  saveWeeklySchedule: (entries: { dayOfWeek: number; startTime: string; setpoint: number }[]) =>
    api.put('/heating/setpoint/weekly-schedule', entries),
  getPricePlan: (date: string): Promise<AxiosResponse<PricePlan>> =>
    api.get('/heating/price-plan', { params: { date } }),
};

export interface ConfigEntry {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string | null;
}

export const configAPI = {
  getAll: (): Promise<AxiosResponse<ConfigEntry[]>> => api.get('/config'),
  /** Admin only. 400 with the reason in `detail` if the value is invalid. */
  update: (key: string, value: string): Promise<AxiosResponse<ConfigEntry>> =>
    api.put(`/config/${encodeURIComponent(key)}`, { value }),
};

export type PriceSlotKind = 'NORMAL' | 'PEAK' | 'COMPENSATION';

export interface PricePlanSlot {
  /** Slot start, ISO date-time with offset (Tallinn time) */
  timestamp: string;
  /** EUR/MWh */
  price: number;
  kind: PriceSlotKind;
  /** Weekly template */
  templateSetpoint: number;
  /** Template shifted for the slot's kind: what the optimisation aims for */
  optimizedSetpoint: number;
  /** What the control loop will use (stored slot override, otherwise template) */
  scheduledSetpoint: number;
  source: 'TEMPLATE' | 'PRICE' | 'MANUAL';
}

export interface PricePlan {
  date: string;
  enabled: boolean;
  /** False if a setting is invalid: the optimisation is then off and the defaults are shown */
  settingsValid: boolean;
  /** All 15-minute prices of the day known; only then median, threshold and peaks are set */
  complete: boolean;
  median: number | null;
  threshold: number | null;
  peakThreshold: number;
  lower: number;
  raise: number;
  compensationMinutes: number;
  slots: PricePlanSlot[];
}

export interface ManualOverride {
  setpoint: number;
  /** HEAT_PUMP = changed on the heat pump itself, API = set from here */
  source: 'HEAT_PUMP' | 'API';
  startedAt: string;
  validUntil: string;
}

export const overrideAPI = {
  /** The manual setpoint override in effect, or null when the schedule is in control (204). */
  get: (): Promise<ManualOverride | null> =>
    api.get('/heating/setpoint/override').then((r) => (r.status === 204 || !r.data ? null : r.data)),
  cancel: () => api.delete('/heating/setpoint/override'),
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

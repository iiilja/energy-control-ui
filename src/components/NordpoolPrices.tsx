import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';
import { nordpoolAPI, NordpoolPriceEntry } from '../services/api';
import './ModbusApiLive.css';

const TALLINN_TZ = 'Europe/Tallinn';

const todayTallinn = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: TALLINN_TZ });

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TALLINN_TZ,
    hour12: false,
  });

const currentQuarterLabel = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: TALLINN_TZ, hour12: false,
  }).formatToParts(new Date());
  const h = parts.find(p => p.type === 'hour')!.value;
  const m = parseInt(parts.find(p => p.type === 'minute')!.value);
  return `${h}:${String(Math.floor(m / 15) * 15).padStart(2, '0')}`;
};

const shiftDate = (dateStr: string, days: number) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const NordpoolPrices = () => {
  const [prices, setPrices] = useState<NordpoolPriceEntry[]>([]);
  const [hourlyPrices, setHourlyPrices] = useState<NordpoolPriceEntry[]>([]);
  const [date, setDate] = useState(todayTallinn());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchStatus, setFetchStatus] = useState('');

  const triggerFetch = async () => {
    setFetchStatus('Fetching...');
    try {
      const res = await nordpoolAPI.fetchPrices();
      setFetchStatus(`Fetched ${res.data.pricesStored} entries`);
      load(date);
    } catch (err: any) {
      const msg = err.response?.status === 403 ? 'Admin role required' : err.message;
      setFetchStatus(`Error: ${msg}`);
    }
  };

  const load = async (d: string) => {
    setLoading(true);
    setError('');
    try {
      const [pricesRes, hourlyRes] = await Promise.all([
        nordpoolAPI.getPrices(d),
        nordpoolAPI.getHourlyAveragePrices(d),
      ]);
      setPrices(pricesRes.data);
      setHourlyPrices(hourlyRes.data);
    } catch (err: any) {
      setError(`Failed to load prices: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(date); }, [date]);

  const hourlyMap = new Map(hourlyPrices.map(p => [formatTime(p.timestamp), Number(p.price)]));

  const chartData = prices.map(p => {
    const time = formatTime(p.timestamp);
    const hourKey = time.substring(0, 3) + '00';
    return { time, price: Number(p.price), avgPrice: hourlyMap.get(hourKey) };
  });

  const priceValues = chartData.map(d => d.price);
  const min = priceValues.length ? Math.min(...priceValues) : 0;
  const max = priceValues.length ? Math.max(...priceValues) : 0;
  const avg = priceValues.length
    ? priceValues.reduce((a, b) => a + b, 0) / priceValues.length
    : 0;
  const range = max - min;

  const barColor = (price: number) => {
    if (range === 0) return '#1976d2';
    const ratio = (price - min) / range;
    if (ratio < 0.33) return '#4caf50';
    if (ratio < 0.66) return '#ff9800';
    return '#f44336';
  };

  const isToday = date === todayTallinn();
  const nowLabel = currentQuarterLabel();
  const currentBar = isToday ? chartData.find(d => d.time === nowLabel) : undefined;
  const currentHourKey = nowLabel.substring(0, 3) + '00';
  const currentHourAvg = isToday ? hourlyMap.get(currentHourKey) : undefined;

  return (
    <div className="modbus-container">
      <h1>⚡ Nordpool Prices (EE)</h1>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setDate(shiftDate(date, -1))}>◀</button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ fontSize: '16px', padding: '6px', borderRadius: '4px', border: '2px solid #e0e0e0' }}
          />
          <button onClick={() => setDate(shiftDate(date, 1))}>▶</button>
          <button onClick={() => setDate(todayTallinn())}>Today</button>
          <button onClick={triggerFetch}>Fetch</button>
          {fetchStatus && <span style={{ fontSize: '13px', color: '#555' }}>{fetchStatus}</span>}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {currentBar && (
        <div className="card">
          <h2>Current Price</h2>
          <div className="label">Now ({nowLabel})</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: barColor(currentBar.price) }}>
            {currentBar.price.toFixed(2)} EUR/MWh
          </div>
          <div className="label">{(currentBar.price / 1000).toFixed(4)} EUR/kWh</div>
          {currentHourAvg !== undefined && (
            <>
              <div style={{ marginTop: '12px', borderTop: '1px solid #e0e0e0', paddingTop: '12px' }}>
                <div className="label">Hour average ({currentHourKey})</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: barColor(currentHourAvg) }}>
                  {currentHourAvg.toFixed(2)} EUR/MWh
                </div>
                <div className="label">{(currentHourAvg / 1000).toFixed(4)} EUR/kWh</div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h2>Hourly Prices</h2>
        {loading ? (
          <div>Loading...</div>
        ) : chartData.length === 0 ? (
          <div style={{ color: '#666' }}>No price data available for this date.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  interval={1}
                />
                <YAxis unit=" €" tick={{ fontSize: 11 }} width={65} />
                <Tooltip formatter={(val: number, name: string) => [
                  `${val.toFixed(2)} EUR/MWh`,
                  name === 'price' ? 'Price' : 'Hour avg',
                ]} />
                <ReferenceLine
                  y={17}
                  stroke="#9c27b0"
                  strokeDasharray="5 3"
                  label={{ value: 'Profit threshold', position: 'insideTopRight', fontSize: 11, fill: '#9c27b0' }}
                />
                <ReferenceLine
                  y={avg}
                  stroke="#1976d2"
                  strokeDasharray="5 3"
                  label={{ value: `Avg ${avg.toFixed(1)}`, position: 'insideBottomRight', fontSize: 11, fill: '#1976d2' }}
                />
                {currentBar && (
                  <ReferenceLine
                    x={currentBar.time}
                    stroke="#333"
                    strokeDasharray="4 4"
                    label={{ value: 'Now', position: 'top', fontSize: 11 }}
                  />
                )}
                <Bar dataKey="price" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={barColor(chartData[i].price)} />
                  ))}
                </Bar>
                <Line
                  dataKey="avgPrice"
                  type="stepAfter"
                  stroke="#333"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="6 3"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', display: 'flex', gap: '16px' }}>
              <span>Min: <b>{min.toFixed(2)}</b></span>
              <span>Max: <b>{max.toFixed(2)}</b></span>
              <span>Avg: <b>{avg.toFixed(2)}</b></span>
              <span style={{ color: '#bbb' }}>EUR/MWh</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NordpoolPrices;

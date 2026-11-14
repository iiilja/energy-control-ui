import { useEffect, useState } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { apiErrorMessage, heatingAPI, PricePlan as Plan, PriceSlotKind } from '../services/api';
import './ModbusApiLive.css';

const TALLINN_TZ = 'Europe/Tallinn';

const KIND_COLORS: Record<PriceSlotKind, string> = {
  PEAK: '#e53935',          // cut: setpoint lowered
  COMPENSATION: '#43a047',  // setpoint raised to make up for the peak
  NORMAL: '#b0bec5',        // template
};

const KIND_LABELS: Record<PriceSlotKind, string> = {
  PEAK: 'Peak (setpoint lowered)',
  COMPENSATION: 'Compensation (setpoint raised)',
  NORMAL: 'Normal',
};

const todayTallinn = () => new Date().toLocaleDateString('sv-SE', { timeZone: TALLINN_TZ });

const shiftDate = (dateStr: string, days: number) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TALLINN_TZ, hour12: false });

const currentQuarterLabel = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: TALLINN_TZ, hour12: false,
  }).formatToParts(new Date());
  const h = parts.find(p => p.type === 'hour')!.value;
  const m = parseInt(parts.find(p => p.type === 'minute')!.value);
  return `${h}:${String(Math.floor(m / 15) * 15).padStart(2, '0')}`;
};

/** "17:00–17:45, 20:15–20:30" for the slots of one kind (end = start of the last slot + 15 min). */
const ranges = (times: string[], kinds: PriceSlotKind[], kind: PriceSlotKind) => {
  const out: string[] = [];
  let start: number | null = null;
  for (let i = 0; i <= kinds.length; i++) {
    const inKind = i < kinds.length && kinds[i] === kind;
    if (inKind && start === null) start = i;
    if (!inKind && start !== null) {
      out.push(`${times[start]}–${addQuarter(times[i - 1])}`);
      start = null;
    }
  }
  return out;
};

const addQuarter = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + 15) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const PricePlan = () => {
  const [date, setDate] = useState(todayTallinn());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    heatingAPI.getPricePlan(date)
      .then(res => { if (!cancelled) setPlan(res.data); })
      .catch(err => { if (!cancelled) { setPlan(null); setError(`Failed to load price plan: ${apiErrorMessage(err)}`); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const slots = plan?.slots ?? [];
  // Optimisation on: show what is really scheduled. Off: preview of what it would do.
  const planLabel = plan?.enabled ? 'Scheduled' : 'Optimized (preview)';
  const data = slots.map(s => ({
    time: formatTime(s.timestamp),
    price: Number(s.price),
    kind: s.kind,
    template: Number(s.templateSetpoint),
    plan: Number(plan?.enabled ? s.scheduledSetpoint : s.optimizedSetpoint),
    manual: s.source === 'MANUAL',
  }));
  const times = data.map(d => d.time);
  const kinds = data.map(d => d.kind);
  const peaks = ranges(times, kinds, 'PEAK');
  const compensation = ranges(times, kinds, 'COMPENSATION');

  const isToday = date === todayTallinn();
  const now = isToday ? currentQuarterLabel() : undefined;
  const nowInData = now && times.includes(now) ? now : undefined;

  const setpoints = data.flatMap(d => [d.template, d.plan]);
  const yMin = setpoints.length ? Math.floor(Math.min(...setpoints) - 0.5) : 15;
  const yMax = setpoints.length ? Math.ceil(Math.max(...setpoints) + 0.5) : 25;

  return (
    <div className="modbus-container">
      <h1>📉 Price Plan</h1>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setDate(shiftDate(date, -1))}>◀</button>
          <input
            type="date"
            value={date}
            onChange={e => { if (e.target.value) setDate(e.target.value); }}
            style={{ fontSize: '16px', padding: '6px', borderRadius: '4px', border: '2px solid #e0e0e0' }}
          />
          <button onClick={() => setDate(shiftDate(date, 1))}>▶</button>
          <button onClick={() => setDate(todayTallinn())}>Today</button>
          <button onClick={() => setDate(shiftDate(todayTallinn(), 1))}>Tomorrow</button>
        </div>
        {plan && (
          <div style={{ marginTop: '12px', fontSize: '14px', lineHeight: 1.7 }}>
            <span className={`status ${plan.enabled ? 'on' : 'off'}`}>
              Optimisation {plan.enabled ? 'ON' : 'OFF'}
            </span>{' '}
            {plan.median != null && plan.threshold != null && (
              <>
                Median <b>{Number(plan.median).toFixed(2)}</b> · peak from <b>{Number(plan.threshold).toFixed(2)}</b> EUR/MWh
                {' '}(median + {Number(plan.peakThreshold)})
              </>
            )}
            <br />
            <small>
              Peaks: −{Number(plan.lower).toFixed(1)} °C · compensation: +{Number(plan.raise).toFixed(1)} °C
              for {plan.compensationMinutes} min before or after a peak (the cheaper side)
            </small>
            {!plan.settingsValid && (
              <div style={{ color: '#c62828', fontSize: '13px' }}>
                A <code>heating.price_optimization.*</code> setting is invalid, so the optimisation is off and the
                defaults are shown. The API log names the value.
              </div>
            )}
            {plan.settingsValid && !plan.enabled && (
              <div style={{ color: '#888', fontSize: '13px' }}>
                The optimisation is off, so the setpoint chart shows what it would do.
                It is switched on with <code>heating.price_optimization.enabled = true</code>.
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="card">Loading...</div>
      ) : plan && slots.length === 0 ? (
        <div className="card" style={{ color: '#666' }}>No prices for this day yet (tomorrow's usually arrive after 14:00).</div>
      ) : plan && (
        <>
          {!plan.complete && (
            <div className="card" style={{ color: '#a15c00' }}>
              Not all prices of this day are known yet, so peaks are not computed.
            </div>
          )}

          <div className="card">
            <h2>Prices</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 40 }} syncId="price-plan">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" interval={3} />
                <YAxis unit=" €" tick={{ fontSize: 11 }} width={65} />
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${Number(val).toFixed(2)} EUR/MWh`, KIND_LABELS[item.payload.kind as PriceSlotKind],
                  ]}
                />
                {plan.median != null && (
                  <ReferenceLine y={Number(plan.median)} stroke="#1565c0" strokeDasharray="5 3" ifOverflow="extendDomain"
                    label={{ value: `Median ${Number(plan.median).toFixed(1)}`, position: 'insideBottomLeft', fontSize: 11, fill: '#1565c0' }} />
                )}
                {plan.threshold != null && (
                  <ReferenceLine y={Number(plan.threshold)} stroke="#e53935" strokeDasharray="5 3" ifOverflow="extendDomain"
                    label={{ value: `Peak ${Number(plan.threshold).toFixed(1)}`, position: 'insideTopRight', fontSize: 11, fill: '#e53935' }} />
                )}
                {nowInData && (
                  <ReferenceLine x={nowInData} stroke="#333" strokeDasharray="4 4" label={{ value: 'Now', position: 'top', fontSize: 11 }} />
                )}
                <Bar dataKey="price" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {data.map((d, i) => <Cell key={i} fill={KIND_COLORS[d.kind]} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', marginTop: '4px' }}>
              {(['PEAK', 'COMPENSATION', 'NORMAL'] as PriceSlotKind[]).map(k => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 12, height: 12, background: KIND_COLORS[k], borderRadius: 2, display: 'inline-block' }} />
                  {KIND_LABELS[k]}
                </span>
              ))}
            </div>
            {plan.complete && (
              <div style={{ fontSize: '13px', color: '#555', marginTop: '10px', lineHeight: 1.6 }}>
                <div>Peaks: <b>{peaks.length ? peaks.join(', ') : 'none'}</b></div>
                <div>Compensation: <b>{compensation.length ? compensation.join(', ') : 'none'}</b></div>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Heating setpoint</h2>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 40 }} syncId="price-plan">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" interval={3} scale="band" />
                <YAxis unit=" °C" tick={{ fontSize: 11 }} width={65} domain={[yMin, yMax]} allowDecimals />
                <Tooltip formatter={(val: any, name: any) => [`${Number(val).toFixed(1)} °C`, name]} />
                <Legend verticalAlign="top" height={28} />
                {nowInData && <ReferenceLine x={nowInData} stroke="#333" strokeDasharray="4 4" />}
                <Line dataKey="template" name="Weekly template" type="stepAfter" stroke="#90a4ae"
                  strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="plan" name={planLabel} type="stepAfter" stroke="#ef6c00"
                  strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <small style={{ color: '#888' }}>
              A manual override (set here or on the heat pump) still wins over this plan while it lasts.
              {data.some(d => d.manual) && ' Some slots of this day were set by hand and are left as they are.'}
            </small>
          </div>
        </>
      )}
    </div>
  );
};

export default PricePlan;

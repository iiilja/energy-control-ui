import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { heatingAPI, WeeklyScheduleEntry } from '../services/api';
import './ModbusApiLive.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

let _nextId = -1;
const newId = () => _nextId--;

const timeToHour = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
};

const buildDayChartData = (entries: WeeklyScheduleEntry[], dow: number) => {
  const rows = entries
    .filter(e => e.dayOfWeek === dow)
    .sort((a, b) => timeToHour(a.startTime) - timeToHour(b.startTime));
  if (!rows.length) return [];
  const points = rows.map(e => ({ hour: timeToHour(e.startTime), setpoint: Number(e.setpoint) }));
  points.push({ hour: 24, setpoint: points[points.length - 1].setpoint });
  return points;
};

const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

const HeatingSchedule = () => {
  const [saved, setSaved] = useState<WeeklyScheduleEntry[]>([]);
  const [edited, setEdited] = useState<WeeklyScheduleEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await heatingAPI.getWeeklySchedule();
      setSaved(res.data);
      setEdited(res.data.map(e => ({ ...e })));
    } catch (err: any) {
      setError(`Failed to load schedule: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await heatingAPI.saveWeeklySchedule(
        edited.map(e => ({ dayOfWeek: e.dayOfWeek, startTime: e.startTime, setpoint: Number(e.setpoint) }))
      );
      await load();
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const update = (id: number, field: keyof WeeklyScheduleEntry, value: any) =>
    setEdited(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const remove = (id: number) =>
    setEdited(prev => prev.filter(e => e.id !== id));

  const add = () =>
    setEdited(prev => [...prev, { id: newId(), dayOfWeek: selectedDay, startTime: '00:00', setpoint: 21 }]);

  const isDirty = JSON.stringify(saved) !== JSON.stringify(edited);
  const chartData = buildDayChartData(edited, selectedDay);
  const dayRows = edited
    .filter(e => e.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="modbus-container">
      <h1>📅 Weekly Heating Schedule</h1>

      {error && <div className="error">{error}</div>}

      {/* Day tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {DAY_NAMES.map((name, idx) => {
          const dow = idx + 1;
          const hasChanges = JSON.stringify(
            saved.filter(e => e.dayOfWeek === dow)
          ) !== JSON.stringify(
            edited.filter(e => e.dayOfWeek === dow)
          );
          return (
            <button
              key={dow}
              onClick={() => setSelectedDay(dow)}
              style={{
                background: selectedDay === dow ? '#1976d2' : '#e0e0e0',
                color: selectedDay === dow ? 'white' : '#333',
                fontWeight: selectedDay === dow ? 'bold' : 'normal',
                outline: hasChanges ? '2px solid #ff9800' : 'none',
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="card">
        <h2>{DAY_NAMES[selectedDay - 1]} — Setpoint over the day</h2>
        {loading ? <div>Loading...</div> : chartData.length === 0 ? (
          <div style={{ color: '#888' }}>No entries for this day.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[0, 24]}
                ticks={HOUR_TICKS}
                tickFormatter={h => `${String(h).padStart(2, '0')}:00`}
                tick={{ fontSize: 11 }}
              />
              <YAxis unit="°C" domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={52} />
              <Tooltip
                formatter={(val: number) => [`${Number(val).toFixed(1)}°C`, 'Setpoint']}
                labelFormatter={(h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`}
              />
              <Area type="stepAfter" dataKey="setpoint" stroke="#1976d2" fill="#bbdefb" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Edit */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Edit — {DAY_NAMES[selectedDay - 1]}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEdited(saved.map(e => ({ ...e })))} disabled={!isDirty}>
              Reset all
            </button>
            <button
              onClick={save}
              disabled={!isDirty || saving}
              style={{ background: isDirty ? '#2e7d32' : undefined }}
            >
              {saving ? 'Saving…' : 'Save all'}
            </button>
          </div>
        </div>

        {dayRows.length === 0 && (
          <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>No entries for this day.</div>
        )}

        {dayRows.map(entry => (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="time"
              value={entry.startTime}
              onChange={e => update(entry.id, 'startTime', e.target.value)}
              style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            />
            <input
              type="number"
              step="0.5"
              min="10"
              max="30"
              value={Number(entry.setpoint)}
              onChange={e => update(entry.id, 'setpoint', parseFloat(e.target.value))}
              style={{ width: '72px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            />
            <span style={{ color: '#666', fontSize: '13px' }}>°C</span>
            <button
              onClick={() => remove(entry.id)}
              style={{ background: '#f44336', padding: '6px 10px', fontSize: '13px', margin: 0 }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={add}
          style={{ background: '#4caf50', padding: '6px 14px', fontSize: '13px', margin: 0 }}
        >
          + Add entry
        </button>
      </div>
    </div>
  );
};

export default HeatingSchedule;

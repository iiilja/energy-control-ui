import { useState, useEffect } from 'react';
import { sungrowAPI, SungrowStatus } from '../services/api';
import './ModbusApiLive.css';

const SungrowInverter = () => {
  const [status, setStatus] = useState<SungrowStatus | null>(null);
  const [error, setError] = useState('');
  const [kwInput, setKwInput] = useState('2.0');

  const fetchStatus = async () => {
    try {
      const response = await sungrowAPI.getStatus();
      setStatus(response.data);
      setError('');
    } catch (err: any) {
      setError(`Error loading inverter status: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const setPowerLimit = async () => {
    const kw = parseFloat(kwInput);
    if (isNaN(kw) || kw < 0) {
      alert('Enter a valid kW value (≥ 0)');
      return;
    }
    try {
      await sungrowAPI.setPowerLimit({ kw });
      alert(`Power limit set to ${kw} kW`);
      fetchStatus();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const enableLimit = async () => {
    try {
      await sungrowAPI.enablePowerLimit();
      fetchStatus();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const disableLimit = async () => {
    try {
      await sungrowAPI.disablePowerLimit();
      fetchStatus();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const startInverter = async () => {
    if (!confirm('Send RUN command to inverter?')) return;
    try {
      await sungrowAPI.start();
      fetchStatus();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const stopInverter = async () => {
    if (!confirm('Send STOP command to inverter?')) return;
    try {
      await sungrowAPI.stop();
      fetchStatus();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!status) {
    return <div>Loading inverter status...</div>;
  }

  const formatPower = (w: number) =>
    w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${w.toFixed(0)} W`;

  return (
    <div className="modbus-container">
      <h1>☀️ Sungrow SG15RT</h1>

      {/* Live generation */}
      <div className="card">
        <h2>Live Generation</h2>
        <div className="label">Active Power</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>{formatPower(status.activePowerW)}</div>
        <br />
        <div className="label">Today's Yield</div>
        <div><b>{status.dailyEnergyKwh.toFixed(1)} kWh</b></div>
        <br />
        <div className="label">Total Yield</div>
        <div><b>{status.totalEnergyKwh.toFixed(0)} kWh</b></div>
      </div>

      {/* Status */}
      <div className="card">
        <h2>Inverter Status</h2>
        <div className="label">Running</div>
        <span className={`status ${status.running ? 'on' : 'off'}`}>
          {status.running ? 'Running' : 'Stopped'}
        </span>
        <br /><br />
        <div className="label">Feed-in Limit</div>
        <span className={`status ${status.powerLimitEnabled ? 'on' : 'off'}`}>
          {status.powerLimitEnabled ? 'Enabled' : 'Disabled'}
        </span>
        <br /><br />
        <div className="label">Current Limit</div>
        <div><b>{status.powerLimitKw.toFixed(1)} kW</b> &nbsp;/&nbsp; <b>{status.powerLimitPercent.toFixed(1)}%</b></div>
      </div>

      {/* Power limit control */}
      <div className="card">
        <h2>Feed-in Power Limit</h2>
        <div className="label">Set limit (kW)</div>
        <input
          type="number"
          step="0.1"
          min="0"
          max="15"
          value={kwInput}
          onChange={(e) => setKwInput(e.target.value)}
        />
        <button onClick={setPowerLimit}>Set & Enable</button>
        <br /><br />
        <button onClick={enableLimit}>Enable Limit</button>
        <button onClick={disableLimit}>Disable Limit</button>
      </div>

      {/* Inverter on/off */}
      <div className="card">
        <h2>Inverter Control</h2>
        <button onClick={startInverter}>Start</button>
        <button onClick={stopInverter}>Stop</button>
      </div>
    </div>
  );
};

export default SungrowInverter;

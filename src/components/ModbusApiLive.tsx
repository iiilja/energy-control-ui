import { useState, useEffect } from 'react';
import { heatPumpAPI, HeatPumpData, RebootStats } from '../services/api';
import './ModbusApiLive.css';

const demandTexts: Record<number, string> = {
  1: "Manual operation",
  2: "Defrost",
  3: "Hot water",
  4: "Heating",
  5: "Cooling",
  6: "Pool",
  7: "Anti-legionella",
  98: "Standby",
  99: "No demand",
  100: "OFF"
};

const ModbusApiLive = () => {
  const [data, setData] = useState<HeatPumpData | null>(null);
  // const [rebootStats, setRebootStats] = useState<RebootStats | null>(null);
  const [error, setError] = useState('');
  const [tempInput, setTempInput] = useState('21.0');
  const [curveInputs, setCurveInputs] = useState<string[]>([]);
  // const [hwcPumpOnDuration, setHwcPumpOnDuration] = useState<number | undefined>(0);
  // const [hwcPumpOffDuration, setHwcPumpOffDuration] = useState<number | undefined>(0);

  const fetchData = async () => {
    try {
      const response = await heatPumpAPI.fetchData();
      setData(response.data);
      // setHwcPumpOnDuration(response.data.pump.onDuration);
      // setHwcPumpOffDuration(response.data.pump.offDuration);
      setTempInput(response.data.heating.setpoint.toFixed(1));
      setCurveInputs(response.data.heatCurve.supplyTemp.map(t => t.toFixed(1)));
      setError('');
    } catch (err: any) {
      setError(`Error loading data: ${err.message}`);
    }
  };

  // const fetchRebootStats = async () => {
  //   try {
  //     const response = await heatPumpAPI.fetchRebootStats();
  //     setRebootStats(response.data);
  //   } catch (err: any) {
  //     console.error('Error fetching reboot stats:', err);
  //   }
  // };

  useEffect(() => {
    fetchData();
    // fetchRebootStats();
    const dataInterval = setInterval(fetchData, 15000);
    return () => {
      clearInterval(dataInterval);
    };
  }, []);

  const toggleHeating = async (enable: boolean) => {
    try {
      enable ? await heatPumpAPI.enableHeating() : await heatPumpAPI.disableHeating();
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleTapWater = async (enable: boolean) => {
    try {
      enable ? await heatPumpAPI.enableTapWater() : await heatPumpAPI.disableTapWater();
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleCooling = async (enable: boolean) => {
    try {
      enable ? await heatPumpAPI.enableCooling() : await heatPumpAPI.disableCooling();
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleInternalHeater = async (enable: boolean) => {
    try {
      enable ? await heatPumpAPI.enableInternalHeater() : await heatPumpAPI.disableInternalHeater();
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const setMode = async (mode: number) => {
    try {
      const response = await heatPumpAPI.setMode(mode);
      alert(`Mode changed to: ${response.data.modeText}`);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const setTemp = async () => {
    const temp = parseFloat(tempInput);
    if (temp < 15 || temp > 30) {
      alert('Temperature must be between 15-30°C');
      return;
    }
    try {
      const response = await heatPumpAPI.setSetpoint(temp);
      alert(`Temperature set: ${response.data.temperature}°C`);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const updateHeatCurve = async () => {
    const points = curveInputs.map(v => parseFloat(v));
    if (points.some(v => v < 15 || v > 65)) {
      alert('Error: temperature must be between 15-65°C');
      return;
    }
    try {
      await heatPumpAPI.updateHeatCurve(points);
      alert('Heat curve successfully updated!');
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // const setHWCPumpAuto = async () => {
  //   try {
  //     await heatPumpAPI.setPump({ autoMode: true, onDuration: hwcPumpOnDuration, offDuration: hwcPumpOffDuration });
  //     alert('Auto mode activated');
  //     fetchData();
  //   } catch (err: any) {
  //     alert(`Error: ${err.message}`);
  //   }
  // };
  //
  // const setHWCPumpManual = async (state: boolean) => {
  //   try {
  //     await heatPumpAPI.setPump({ manualState: state });
  //     alert(state ? 'Pump ON' : 'Pump OFF');
  //     fetchData();
  //   } catch (err: any) {
  //     alert(`Error: ${err.message}`);
  //   }
  // };

  // const resetRebootStats = async () => {
  //   if (!confirm('Are you sure you want to reset reboot statistics?')) {
  //     return;
  //   }
  //   try {
  //     const response = await heatPumpAPI.resetRebootStats();
  //     alert(response.data.message);
  //     fetchRebootStats();
  //   } catch (err: any) {
  //     alert(`Error: ${err.message}`);
  //   }
  // };

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!data) {
    return <div>Loading data...</div>;
  }

  const secondsAgo = Math.floor((Date.now() - data.status.lastUpdate) / 1000);

  return (
    <div className="modbus-container">
      <h1>🔥 Thermia Calibra ECO 12</h1>
      <p>Updated: {secondsAgo} seconds ago</p>

      {/* Operation Mode */}
      <div className="card">
        <h2>Operation Mode</h2>
        <span className={`status ${data.status.operationMode === 3 ? 'on' : 'off'}`}>
          {data.status.operationModeText}
        </span>
        <br /><br />
        <div className="label">Current Function</div>
        <div>
          {[100, 99, 98, 1, 2, 3, 4, 5, 6, 7].map(d => (
            <div key={d} className={`demand-status${d === data.status.currentDemand ? ' active' : ''}`}>
              {demandTexts[d] || `Unknown (${d})`}
            </div>
          ))}
        </div>
        <br />
        <div className="label">System Status</div>
        <span className={`status ${data.status.alarmActive ? 'off' : 'on'}`}>
          {data.status.alarmActive ? '⚠ ALARM' : '✓ Normal'}
        </span>
        <br /><br />
        <button onClick={() => setMode(1)}>OFF</button>
        <button onClick={() => setMode(2)}>Standby</button>
        <button onClick={() => setMode(3)}>ON/Auto</button>
      </div>

      {/* Function Enables */}
      <div className="card">
        <h2>Functions</h2>
        <div className="functions-grid">
          <span>Space Heating</span>
          <span className={`status ${data.enables.heating ? 'on' : 'off'}`}>
            {data.enables.heating ? 'Enabled' : 'Disabled'}
          </span>
          <button onClick={() => toggleHeating(true)} disabled={data.enables.heating}>Enable</button>
          <button onClick={() => toggleHeating(false)} disabled={!data.enables.heating}>Disable</button>

          <span>Tap Water</span>
          <span className={`status ${data.enables.tapWater ? 'on' : 'off'}`}>
            {data.enables.tapWater ? 'Enabled' : 'Disabled'}
          </span>
          <button onClick={() => toggleTapWater(true)} disabled={data.enables.tapWater}>Enable</button>
          <button onClick={() => toggleTapWater(false)} disabled={!data.enables.tapWater}>Disable</button>

          <span>Cooling</span>
          <span className={`status ${data.enables.cooling ? 'on' : 'off'}`}>
            {data.enables.cooling ? 'Enabled' : 'Disabled'}
          </span>
          <button onClick={() => toggleCooling(true)} disabled={data.enables.cooling}>Enable</button>
          <button onClick={() => toggleCooling(false)} disabled={!data.enables.cooling}>Disable</button>

          <span>Internal Heater</span>
          <span className={`status ${!data.enables.internalHeater ? 'off' : data.internalHeater.step > 0 ? 'active' : 'on'}`}>
            {!data.enables.internalHeater ? 'Disabled' : data.internalHeater.step > 0 ? `Step ${data.internalHeater.step}` : 'Enabled'}
          </span>
          <button onClick={() => toggleInternalHeater(true)} disabled={data.enables.internalHeater}>Enable</button>
          <button onClick={() => toggleInternalHeater(false)} disabled={!data.enables.internalHeater}>Disable</button>
        </div>
      </div>

      {/* Temperatures */}
      <div className="card">
        <h2>Temperatures</h2>
        <div className="label">Outdoor</div>
        <div className="temp">{data.temperatures.outdoor.toFixed(1)}°C</div>
        <div className="label">System Supply Line</div>
        <div className="temp">{data.temperatures.systemSupplyLine.toFixed(1)}°C</div>
        <div className="label">Supply Setpoint (calculated)</div>
        <span>{data.temperatures.systemSupplySetpoint.toFixed(1)}°C</span>
        <br />
        <div className="label">Supply In / Out</div>
        <span>{data.temperatures.systemSupplyIn.toFixed(1)} / {data.temperatures.systemSupplyOut.toFixed(1)}°C</span>
        <br />
        <div className="label">Brine In / Out</div>
        <span>{data.temperatures.brineIn.toFixed(1)} / {data.temperatures.brineOut.toFixed(1)}°C</span>
        <br />
        <div className="label">Hot Water Top / Lower</div>
        <span>{data.temperatures.tapWaterTop.toFixed(1)} / {data.temperatures.tapWaterLower.toFixed(1)}°C</span>
      </div>

      {/* Compressor */}
      <div className="card">
        <h2>Compressor</h2>
        <div>
          RPM: <b>{data.compressor.rpm} RPM</b><br />
          Speed: <b>{data.compressor.speed.toFixed(0)}%</b><br />
          Compressor hours: <b>{data.compressor.hours} h</b><br />
          Hot water hours: <b>{data.heating.hours} h</b><br />
          External heater hours: <b>{data.heating.externalHeaterHours} h</b>
        </div>
      </div>

      {/* Temperature Control */}
      <div className="card">
        <h2>Control</h2>
        <div>
          Comfort wheel (desired room temperature): <b>{data.heating.setpoint.toFixed(1)}°C</b><br />
          <small>Calculated supply setpoint: {data.temperatures.systemSupplySetpoint.toFixed(1)}°C</small><br /><br />
        </div>
        <input
          type="number"
          step="0.5"
          min="15"
          max="30"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
        />
        <button onClick={setTemp}>Set Temperature</button>
      </div>

      {/* Heat Curve */}
      <div className="card">
        <h2>Heat Curve</h2>
        <table className="heat-curve-table">
          <thead>
            <tr>
              <th>Outdoor T° (X)</th>
              <th>Current Supply T° (Y)</th>
              <th>New Supply T°</th>
            </tr>
          </thead>
          <tbody>
            {data.heatCurve.outdoorTemp.map((x, i) => (
              <tr key={i}>
                <td>
                  {x.toFixed(1)}°C {i === 0 ? <small>(max)</small> : i === 6 ? <small>(min)</small> : ''}
                </td>
                <td>{data.heatCurve.supplyTemp[i].toFixed(1)}°C</td>
                <td>
                  <input
                    type="number"
                    step="0.5"
                    min="15"
                    max="65"
                    value={curveInputs[i] || ''}
                    onChange={(e) => {
                      const newInputs = [...curveInputs];
                      newInputs[i] = e.target.value;
                      setCurveInputs(newInputs);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <br />
        <button onClick={updateHeatCurve}>Update Curve</button>
        <br /><br />
        <small>
          System automatically calculates supply temperature based on outdoor temperature using this curve.
          Range: 15-65°C
        </small>
      </div>

      {/* Hot Water Circulation Pump */}
      {/*<div className="card">*/}
      {/*  <h2>Hot Water Circulation Pump</h2>*/}
      {/*  <div className="label">Operating Mode</div>*/}
      {/*  <span className={`status ${data.pump.autoMode ? 'on' : 'off'}`}>*/}
      {/*    {data.pump.autoMode ? 'Automatic' : 'Manual'}*/}
      {/*  </span>*/}
      {/*  <br /><br />*/}
      {/*  <div className="label">Pump State</div>*/}
      {/*  <span className={`status ${data.pump.currentState ? 'on' : 'off'}`}>*/}
      {/*    {data.pump.currentState ? 'ON' : 'OFF'}*/}
      {/*  </span>*/}
      {/*  <br /><br />*/}
      {/*  {data.pump.autoMode && data.pump.remainingMinutes !== undefined && (*/}
      {/*    <div>*/}
      {/*      <small>Remaining: {data.pump.remainingMinutes} min</small><br /><br />*/}
      {/*    </div>*/}
      {/*  )}*/}
      {/*  On time: <input*/}
      {/*    type="number"*/}
      {/*    min="1"*/}
      {/*    max="60"*/}
      {/*    value={hwcPumpOnDuration}*/}
      {/*    onChange={(e) => setHwcPumpOnDuration(parseInt(e.target.value))}*/}
      {/*  /> min<br />*/}
      {/*  Interval: <input*/}
      {/*    type="number"*/}
      {/*    min="1"*/}
      {/*    max="120"*/}
      {/*    value={hwcPumpOffDuration}*/}
      {/*    onChange={(e) => setHwcPumpOffDuration(parseInt(e.target.value))}*/}
      {/*  /> min<br /><br />*/}
      {/*  <button onClick={setHWCPumpAuto}>Auto Mode</button>*/}
      {/*  <button onClick={() => setHWCPumpManual(true)}>ON</button>*/}
      {/*  <button onClick={() => setHWCPumpManual(false)}>OFF</button>*/}
      {/*</div>*/}

      {/* Reboot Statistics */}
      {/*{rebootStats && (*/}
      {/*  <div className="card">*/}
      {/*    <h2>Reboot Statistics</h2>*/}
      {/*    <div>*/}
      {/*      Total reboots: <b>{rebootStats.totalReboots}</b><br />*/}
      {/*      Watchdog reboots: <b>{rebootStats.watchdogReboots}</b><br />*/}
      {/*      Panic reboots: <b>{rebootStats.panicReboots}</b><br />*/}
      {/*      Normal reboots: <b>{rebootStats.normalReboots}</b><br />*/}
      {/*      Last reset reason: <b>{rebootStats.lastResetReason}</b><br />*/}
      {/*      Uptime: <b>*/}
      {/*        {Math.floor(rebootStats.uptimeSeconds / 3600)} h{' '}*/}
      {/*        {Math.floor((rebootStats.uptimeSeconds % 3600) / 60)} min*/}
      {/*      </b>*/}
      {/*    </div>*/}
      {/*    <br />*/}
      {/*    <button onClick={resetRebootStats}>Reset Statistics</button>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
};

export default ModbusApiLive;

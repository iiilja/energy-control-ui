import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ModbusApiLive from './ModbusApiLive';
import './Layout.css';

const Layout = () => {
  const [activeTab, setActiveTab] = useState('modbus');
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <h1>Energy Control</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'modbus' ? 'active' : ''}`}
          onClick={() => setActiveTab('modbus')}
        >
          Modbus API Live
        </button>
        <button
          className={`tab ${activeTab === 'nordpool' ? 'active' : ''}`}
          onClick={() => setActiveTab('nordpool')}
        >
          Nordpool Prices
        </button>
        <button
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Heating Schedule
        </button>
      </nav>

      <main className="content">
        {activeTab === 'modbus' && <ModbusApiLive />}
        {activeTab === 'nordpool' && <div>Nordpool Prices (Coming soon)</div>}
        {activeTab === 'schedule' && <div>Heating Schedule (Coming soon)</div>}
      </main>
    </div>
  );
};

export default Layout;

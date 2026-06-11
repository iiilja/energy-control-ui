import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ModbusApiLive from './components/ModbusApiLive';
import NordpoolPrices from './components/NordpoolPrices';
import HeatingSchedule from './components/HeatingSchedule';
import SungrowInverter from './components/SungrowInverter';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/modbus" replace />} />
        <Route path="modbus" element={<ModbusApiLive />} />
        <Route path="nordpool" element={<NordpoolPrices />} />
        <Route path="schedule" element={<HeatingSchedule />} />
        <Route path="sungrow" element={<SungrowInverter />} />
        <Route path="*" element={<Navigate to="/modbus" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

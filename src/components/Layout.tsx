import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = () => {
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
        <NavLink to="/modbus" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          Modbus API Live
        </NavLink>
        <NavLink to="/nordpool" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          Nordpool Prices
        </NavLink>
        <NavLink to="/schedule" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          Heating Schedule
        </NavLink>
        <NavLink to="/sungrow" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          Sungrow PV
        </NavLink>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

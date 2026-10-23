import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
  ADMIN: { label: 'Admin', cls: 'badge--red' },
  PROJECT_MANAGER: { label: 'PM', cls: 'badge--blue' },
  TEAM_MEMBER: { label: 'Member', cls: 'badge--green' },
};

export default function Layout() {
  const { user, logout, isAdmin, isPM } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/projects', icon: '📁', label: 'Projects' },
    { to: '/tasks', icon: '✅', label: 'Tasks' },
    ...(isAdmin ? [{ to: '/users', icon: '👥', label: 'Users' }] : []),
  ];

  const roleInfo = ROLE_LABELS[user?.role] || { label: user?.role, cls: 'badge--gray' };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <span className="sidebar__logo">📋 CollabPM</span>
          <button className="sidebar__close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar__nav">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.name}</span>
              <span className="sidebar__user-email">{user?.email}</span>
              <span className={`badge ${roleInfo.cls}`} style={{ marginTop: '4px', alignSelf: 'flex-start' }}>
                {roleInfo.label}
              </span>
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="topbar__menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="topbar__logo">📋 CollabPM</span>
          <div className="topbar__actions">
            <span className={`badge ${roleInfo.cls}`}>{roleInfo.label}</span>
            <span className="topbar__user">Hi, {user?.name?.split(' ')[0]}</span>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

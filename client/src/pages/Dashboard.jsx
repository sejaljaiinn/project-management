import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_GREETINGS = {
  ADMIN: 'You have full administrative access.',
  PROJECT_MANAGER: 'Manage your assigned projects and tasks.',
  TEAM_MEMBER: 'View your assigned tasks and projects.',
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const statsEndpoint = isAdmin ? '/admin/stats' : '/tasks/stats';
        const [statsRes, projRes, taskRes] = await Promise.all([
          api.get(statsEndpoint),
          api.get('/projects'),
          api.get('/tasks'),
        ]);
        setStats(statsRes.data);
        setRecentProjects(projRes.data.slice(0, 4));
        setRecentTasks(taskRes.data.slice(0, 5));
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Loading dashboard…</p></div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  const cards = [
    ...(isAdmin ? [{ label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', color: 'purple' }] : []),
    { label: 'Total Projects', value: stats?.totalProjects ?? 0, icon: '📁', color: 'blue' },
    { label: 'Total Tasks', value: stats?.totalTasks ?? 0, icon: '📋', color: 'orange' },
    { label: 'Completed', value: stats?.completedTasks ?? 0, icon: '✅', color: 'green' },
    { label: 'Pending', value: stats?.pendingTasks ?? 0, icon: '⏳', color: 'red' },
  ];

  const priorityClass = (p) => ({ Low: 'badge--green', Medium: 'badge--yellow', High: 'badge--red' }[p] || '');
  const statusClass = (s) => ({ 'To Do': 'badge--gray', 'In Progress': 'badge--blue', Done: 'badge--green' }[s] || '');

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Welcome back, {user?.name} 👋 — {ROLE_GREETINGS[user?.role]}</p>
        </div>
        <div className="page__header-actions">
          {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
            <Link to="/projects" className="btn btn--primary">+ New Project</Link>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card stat-card--${c.color}`}>
            <div className="stat-card__icon">{c.icon}</div>
            <div className="stat-card__body">
              <span className="stat-card__value">{c.value}</span>
              <span className="stat-card__label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Recent projects */}
        <section className="card">
          <div className="card__header">
            <h2>Recent Projects</h2>
            <Link to="/projects" className="link">View all →</Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="empty-state">
              <p>📁 No projects yet.</p>
              {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
                <Link to="/projects" className="btn btn--primary btn--sm" style={{ marginTop: '0.5rem' }}>Create project</Link>
              )}
            </div>
          ) : (
            <div className="project-list">
              {recentProjects.map((p) => (
                <Link key={p._id} to={`/projects/${p._id}`} className="project-item">
                  <div className="project-item__icon">📁</div>
                  <div>
                    <div className="project-item__name">{p.name}</div>
                    <div className="project-item__desc text-muted">{p.description || 'No description'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent tasks */}
        <section className="card">
          <div className="card__header">
            <h2>{user?.role === 'TEAM_MEMBER' ? 'My Tasks' : 'Recent Tasks'}</h2>
            <Link to="/tasks" className="link">View all →</Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <p>✅ No tasks yet.</p>
            </div>
          ) : (
            <div className="task-list">
              {recentTasks.map((t) => (
                <div key={t._id} className="task-item">
                  <div className="task-item__info">
                    <span className="task-item__title">{t.title}</span>
                    <span className="text-muted task-item__project">{t.project?.name}</span>
                  </div>
                  <div className="task-item__badges">
                    <span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span>
                    <span className={`badge ${statusClass(t.status)}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

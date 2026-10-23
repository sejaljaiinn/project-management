import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'];
const ROLE_LABELS = { ADMIN: 'Admin', PROJECT_MANAGER: 'Project Manager', TEAM_MEMBER: 'Team Member' };
const ROLE_BADGE = { ADMIN: 'badge--red', PROJECT_MANAGER: 'badge--blue', TEAM_MEMBER: 'badge--green' };

const emptyForm = { name: '', email: '', password: '', role: 'TEAM_MEMBER' };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null); // null = create mode
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditUser(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) { setFormError('Name and email are required'); return; }
    if (!editUser && form.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }

    setSaving(true);
    try {
      if (editUser) {
        // Update role only via PUT /admin/users/:id
        await api.put(`/admin/users/${editUser._id}`, { role: form.role });
        flash(`Role updated for ${editUser.name}`);
      } else {
        // Create user via POST /admin/users
        await api.post('/admin/users', { name: form.name, email: form.email, password: form.password, role: form.role });
        flash('User created successfully');
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
      flash(`User "${name}" deleted`);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Loading users…</p></div>;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>User Management</h1>
          <p className="text-muted">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>+ Create User</button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      {users.length === 0 ? (
        <div className="empty-state empty-state--page">
          <div className="empty-state__icon">👥</div>
          <h2>No users found</h2>
          <p>Create the first user to get started.</p>
          <button className="btn btn--primary" onClick={openCreate}>+ Create User</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                      {u._id === me?._id && <span className="badge badge--purple" style={{ fontSize: '0.65rem' }}>You</span>}
                    </div>
                  </td>
                  <td><span className="text-muted">{u.email}</span></td>
                  <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge--gray'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td><span className="text-muted text-sm">{new Date(u.createdAt).toLocaleDateString()}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--ghost btn--xs" onClick={() => openEdit(u)} title="Change role">
                        ✏️ Role
                      </button>
                      {u._id !== me?._id && (
                        <button className="btn btn--ghost btn--xs btn--danger" onClick={() => handleDelete(u._id, u.name)} title="Delete user">
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editUser ? `Edit Role — ${editUser.name}` : 'Create New User'}</h2>
              <button className="modal__close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              {formError && <div className="alert alert--error">{formError}</div>}

              {!editUser && (
                <>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Password * (min 6 chars)</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : editUser ? 'Update Role' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

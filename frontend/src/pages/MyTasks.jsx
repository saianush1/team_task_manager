import { useState, useEffect } from 'react';
import { getTasks, updateTaskStatus, getProjects } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { Calendar, Filter, CheckSquare, Users } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const isOver = (t) => t.dueDate && t.status !== 'done' && new Date() > new Date(t.dueDate);
const STATUS_LBL = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };

const MyTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', projectId: '' });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.projectId) params.projectId = filters.projectId;
      const res = await getTasks(params);
      setTasks(res.data.data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { getProjects().then(r => setProjects(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { fetchTasks(); }, [filters]);

  const handleStatus = async (id, status) => {
    try {
      await updateTaskStatus(id, status);
      setTasks(prev => prev.map(t => t._id === id ? { ...t, status } : t));
      toast.success('Status updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot update'); }
  };

  const overdueCnt = tasks.filter(isOver).length;
  const doneCnt = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <CheckSquare size={19} color="var(--accent-light)" />
              {user?.role === 'admin' ? 'All Tasks' : 'My Tasks'}
            </div>
            <div className="topbar-sub" style={{ display: 'flex', gap: '10px' }}>
              <span>{tasks.length} task(s)</span>
              {overdueCnt > 0 && <span style={{ color: 'var(--rose)' }}>· {overdueCnt} overdue</span>}
              <span style={{ color: 'var(--emerald)' }}>· {doneCnt} done</span>
            </div>
          </div>
        </div>

        <div className="page fade-in">
          {/* Filters */}
          <div className="card" style={{ marginBottom: '18px', padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Filter size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <select className="form-select" style={{ flex: '1', minWidth: '130px', width: 'auto' }}
                value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <select className="form-select" style={{ flex: '1', minWidth: '130px', width: 'auto' }}
                value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <select className="form-select" style={{ flex: '1', minWidth: '150px', width: 'auto' }}
                value={filters.projectId} onChange={e => setFilters(p => ({ ...p, projectId: e.target.value }))}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
              </select>
              {(filters.status || filters.priority || filters.projectId) && (
                <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', projectId: '' })}>Clear</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /><p className="loading-text">Loading...</p></div>
          ) : tasks.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✅</div>
              <h3 className="empty-title">No tasks found</h3>
              <p className="empty-text">
                {user?.role === 'admin'
                  ? 'Create tasks inside a project board.'
                  : 'You have no tasks assigned yet. Request to join a project to get started.'}
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Assigned To</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => {
                      const overdue = isOver(t);
                      const isAssignee = t.assignees?.some(a => (a._id || a) === user?._id);
                      const canAct = user?.role === 'admin' || isAssignee;
                      return (
                        <tr key={t._id} style={overdue ? { background: 'rgba(244,63,94,.025)' } : {}}>
                          <td style={{ minWidth: '200px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px', lineHeight: 1.4 }}>
                              {t.title}
                              {overdue && <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--rose)' }}>⚠️ Overdue</span>}
                            </div>
                            {t.description && (
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                                {t.description.slice(0, 60)}…
                              </div>
                            )}
                          </td>
                          <td>
                            {t.project ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.project.color || 'var(--accent)', flexShrink: 0 }} />
                                <span style={{ fontSize: '13px', fontWeight: 500 }}>{t.project.title}</span>
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            {/* Show all assignees as stacked avatars */}
                            {t.assignees?.length > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div className="avatars">
                                  {t.assignees.slice(0, 4).map(a => (
                                    <div key={a._id || a} className="sm-avatar" style={{ width: 24, height: 24, fontSize: '10px' }} title={a.name}>
                                      {a.name?.[0]?.toUpperCase()}
                                    </div>
                                  ))}
                                  {t.assignees.length > 4 && (
                                    <div className="sm-avatar" style={{ width: 24, height: 24, fontSize: '10px', background: 'var(--bg-4)', color: 'var(--text-3)' }}>
                                      +{t.assignees.length - 4}
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{t.assignees.length}</span>
                              </div>
                            ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                          </td>
                          <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                          <td style={{ color: overdue ? 'var(--rose)' : 'var(--text-2)', fontSize: '13px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Calendar size={12} /> {fmt(t.dueDate)}
                            </span>
                          </td>
                          <td><span className={`badge badge-${t.status}`}>{STATUS_LBL[t.status]}</span></td>
                          <td>
                            {canAct && t.status !== 'done' ? (
                              <select className="form-select" style={{ fontSize: '12px', padding: '5px 8px', width: 'auto', minWidth: '110px' }}
                                value={t.status} onChange={e => handleStatus(t._id, e.target.value)}>
                                <option value="todo">To Do</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>
                            ) : (
                              <span style={{ fontSize: '12px', color: t.status === 'done' ? 'var(--emerald)' : 'var(--text-3)' }}>
                                {t.status === 'done' ? '✅ Done' : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTasks;

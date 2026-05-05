import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getProjects, getPendingRequests } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { ArrowRight, Calendar, AlertTriangle, Bell } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const isOverdue = (t) => t.dueDate && t.status !== 'done' && new Date() > new Date(t.dueDate);

const STATUS_CLS = { 'todo': 'badge-todo', 'in-progress': 'badge-in-progress', 'done': 'badge-done' };

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [d, p] = await Promise.all([getDashboard(), getProjects()]);
        setData(d.data.data);
        setProjects(p.data.data.filter(pr => pr.status === 'active').slice(0, 4));
        if (user?.role === 'admin') {
          const r = await getPendingRequests();
          setPending(r.data.data);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user]);

  const stats = data ? [
    { label: 'Total Tasks', val: data.stats.total, icon: '📋', color: 'var(--accent-light)', bg: 'var(--accent-subtle)' },
    { label: 'In Progress', val: data.stats.inProgress, icon: '⚡', color: 'var(--amber)', bg: 'rgba(245,158,11,.1)' },
    { label: 'Completed', val: data.stats.done, icon: '✅', color: 'var(--emerald)', bg: 'rgba(16,185,129,.1)' },
    { label: 'Overdue', val: data.stats.overdue, icon: '🚨', color: 'var(--rose)', bg: 'rgba(244,63,94,.1)' },
  ] : [];

  return (
    <div className="app-layout">
      <Sidebar pendingCount={pending.length} />
      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard</div>
            <div className="topbar-sub">Welcome back, <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{user?.name}</span> 👋</div>
          </div>
          {user?.role === 'admin' && pending.length > 0 && (
            <button className="btn btn-amber btn-sm" onClick={() => navigate('/requests')}>
              <Bell size={14} /> {pending.length} Pending Request{pending.length > 1 ? 's' : ''}
            </button>
          )}
          {user?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects')}>+ New Project</button>
          )}
        </div>

        <div className="page fade-in">
          {loading ? (
            <div className="loading-center"><div className="spinner" /><p className="loading-text">Loading...</p></div>
          ) : (
            <>
              <div className="stat-grid">
                {stats.map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                    <div><div className="stat-val" style={{ color: s.color }}>{s.val}</div><div className="stat-lbl">{s.label}</div></div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '22px' }}>
                {/* Recent Tasks */}
                <div className="card">
                  <div className="card-header">
                    <div><div className="card-title">Recent Tasks</div><div className="card-sub">Latest activity</div></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
                      View all <ArrowRight size={13} />
                    </button>
                  </div>
                  {!data?.recentTasks?.length ? (
                    <div className="empty"><div className="empty-icon">📋</div><p className="empty-text">No tasks yet</p></div>
                  ) : data.recentTasks.map(t => (
                    <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }} className="truncate">{t.title}</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {t.project && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{t.project.title}</span>}
                          {t.dueDate && <span style={{ fontSize: '11px', color: isOverdue(t) ? 'var(--rose)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '3px' }}><Calendar size={10} />{fmt(t.dueDate)}</span>}
                        </div>
                      </div>
                      <span className={`badge ${STATUS_CLS[t.status]}`}>{t.status}</span>
                    </div>
                  ))}
                </div>

                {/* Overdue */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title" style={{ color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={15} /> Overdue Tasks
                      </div>
                      <div className="card-sub">{data?.overdueTasks?.length || 0} task(s) past due</div>
                    </div>
                  </div>
                  {!data?.overdueTasks?.length ? (
                    <div className="empty"><div className="empty-icon">🎉</div><p className="empty-text">No overdue tasks. Great work!</p></div>
                  ) : data.overdueTasks.map(t => (
                    <div key={t._id} style={{ padding: '11px', marginBottom: '8px', background: 'rgba(244,63,94,.05)', border: '1px solid rgba(244,63,94,.15)', borderRadius: 'var(--r-sm)' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>{t.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={11} /> Due: {fmt(t.dueDate)}
                        {t.assignee && <span style={{ color: 'var(--text-3)' }}>· {t.assignee.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects quick view */}
              {projects.length > 0 && (
                <div style={{ marginTop: '22px' }}>
                  <div className="flex-between" style={{ marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-.2px' }}>Active Projects</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>View all <ArrowRight size={13} /></button>
                  </div>
                  <div className="proj-grid">
                    {projects.map(pr => (
                      <div key={pr._id} className="proj-card" onClick={() => navigate(`/projects/${pr._id}`)}>
                        <div className="proj-bar" style={{ background: pr.color || 'var(--accent)' }} />
                        <div className="proj-body">
                          <div className="flex-between" style={{ marginBottom: '6px' }}>
                            <h3 className="proj-title">{pr.title}</h3>
                            <span className={`badge badge-${pr.status}`}>{pr.status}</span>
                          </div>
                          <p className="proj-desc">{pr.description || 'No description'}</p>
                          <div className="proj-footer">
                            <div className="avatars">
                              {pr.members?.slice(0, 4).map(m => (
                                <div key={m._id} className="sm-avatar" title={m.name}>{m.name?.[0]?.toUpperCase()}</div>
                              ))}
                              {pr.members?.length > 4 && <div className="sm-avatar" style={{ background: 'var(--bg-4)', color: 'var(--text-3)', fontSize: '10px' }}>+{pr.members.length - 4}</div>}
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{pr.completedCount}/{pr.taskCount} done</span>
                          </div>
                          {pr.taskCount > 0 && (
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${Math.round(pr.completedCount / pr.taskCount * 100)}%`, background: pr.color || 'var(--accent)' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

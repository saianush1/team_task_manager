import { useState, useEffect } from 'react';
import { getAllUsers, getProjects, addMember, removeMember } from '../api/api';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { Users, Shield, User, UserPlus, UserMinus, FolderKanban, ChevronDown } from 'lucide-react';

const Team = () => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    getAllUsers()
      .then(r => setUsers(r.data.data))
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setLoadingUsers(false));

    getProjects()
      .then(r => { setProjects(r.data.data); if (r.data.data.length > 0) setSelectedProject(r.data.data[0]); })
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoadingProjects(false));
  }, []);

  const currentProjectMembers = selectedProject?.members || [];
  const memberIds = new Set(currentProjectMembers.map(m => m._id || m));
  const nonMembers = users.filter(u => u.role !== 'admin' && !memberIds.has(u._id));

  const handleAdd = async (userId) => {
    if (!selectedProject) return;
    setActionLoading(p => ({ ...p, [userId]: 'add' }));
    try {
      await addMember(selectedProject._id, userId);
      const addedUser = users.find(u => u._id === userId);
      setProjects(prev => prev.map(p => p._id === selectedProject._id
        ? { ...p, members: [...(p.members || []), addedUser] }
        : p
      ));
      setSelectedProject(prev => ({ ...prev, members: [...(prev.members || []), addedUser] }));
      toast.success(`${addedUser.name} added to ${selectedProject.title}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[userId]; return n; });
    }
  };

  const handleRemove = async (userId) => {
    if (!selectedProject) return;
    const removedUser = users.find(u => u._id === userId) || currentProjectMembers.find(m => (m._id || m) === userId);
    if (!confirm(`Remove ${removedUser?.name} from ${selectedProject.title}?`)) return;
    setActionLoading(p => ({ ...p, [userId]: 'remove' }));
    try {
      await removeMember(selectedProject._id, userId);
      setProjects(prev => prev.map(p => p._id === selectedProject._id
        ? { ...p, members: p.members.filter(m => (m._id || m) !== userId) }
        : p
      ));
      setSelectedProject(prev => ({ ...prev, members: prev.members.filter(m => (m._id || m) !== userId) }));
      toast.success(`${removedUser?.name} removed from ${selectedProject.title}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[userId]; return n; });
    }
  };

  const admins = users.filter(u => u.role === 'admin');
  const members = users.filter(u => u.role === 'member');

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <Users size={19} color="var(--accent-light)" /> Team Management
            </div>
            <div className="topbar-sub">{users.length} workspace member(s)</div>
          </div>
        </div>

        <div className="page fade-in">
          {/* Workspace Stats */}
          <div className="stat-grid" style={{ marginBottom: '22px' }}>
            {[
              { label: 'Admin', val: admins.length, icon: <Shield size={20} color="var(--accent-light)" />, bg: 'var(--accent-subtle)', color: 'var(--accent-light)' },
              { label: 'Members', val: members.length, icon: <User size={20} color="var(--emerald)" />, bg: 'rgba(16,185,129,.1)', color: 'var(--emerald)' },
              { label: 'Projects', val: projects.length, icon: <FolderKanban size={20} color="var(--sky)" />, bg: 'rgba(56,189,248,.1)', color: 'var(--sky)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div><div className="stat-val" style={{ color: s.color }}>{s.val}</div><div className="stat-lbl">{s.label}</div></div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '18px', alignItems: 'start' }}>

            {/* Project Selector Panel */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={15} color="var(--accent-light)" />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>Projects</span>
              </div>
              {loadingProjects ? (
                <div className="loading-center" style={{ padding: '24px' }}><div className="spinner" /></div>
              ) : projects.length === 0 ? (
                <div className="empty" style={{ padding: '24px' }}><p className="empty-text">No projects yet</p></div>
              ) : (
                <div style={{ padding: '8px' }}>
                  {projects.map(pr => (
                    <button key={pr._id}
                      onClick={() => setSelectedProject(pr)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r-sm)',
                        border: 'none', cursor: 'pointer', transition: 'all .18s',
                        background: selectedProject?._id === pr._id ? 'var(--accent-subtle)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px'
                      }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: pr.color || 'var(--accent)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: selectedProject?._id === pr._id ? 'var(--accent-light)' : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{pr.members?.length || 0} members</div>
                      </div>
                      <span className={`badge badge-${pr.status}`}>{pr.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Members by Selected Project */}
            <div>
              {!selectedProject ? (
                <div className="empty card"><div className="empty-icon">📁</div><p className="empty-text">Select a project to manage its members</p></div>
              ) : (
                <>
                  {/* Project Header */}
                  <div className="card" style={{ marginBottom: '14px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedProject.color }} />
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800 }}>{selectedProject.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{selectedProject.description}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`badge badge-${selectedProject.status}`}>{selectedProject.status}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{currentProjectMembers.length} member(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Current Members */}
                  <div className="card" style={{ padding: 0, marginBottom: '14px' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={14} color="var(--emerald)" />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>Current Members</span>
                      <span className="badge badge-accepted" style={{ marginLeft: 4 }}>{currentProjectMembers.length}</span>
                    </div>
                    {currentProjectMembers.length === 0 ? (
                      <div className="empty" style={{ padding: '24px' }}><p className="empty-text">No members assigned yet</p></div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
                          <tbody>
                            {currentProjectMembers.map(m => {
                              const uid = m._id || m;
                              const userObj = users.find(u => u._id === uid) || m;
                              const isOwner = selectedProject.owner?._id === uid || selectedProject.owner === uid;
                              const isLoading = actionLoading[uid] === 'remove';
                              return (
                                <tr key={uid}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>
                                        {userObj.name?.[0]?.toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-1)' }}>{userObj.name}</div>
                                        {isOwner && <div style={{ fontSize: '10px', color: 'var(--accent-light)' }}>Project Owner</div>}
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ fontSize: '13px' }}>{userObj.email}</td>
                                  <td><span className={`badge badge-${userObj.role || 'member'}`}>{userObj.role || 'member'}</span></td>
                                  <td>
                                    {isOwner ? (
                                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Owner</span>
                                    ) : (
                                      <button className="btn btn-danger btn-sm"
                                        onClick={() => handleRemove(uid)} disabled={isLoading}>
                                        <UserMinus size={13} /> {isLoading ? '...' : 'Remove'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Add Members */}
                  {nonMembers.length > 0 && (
                    <div className="card" style={{ padding: 0 }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={14} color="var(--amber)" />
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>Add Members</span>
                        <span className="badge badge-pending" style={{ marginLeft: 4 }}>{nonMembers.length} available</span>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Member</th><th>Email</th><th>Action</th></tr></thead>
                          <tbody>
                            {nonMembers.map(u => {
                              const isLoading = actionLoading[u._id] === 'add';
                              return (
                                <tr key={u._id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>
                                        {u.name?.[0]?.toUpperCase()}
                                      </div>
                                      <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-1)' }}>{u.name}</span>
                                    </div>
                                  </td>
                                  <td style={{ fontSize: '13px' }}>{u.email}</td>
                                  <td>
                                    <button className="btn btn-success btn-sm"
                                      onClick={() => handleAdd(u._id)} disabled={isLoading}>
                                      <UserPlus size={13} /> {isLoading ? 'Adding...' : 'Add'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {nonMembers.length === 0 && currentProjectMembers.length > 0 && (
                    <div className="alert-box alert-success">
                      ✅ All workspace members are already in this project.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="alert-box alert-info" style={{ marginTop: '16px', fontSize: '12.5px' }}>
            <Shield size={13} style={{ display: 'inline', marginRight: '6px' }} />
            <strong>Note:</strong> When a task is created inside a project, it is automatically assigned to all members of that project.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderKanban, CheckSquare, Users, LogOut, Zap, Bell } from 'lucide-react';

const Sidebar = ({ pendingCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
    { to: '/projects', icon: <FolderKanban />, label: 'Projects' },
    { to: '/tasks', icon: <CheckSquare />, label: 'My Tasks' },
    ...(user?.role === 'admin' ? [
      { to: '/team', icon: <Users />, label: 'Team' },
      { to: '/requests', icon: <Bell />, label: 'Join Requests', badge: pendingCount }
    ] : [])
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark"><Zap size={20} color="white" /></div>
        <div className="logo-text"><h2>TaskFlow</h2><span>Team Manager</span></div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {item.icon}
            {item.label}
            {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="u-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="u-name">{user?.name}</div>
            <div className={`u-role ${user?.role}`}>{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout"><LogOut size={15} /></button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

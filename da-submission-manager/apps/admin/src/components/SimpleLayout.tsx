import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  DocumentIcon,
  ConfigIcon,
  FormIcon,
  HeartIcon,
  ChartBarIcon,
} from '@da/ui/icons';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Submissions', href: '/submissions', icon: FormIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Templates', href: '/templates', icon: DocumentIcon },
  { name: 'System Health', href: '/system-health', icon: HeartIcon },
  { name: 'Settings', href: '/settings', icon: ConfigIcon },
];

export default function SimpleLayout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sidebarStyle: React.CSSProperties = {
    width: '256px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    padding: '1rem',
    height: '100vh',
    overflow: 'auto'
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#f9fafb',
    height: '100vh',
    overflow: 'auto'
  };

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem',
    marginBottom: '0.25rem',
    borderRadius: '0.375rem',
    textDecoration: 'none',
    color: isActive ? '#1f2937' : '#6b7280',
    backgroundColor: isActive ? '#f3f4f6' : 'transparent',
    fontSize: '14px',
    fontWeight: '500'
  });

  const iconStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    marginRight: '0.75rem'
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            DA Admin
          </h1>
        </div>
        
        <nav>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                style={navItemStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.target as HTMLElement).style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                <item.icon style={iconStyle} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                  {user.name}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  color: '#1f2937',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: isLoggingOut ? 'wait' : 'pointer',
                }}
              >
                {isLoggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main content */}
      <div style={mainStyle}>
        {children}
      </div>
    </div>
  );
}

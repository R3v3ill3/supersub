import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  DocumentIcon,
  ConfigIcon,
  FormIcon,
  HeartIcon,
  ChartBarIcon,
} from '@da/ui/icons';
// import { useAuth } from '../contexts/AuthContext'; // Disabled for development

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
  // const { user, logout } = useAuth(); // Disabled for development
  // const [isLoggingOut, setIsLoggingOut] = useState(false); // Disabled for development

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

  // const handleLogout = async () => { // Disabled for development
  //   setIsLoggingOut(true);
  //   try {
  //     await logout();
  //   } catch (error) {
  //     console.error('Logout failed:', error);
  //   } finally {
  //     setIsLoggingOut(false);
  //   }
  // };

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

        {/* User Profile Section - Disabled for development */}
        {/* <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          Development Mode - Authentication Disabled
        </div> */}
      </div>

      {/* Main content */}
      <div style={mainStyle}>
        {children}
      </div>
    </div>
  );
}

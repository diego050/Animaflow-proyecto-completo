import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Activity,
  Settings,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Shield,
  ArrowLeft,
  Palette,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { SEOHead } from '../SEOHead';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/admin/system', label: 'Sistema', icon: Activity },
  { to: '/admin/animations', label: 'Animaciones', icon: Palette },
  { to: '/admin/animations/create', label: 'Crear Animación', icon: Sparkles },
  { to: '/admin/settings', label: 'Configuración', icon: Settings },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'A';

  return (
    <>
      <SEOHead title="Admin | AnimaFlow" noindex />
      <div className="min-h-screen font-body flex" style={{ backgroundColor: '#0F172A', color: '#e4e2e3' }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col"
        style={{ backgroundColor: '#1E293B', borderRight: '1px solid #334155' }}
        initial={{ x: isDesktop ? 0 : -256 }}
        animate={{ x: sidebarOpen || isDesktop ? 0 : -256 }}
        transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
      >
        <div className="h-16 flex items-center justify-between px-6" style={{ borderBottom: '1px solid #334155' }}>
          <div className="flex items-center gap-2">
            <Shield size={18} style={{ color: '#00FFAB' }} />
            <span className="font-display font-bold text-lg tracking-tight">
              Admin Panel
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#c4c6cd] hover:text-[#e4e2e3] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <AdminNavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid #334155' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#c4c6cd] hover:text-[#e4e2e3] hover:bg-[#334155] transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al Dashboard
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 h-16 backdrop-blur-md flex items-center justify-between px-4 lg:px-6" style={{ backgroundColor: 'rgba(30,41,59,0.8)', borderBottom: '1px solid #334155' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#c4c6cd] hover:text-[#e4e2e3] transition-colors"
            >
              <Menu size={20} />
            </button>
            <AdminBreadcrumb />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'rgba(44,62,80,0.2)', color: '#00FFAB' }}>
              {userInitials}
            </div>
            <span className="hidden md:inline text-sm font-medium max-w-32 truncate">
              {user?.name || user?.email || 'Admin'}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 text-[#c4c6cd] hover:text-[#FF8C00] transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
    </>
  );
}

function AdminNavItem({
  item,
  onClick,
}: {
  item: { to: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> };
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === '/admin'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[#2C3E50]/20 text-[#00FFAB]'
            : 'text-[#c4c6cd] hover:text-[#e4e2e3] hover:bg-[#334155]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function AdminBreadcrumb() {
  const location = window.location.pathname;
  const segments = location.split('/').filter(Boolean);
  const adminIndex = segments.indexOf('admin');

  if (adminIndex === -1) return null;

  const relevantSegments = segments.slice(adminIndex);

  const labelMap: Record<string, string> = {
    admin: 'Admin',
    users: 'Usuarios',
    jobs: 'Jobs',
    marketplace: 'Marketplace',
    system: 'Sistema',
    settings: 'Configuración',
  };

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0">
      {relevantSegments.map((segment, i) => {
        const isLast = i === relevantSegments.length - 1;
        const label = labelMap[segment] || segment;

        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={14} className="shrink-0" style={{ color: '#8e9197' }} />}
            <span
              className={isLast ? 'font-medium' : ''}
              style={{ color: isLast ? '#e4e2e3' : '#8e9197' }}
            >
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

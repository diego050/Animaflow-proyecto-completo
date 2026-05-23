import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Plus,
  Mic,
  FileText,
  Video,
  // Image, // MVP: oculto
  Download,
  Settings,
  Menu,
  X,
  ChevronRight,
  LogOut,
  User,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useWizardStore } from '../../store/useWizardStore';
import { SEOHead } from '../SEOHead';

const navItems = [
  { to: '/dashboard', label: 'Proyectos', icon: FolderOpen, disabled: false },
  { to: '/dashboard/new', label: 'Nuevo Proyecto', icon: Plus, disabled: false },
  { to: '/dashboard/voices', label: 'Voces', icon: Mic, disabled: false },
  { to: '/dashboard/scripts', label: 'Guiones', icon: FileText, disabled: false },
  { to: '/dashboard/videos', label: 'Videos', icon: Video, disabled: false },
  // { to: '/dashboard/images', label: 'Imágenes', icon: Image, disabled: false }, // MVP: oculto
  { to: '/dashboard/downloads', label: 'Descargas', icon: Download, disabled: false },
  { to: '/dashboard/settings', label: 'Configuración', icon: Settings, disabled: false },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const navigate = useNavigate();
  const { user, logout, fetchMe } = useAuthStore();

  // Detect desktop breakpoint for sidebar visibility
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch user data on mount
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    navigate('/dashboard/settings');
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <SEOHead title="Dashboard | AnimaFlow" noindex />
      <div className="min-h-screen bg-deep-slate text-text-primary font-body flex">
      {/* Mobile overlay */}
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

      {/* Sidebar */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 w-64 bg-surface-lowest border-r border-border-tech flex flex-col"
        initial={{ x: isDesktop ? 0 : -256 }}
        animate={{ x: sidebarOpen || isDesktop ? 0 : -256 }}
        transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border-tech">
          <span className="text-text-primary font-display font-bold text-xl tracking-tight">
            Anima<span className="text-mint-precision">Flow</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>
      </motion.aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-surface-lowest/80 backdrop-blur-md border-b border-border-tech flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
            >
              <Menu size={20} />
            </button>
            <Breadcrumb />
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-mint-precision/20 text-mint-precision flex items-center justify-center text-xs font-semibold">
                {userInitials}
              </div>
              <span className="hidden md:inline text-sm font-medium max-w-32 truncate">
                {user?.name || user?.email || 'Usuario'}
              </span>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 w-56 bg-surface-container border border-border-tech rounded-lg shadow-xl py-1"
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-border-tech">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-text-secondary/60 truncate">
                      {user?.email || ''}
                    </p>
                    {user?.role && (
                      <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider text-mint-precision/70 bg-mint-precision/10 px-1.5 py-0.5 rounded">
                        {user.role}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleProfileClick}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors"
                  >
                    <User size={16} />
                    Perfil
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/admin');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors"
                    >
                      <Shield size={16} />
                      Panel de Administración
                    </button>
                  )}
                  <div className="my-1 border-t border-border-tech" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:text-error/80 hover:bg-surface-high transition-colors"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// NavItem component
// ---------------------------------------------------------------------------

function NavItem({
  item,
  onClick,
}: {
  item: {
    to: string;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    disabled: boolean;
  };
  onClick: () => void;
}) {
  const Icon = item.icon;
  const resetWizard = useWizardStore((state) => state.resetWizard);
  const wizardData = useWizardStore((state) => state.wizardData);
  const wizardStep = useWizardStore((state) => state.wizardStep);
  
  const [showPrompt, setShowPrompt] = useState(false);
  const navigate = useNavigate();

  const isWizardDirty = () => {
    return window.location.pathname === '/dashboard/new' &&
           wizardStep < 3 &&
           (wizardData.info.trim() !== '' || wizardData.script.trim() !== '');
  };

  const handleClick = (e: React.MouseEvent) => {
    if (item.to === '/dashboard/new') {
      resetWizard();
      onClick();
      return;
    }

    if (isWizardDirty()) {
      e.preventDefault();
      setShowPrompt(true);
      return;
    }
    
    onClick();
  };

  const handleSaveDraft = async () => {
    try {
      const { useJobsStore } = await import('../../store/useJobsStore');
      await useJobsStore.getState().saveDraft(wizardData.generatedJobId, wizardData);
    } catch (e) {
      console.error('Error saving draft:', e);
    }
    resetWizard();
    setShowPrompt(false);
    navigate(item.to);
    onClick();
  };

  const handleDiscard = () => {
    resetWizard();
    setShowPrompt(false);
    navigate(item.to);
    onClick();
  };

  if (item.disabled) {
    return (
      <div
        className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary/40 cursor-not-allowed"
        title="Próximamente"
      >
        <Icon size={18} strokeWidth={1.5} />
        <span className="text-sm font-medium">{item.label}</span>
        <span className="ml-auto text-[10px] text-text-secondary/30 bg-surface-high px-1.5 py-0.5 rounded">
          Pronto
        </span>
      </div>
    );
  }

  return (
    <>
      <NavLink
        to={item.to}
        end
        onClick={handleClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-mint-precision/10 text-mint-precision'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-high'
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

      {/* Draft Save Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container border border-border-tech rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-text-primary mb-2">Proyecto sin guardar</h3>
            <p className="text-sm text-text-secondary mb-6">
              Tienes progreso en un nuevo proyecto. ¿Deseas guardarlo como borrador antes de salir?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveDraft}
                className="w-full px-4 py-2 bg-mint-precision text-deep-slate rounded-lg text-sm font-semibold hover:bg-white transition-colors"
              >
                Sí, guardar borrador
              </button>
              <button
                onClick={handleDiscard}
                className="w-full px-4 py-2 bg-error/10 text-error rounded-lg text-sm font-semibold hover:bg-error/20 transition-colors"
              >
                No, descartar
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="w-full px-4 py-2 text-text-secondary rounded-lg text-sm font-medium hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb component
// ---------------------------------------------------------------------------

function Breadcrumb() {
  const location = window.location.pathname;
  const segments = location.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');

  if (dashboardIndex === -1) return null;

  // Hide breadcrumb on project detail pages — the editable project title
  // in the page content already provides sufficient context.
  const isProjectDetail = segments.some(
    (seg) => seg.startsWith('project') || seg.startsWith('projects')
  );
  if (isProjectDetail) return null;

  const relevantSegments = segments.slice(dashboardIndex);

  const labelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    new: 'Nuevo Proyecto',
    voices: 'Voces',
    scripts: 'Guiones',
    videos: 'Videos',
    images: 'Imágenes',
    downloads: 'Descargas',
    settings: 'Configuración',
  };

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0 max-w-[calc(100vw-12rem)]">
      {relevantSegments.map((segment, i) => {
        const isLast = i === relevantSegments.length - 1;
        const label =
          segment.startsWith('project') || segment.startsWith(':')
            ? 'Proyecto'
            : labelMap[segment] || segment;

        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={14} className="text-text-secondary/40 shrink-0" />}
            <span
              className={
                isLast
                  ? 'text-text-primary font-medium truncate max-w-[80px] sm:max-w-none'
                  : 'text-text-secondary/60'
              }
              title={label}
            >
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

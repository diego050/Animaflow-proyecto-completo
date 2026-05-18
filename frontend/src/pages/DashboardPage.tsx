import { Link } from 'react-router-dom';

export function DashboardPage() {
  return (
    <div className="bg-deep-slate text-text-secondary font-body min-h-screen relative selection:bg-mint-precision selection:text-deep-slate overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-grid opacity-30 z-0"></div>

      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-16 max-w-7xl mx-auto left-1/2 -translate-x-1/2 border-b border-border-tech bg-deep-slate backdrop-blur-md">
        <Link to="/" className="text-text-primary font-display font-bold text-2xl tracking-tight hover:text-mint-precision transition-colors">AnimaFlow</Link>
        <Link to="/" className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">Volver al inicio</Link>
      </nav>

      <div className="min-h-screen flex items-center justify-center px-4 md:px-8 pt-20 pb-12 relative z-10">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-panel/40 border border-border-tech mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-mint-precision">
              <rect x="2" y="2" width="20" height="20" rx="4" />
              <circle cx="12" cy="12" r="3" />
              <line x1="2" y1="12" x2="9" y2="12" />
              <line x1="15" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-text-primary tracking-tight">Tus Proyectos</h1>
          <p className="font-body text-lg text-text-secondary max-w-md mx-auto leading-relaxed">
            Proximamente — aqui veras todos tus videos generados con AnimaFlow.
          </p>

          {/* TODO: Conectar endpoint del backend para listar proyectos */}
          {/* GET /api/jobs → mapear a cards de proyectos con estado, fecha, preview */}

          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-mint-precision text-deep-slate rounded-md text-sm font-bold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)] hover:shadow-[0_5px_20px_rgba(0,255,171,0.5)]">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
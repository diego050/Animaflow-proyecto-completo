import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthPageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthPageLayout({ children, title, subtitle }: AuthPageLayoutProps) {
  return (
    <div className="bg-deep-slate text-text-secondary font-body min-h-screen relative selection:bg-mint-precision selection:text-deep-slate overflow-x-hidden">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none bg-grid opacity-30 z-0"></div>
      
      {/* Ambient glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(0,255,171,0.06)_0,rgba(15,23,42,0)_70%)] pointer-events-none -z-10" />

      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-16 max-w-7xl mx-auto left-1/2 -translate-x-1/2 border-b border-border-tech bg-deep-slate backdrop-blur-md">
        <Link to="/" className="text-text-primary font-display font-bold text-2xl tracking-tight hover:text-mint-precision transition-colors">AnimaFlow</Link>
        <Link to="/" className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"><ArrowLeft size={16} strokeWidth={2} /><span>Volver</span></Link>
      </nav>

      {/* Main content */}
      <div className="min-h-screen flex items-center justify-center px-4 md:px-8 pt-20 pb-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-surface-panel/40 backdrop-blur-sm border border-border-tech rounded-xl p-8 md:p-10 shadow-2xl">
            {/* Header */}
            <div className="space-y-2 mb-8">
              <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">{title}</h1>
              <p className="font-body text-sm text-text-secondary">{subtitle}</p>
            </div>
            
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { SEOHead } from '../components/SEOHead';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-deep-slate flex items-center justify-center p-4">
      <SEOHead title="Página no encontrada | AnimaFlow" noindex />
      <div className="text-center">
        <h1 className="text-6xl font-bold text-mint-precision mb-4">404</h1>
        <p className="text-text-secondary text-lg mb-8">
          Página no encontrada
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-mint-precision text-deep-slate rounded-lg font-semibold hover:bg-white transition-colors"
        >
          <Home size={18} />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

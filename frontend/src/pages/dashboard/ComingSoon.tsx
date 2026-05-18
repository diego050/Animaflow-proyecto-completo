import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { motion } from 'framer-motion';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({
  title = 'Próximamente',
  description = 'Esta funcionalidad estará disponible en una próxima actualización.',
}: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-8"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Volver a proyectos</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-surface-container border border-border-tech flex items-center justify-center mb-6">
          <Construction size={36} className="text-text-secondary/40" />
        </div>
        <h2 className="text-2xl font-display font-bold text-text-primary mb-2">
          {title}
        </h2>
        <p className="text-text-secondary text-sm max-w-sm mb-8">
          {description}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-6 py-3 bg-surface-highest text-text-primary rounded-lg text-sm font-semibold hover:bg-surface-high transition-colors"
        >
          Ir a Proyectos
        </button>
      </motion.div>
    </div>
  );
}

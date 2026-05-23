import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Settings, Palette } from 'lucide-react';

const COMPONENT_NAMES = [
  'SearchEngineTyping', 'TextReveal', 'KineticBackground', 'FloatingBlobs',
  'TrendLine', 'Typewriter', 'SubscribeButton', 'NetworkNodes',
  'GlitchTitle', 'GridPerspective', 'ParticleField', 'RaysOfLight',
  'BarChartReveal', 'PercentageRing', 'SocialProgressBar', 'FeatureChecklist',
  'TestimonialReview', 'MessageBubble', 'TweetCard', 'InstagramPost',
  'TikTokOverlay', 'PodcastGuestCard', 'MusicPlayerUI'
];

export function AnimationsGallery() {
  const navigate = useNavigate();
  const componentNames = COMPONENT_NAMES;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 hover:bg-surface-high rounded-lg text-text-secondary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Playground de Animaciones
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Explora, prueba y ajusta todos los componentes visuales disponibles para la IA.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {componentNames.map((name) => (
          <button
            key={name}
            onClick={() => navigate(`/admin/animations/${name}`)}
            className="flex flex-col text-left group bg-surface-container border border-border-tech hover:border-mint-precision rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,255,171,0.1)]"
          >
            <div className="h-32 bg-surface-lowest flex items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-mint-precision/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <PlayCircle className="text-mint-precision/40 group-hover:text-mint-precision transition-colors" size={48} />
            </div>
            <div className="p-4 border-t border-border-tech/50">
              <h3 className="text-sm font-semibold text-text-primary font-mono group-hover:text-mint-precision transition-colors">
                {name}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
                <Settings size={12} />
                <span>Interactuáble</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

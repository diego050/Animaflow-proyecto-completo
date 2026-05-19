import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Lock, Clock, Download, Zap, Edit3, Shield, Users, Sparkles, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useToastStore } from '../store/useToastStore';
import { SEOHead } from '../components/SEOHead';
import { OrganizationStructuredData, SoftwareApplicationStructuredData } from '../components/StructuredData';

export function Landing() {
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', rol: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const { addToast } = useToastStore();

  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#waitlist-form') {
      const el = document.getElementById('waitlist-form');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Error al enviar form');
      
      setStatus('success');
      setFormData({ nombre: '', email: '', telefono: '', rol: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al enviar formulario';
      addToast('error', message);
      setStatus('error');
    }
  };

  return (
    <>
      <SEOHead
        title="AnimaFlow - De texto a video profesional con IA"
        description="Crea videos profesionales desde texto en minutos. Exporta en MP4 + After Effects. Frame-accurate, sin saber animar. Únete a la beta gratis."
        url="https://animaflow.com/"
      />
      <OrganizationStructuredData />
      <SoftwareApplicationStructuredData />
      <div className="bg-deep-slate text-text-secondary font-body min-h-screen relative selection:bg-mint-precision selection:text-deep-slate overflow-x-hidden">
      
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none bg-grid opacity-30 z-0"></div>

      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-16 max-w-7xl mx-auto left-1/2 -translate-x-1/2 border-b border-border-tech bg-deep-slate backdrop-blur-md">
        <div className="text-text-primary font-display font-bold text-2xl tracking-tight">AnimaFlow</div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">
            Iniciar sesión
          </Link>
          <button 
            onClick={() => document.getElementById('waitlist-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-5 py-2 bg-mint-precision text-deep-slate rounded-md text-sm font-bold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)] hover:shadow-[0_5px_20px_rgba(0,255,171,0.5)]"
          >
            Empieza gratis
          </button>
        </div>
      </nav>

      <main className="pt-20 pb-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10">
        
        {/* Glowing Orb Background Hero */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(0,255,171,0.06)_0,rgba(15,23,42,0)_70%)] pointer-events-none -z-10"></div>
        
        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center gap-16 pt-8 pb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="flex-1 space-y-8 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <h1 className="font-display font-bold text-5xl md:text-7xl text-text-primary tracking-tighter leading-tight">
              De 3 semanas a hoy mismo.<br/><span className="text-text-secondary">Sin saber animar.</span>
            </h1>
            <p className="font-body text-lg text-text-secondary max-w-lg leading-relaxed">
              Crea videos profesionales para tus redes en menos de un dÃ­a. Sin contratar editores, sin complicaciones.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => document.getElementById('waitlist-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-mint-precision text-deep-slate px-8 py-4 rounded-md text-sm font-bold hover:bg-white hover:-translate-y-1 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)] hover:shadow-[0_10px_40px_rgba(0,255,171,0.5)] flex items-center gap-2 group" 
              >
                Crear mi primer video
                <span className="transition-transform duration-300 group-hover:translate-x-1">â†’</span>
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full max-w-2xl bg-steel-blue/30 border border-border-tech rounded-lg p-1 relative overflow-hidden backdrop-blur-sm"
          >
            <div className="bg-[#0b101a] rounded-md p-5 flex flex-col h-full gap-4 relative">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-border-tech/50">
                <div className="flex gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider border border-white/10 px-2 py-0.5 rounded">Timeline Sync</span>
                  <span className="font-mono text-xs text-mint-precision">00:00:12:15</span>
                </div>
              </div>
              
              <div className="flex-1 bg-surface-panel border border-border-tech rounded-md mb-2 flex items-center justify-center relative overflow-hidden aspect-video group">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                
                {/* SVG AI Animation */}
                <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 800 450">
                  <defs>
                    <linearGradient id="scan" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(0,255,171,0)" />
                      <stop offset="50%" stopColor="rgba(0,255,171,0.4)" />
                      <stop offset="100%" stopColor="rgba(0,255,171,0)" />
                    </linearGradient>
                    <filter id="glow-strong">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <g transform="translate(400, 225)">
                    {/* Pulsing Core */}
                    <motion.circle 
                      r="40" fill="none" stroke="rgba(0,255,171,0.2)" strokeWidth="2"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.2, 0.8, 0.2] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.circle 
                      r="60" fill="none" stroke="rgba(0,255,171,0.1)" strokeWidth="1" strokeDasharray="4 4"
                      initial={{ scale: 1, opacity: 0 }}
                      animate={{ scale: [1, 2, 1], opacity: [0.1, 0.5, 0.1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    />

                    {/* Central Geometric Node */}
                    <motion.path 
                      d="M 0 -30 L 26 -15 L 26 15 L 0 30 L -26 15 L -26 -15 Z" 
                      fill="rgba(0,255,171,0.05)" stroke="#00FFAB" strokeWidth="1.5" filter="url(#glow-strong)"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.path 
                      d="M 0 -15 L 13 -7.5 L 13 7.5 L 0 15 L -13 7.5 L -13 -7.5 Z" 
                      fill="rgba(0,255,171,0.2)" stroke="#00FFAB" strokeWidth="1"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Connecting AI Neurons */}
                    {[
                      { x: -140, y: -90 }, { x: 140, y: -70 }, 
                      { x: -160, y: 80 }, { x: 120, y: 120 },
                      { x: 0, y: -140 }, { x: -80, y: 140 }
                    ].map((pos, i) => (
                      <g key={i}>
                        <motion.line 
                          x1="0" y1="0" x2={pos.x} y2={pos.y}
                          stroke="rgba(148, 163, 184, 0.3)" strokeWidth="1"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        />
                        <motion.circle 
                          cx={pos.x} cy={pos.y} r="3" fill="#94A3B8"
                          animate={{ scale: [1, 1.5, 1], fill: ["#94A3B8", "#00FFAB", "#94A3B8"] }}
                          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                        />
                        {/* Data packets flowing */}
                        <motion.circle 
                          r="2.5" fill="#00FFAB" filter="url(#glow-strong)"
                          initial={{ cx: 0, cy: 0, opacity: 0 }}
                          animate={{ cx: pos.x, cy: pos.y, opacity: [0, 1, 0] }}
                          transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
                        />
                      </g>
                    ))}
                  </g>

                  {/* Scanning Overlay */}
                  <motion.rect
                    x="-800" y="0" width="800" height="450"
                    fill="url(#scan)"
                    initial={{ x: -800 }}
                    animate={{ x: 800 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{ mixBlendMode: "screen" }}
                  />
                </svg>

                <div className="absolute inset-0 bg-gradient-to-t from-[#0b101a] via-transparent to-transparent opacity-80 z-10 pointer-events-none"></div>
                
                <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                  <span className="bg-black/60 backdrop-blur-md text-text-primary font-mono text-[10px] px-2 py-1 rounded border border-white/10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-precision animate-pulse"></span>
                    AI Core: Active
                  </span>
                  <span className="bg-mint-precision/10 backdrop-blur-md text-mint-precision font-mono text-[10px] px-2 py-1 rounded border border-mint-precision/30">
                    Rendering Frames...
                  </span>
                </div>
              </div>

              <div className="h-16 pt-2 flex items-center justify-between gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="w-full bg-white/5 h-1.5 rounded-full relative overflow-hidden">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-text-secondary rounded-full"
                      animate={{ width: ["10%", "100%", "100%"] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full relative overflow-hidden">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-mint-precision rounded-full shadow-[0_0_8px_rgba(0,255,171,0.5)]"
                      animate={{ width: ["0%", "95%", "95%"] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </div>
                <button className="bg-white/5 border border-white/10 text-text-secondary px-3 py-1.5 rounded-sm text-xs font-mono hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 group">
                  <Download className="w-3 h-3 group-hover:text-mint-precision transition-colors" />
                  Exportar video
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features Bento */}
        <section className="py-12">
          <div className="text-center mb-12 relative z-10">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-text-primary mb-4 tracking-tight">Beneficios Clave</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "De dÃ­as a minutos", desc: "Ahorra valioso tiempo. Lo que antes tardaba semanas de trabajo, ahora estÃ¡ listo sÃºper rÃ¡pido con algunos prompts.", icon: Zap },
              { title: "EdiciÃ³n hÃ­brida", desc: "Crea y edita animaciones simplemente describiÃ©ndolas con prompts. Ajusta colores, tiempos o cualquier detalle manualmente si lo prefieres.", icon: Edit3 },
              { title: "Exporta donde quieras", desc: "Descarga tu video en alta calidad listo para compartir en tus redes, o llÃ©valo a tu editor favorito.", icon: Download }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="bg-surface-panel/40 backdrop-blur-sm border border-border-tech rounded-xl p-8 hover:bg-surface-panel/60 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:border-mint-precision/40 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-mint-precision/40 group-hover:bg-mint-precision/10 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-text-secondary group-hover:text-mint-precision transition-colors duration-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-xl text-text-primary mb-3 font-semibold group-hover:text-mint-precision transition-colors duration-300">{feature.title}</h3>
                  <p className="font-body text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Pipeline Bento Grid - Ultra Creative */}
        <section className="py-16 max-w-6xl mx-auto relative">
          <div className="text-center mb-20 relative z-10">
            <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mb-6 tracking-tight">CÃ³mo Funciona</h2>
            <p className="font-body text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Solo necesitas una idea. Nuestra IA se encarga de convertirla en una animaciÃ³n fluida en 4 pasos muy simples que cualquier persona puede seguir.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {/* Step 1: Input (1 column) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-surface-panel/40 backdrop-blur-sm border border-border-tech rounded-2xl p-8 relative overflow-hidden group hover:border-mint-precision/50 transition-colors col-span-1 shadow-2xl flex flex-col justify-between"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-mint-precision/10 blur-[50px] rounded-full group-hover:bg-mint-precision/20 transition-all duration-700 pointer-events-none"></div>
              
              <div className="h-32 mb-8 bg-[#0b101a] rounded-lg border border-border-tech p-4 relative font-mono text-[10px] text-text-secondary flex flex-col justify-center overflow-hidden">
                 <div className="flex gap-1 absolute top-3 left-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-border-tech"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-border-tech"></div>
                 </div>
                 <div className="mt-4">
                   <span className="text-mint-precision">{"{"}</span><br/>
                   <span className="pl-4">"scene": "intro",</span><br/>
                   <span className="pl-4 text-white">"voice": "es_neural",</span><br/>
                   <span className="pl-4">"sync": true</span><br/>
                   <span className="text-mint-precision">{"}"}</span>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0b101a] to-transparent"></div>
              </div>

              <div>
                <div className="text-mint-precision font-mono text-xs mb-3 font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-mint-precision animate-pulse"></span> Paso 1
                </div>
                <h3 className="font-display font-bold text-2xl text-text-primary mb-3">Guion, Voz y FragmentaciÃ³n</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">La IA genera el guion desde tu informaciÃ³n, crea el audio con voz y lo divide en fragmentos exactos. Si ya tienes guion o audio, adaptamos el proceso automÃ¡ticamente.</p>
              </div>
            </motion.div>

            {/* Step 2: Generation Engine (2 columns) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="bg-surface-panel/40 backdrop-blur-sm border border-border-tech rounded-2xl p-8 relative overflow-hidden group hover:border-mint-precision/50 transition-colors col-span-1 md:col-span-2 flex flex-col md:flex-row gap-10 items-center shadow-2xl"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,171,0.03),transparent_70%)] pointer-events-none"></div>
              
              <div className="flex-1 z-10 order-2 md:order-1">
                <div className="text-mint-precision font-mono text-xs mb-3 font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-mint-precision animate-pulse"></span> Paso 2
                </div>
                <h3 className="font-display font-bold text-2xl text-text-primary mb-3">Animaciones SVG con JSON</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">Para cada fragmento de tu video, nuestro motor crea instantÃ¡neamente animaciones vectoriales (SVG) de alta calidad, estructuradas a travÃ©s de JSON.</p>
              </div>

              <div className="w-full md:w-1/2 h-48 bg-[#0b101a] rounded-xl border border-border-tech relative overflow-hidden flex items-center justify-center order-1 md:order-2">
                <div className="absolute inset-0 bg-grid opacity-30 mix-blend-screen scale-150"></div>
                {/* Core Orb */}
                <div className="w-20 h-20 bg-mint-precision/20 rounded-full shadow-[0_0_50px_rgba(0,255,171,0.4)] relative z-10 flex items-center justify-center border border-mint-precision/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-700">
                  <div className="w-10 h-10 bg-mint-precision rounded-full shadow-[0_0_20px_rgba(0,255,171,1)]"></div>
                </div>
                {/* Scanning line */}
                <motion.div 
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 bottom-0 w-[1px] bg-white/40 shadow-[0_0_15px_white] z-20"
                ></motion.div>
              </div>
            </motion.div>

            {/* Step 3: Node Graph (2 columns) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="bg-surface-panel/40 backdrop-blur-sm border border-border-tech rounded-2xl p-8 relative overflow-hidden group hover:border-cadmium-orange/50 transition-colors col-span-1 md:col-span-2 flex flex-col md:flex-row-reverse gap-10 items-center shadow-2xl"
            >
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-cadmium-orange/5 blur-[80px] rounded-full group-hover:bg-cadmium-orange/10 transition-all duration-700 pointer-events-none"></div>

              <div className="flex-1 z-10 text-left md:text-right">
                <div className="text-cadmium-orange font-mono text-xs mb-3 font-bold uppercase tracking-widest flex items-center justify-start md:justify-end gap-2">
                  <span className="w-2 h-2 rounded-full bg-cadmium-orange animate-pulse"></span> Paso 3
                </div>
                <h3 className="font-display font-bold text-2xl text-text-primary mb-3">EdiciÃ³n Visual y por Prompts</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">Toma el control total. Edita detalles de forma manual en la interfaz visual, o utiliza simples prompts para modificar fÃ¡cilmente las animaciones generadas.</p>
              </div>

              <div className="w-full md:w-1/2 h-48 bg-[#0b101a] rounded-xl border border-border-tech relative p-6 flex flex-col justify-center">
                {/* Abstract SVG Nodes Flow */}
                <div className="relative w-full h-full flex items-center justify-between">
                  <div className="w-24 h-16 bg-surface-panel border border-border-tech rounded shadow-xl flex flex-col justify-center items-center z-10 relative group-hover:border-white/20 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-mint-precision absolute -right-1 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(0,255,171,0.8)]"></div>
                    <span className="font-mono text-[9px] text-text-secondary uppercase tracking-widest">Source</span>
                  </div>
                  
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    <path d="M 96 48 C 140 48, 140 20, 200 20" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                    <circle r="3" fill="#00FFAB">
                      <animateMotion dur="2s" repeatCount="indefinite" path="M 96 48 C 140 48, 140 20, 200 20" />
                    </circle>
                  </svg>

                  <div className="w-24 h-16 bg-surface-panel border border-cadmium-orange/40 rounded shadow-xl flex flex-col justify-center items-center z-10 relative -mt-16 group-hover:border-cadmium-orange transition-colors">
                    <div className="w-2 h-2 rounded-full bg-cadmium-orange absolute -left-1 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(255,140,0,0.8)]"></div>
                    <span className="font-mono text-[9px] text-cadmium-orange uppercase tracking-widest">Transform</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 4: Export (1 column) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="bg-surface-panel/40 backdrop-blur-sm border border-border-tech rounded-2xl p-8 relative overflow-hidden group hover:border-mint-precision/50 transition-colors col-span-1 shadow-2xl flex flex-col justify-between"
            >
              <div className="h-48 md:h-auto md:flex-1 mb-8 bg-[#0b101a] rounded-lg border border-border-tech p-6 relative flex flex-col justify-end overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-mint-precision"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-end mb-3">
                    <span className="font-mono text-[10px] text-text-secondary tracking-widest">render_v1.mp4</span>
                    <span className="font-mono text-[10px] text-mint-precision">100%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-panel rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ width: ["0%", "100%", "100%"] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="h-full bg-mint-precision rounded-full shadow-[0_0_10px_rgba(0,255,171,0.5)]"
                    ></motion.div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-mint-precision font-mono text-xs mb-3 font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-mint-precision animate-pulse"></span> Paso 4
                </div>
                <h3 className="font-display font-bold text-2xl text-text-primary mb-3">ExportaciÃ³n Multiformato</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">Descarga en MP4 o formato editable. Puedes adaptar tus videos de 16:9 a 9:16 al instante con nuevos hooks y fragmentos perfectos para Reels y TikTok.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Waitlist Form */}
        <section id="waitlist-form" className="py-10 relative max-w-5xl mx-auto">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-mint-precision/5 blur-[120px] rounded-full pointer-events-none"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-surface-panel/40 border border-border-tech rounded-2xl p-0 backdrop-blur-md relative overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            {/* Left side: Information */}
            <div className="flex-1 p-10 md:p-14 bg-deep-slate/50 border-b md:border-b-0 md:border-r border-border-tech/50 flex flex-col justify-center items-center md:items-start text-center md:text-left">
              <div className="w-12 h-12 bg-mint-precision/10 border border-mint-precision/20 rounded-xl flex items-center justify-center mb-6">
                <span className="text-mint-precision font-mono text-xl">{'{}'}</span>
              </div>
              <h2 className="font-display font-bold text-3xl md:text-4xl text-text-primary mb-4">Ãšnete a la Beta Gratis</h2>
              <p className="font-body text-base text-text-secondary mb-8 leading-relaxed">
                Empieza a crear videos animados de alta calidad sin complicaciones. Ãšnete ahora y transforma tu proceso creativo.
              </p>
              
              <ul className="space-y-4 font-body text-sm text-text-secondary w-full max-w-sm">
                <li className="flex items-center justify-center md:justify-start gap-3 text-left">
                  <span className="w-5 h-5 rounded-full bg-mint-precision/10 flex items-center justify-center text-mint-precision shrink-0">âœ“</span>
                  <span>Perfecto para creadores de contenido y YouTubers</span>
                </li>
                <li className="flex items-center justify-center md:justify-start gap-3 text-left">
                  <span className="w-5 h-5 rounded-full bg-mint-precision/10 flex items-center justify-center text-mint-precision shrink-0">âœ“</span>
                  <span>Ideal para diseÃ±adores, freelancers y marketers</span>
                </li>
                <li className="flex items-center justify-center md:justify-start gap-3 text-left">
                  <span className="w-5 h-5 rounded-full bg-mint-precision/10 flex items-center justify-center text-mint-precision shrink-0">âœ“</span>
                  <span>Acceso completo al editor visual sin costo</span>
                </li>
              </ul>
            </div>

            {/* Right side: Form */}
            <div className="flex-1 p-10 md:p-14 flex flex-col justify-center relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-mint-precision/50 to-transparent"></div>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block font-mono text-[11px] text-text-secondary uppercase tracking-widest font-semibold">Tu Nombre</label>
                  <input 
                    className="w-full bg-[#0b101a] border border-border-tech/80 rounded-md px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-mint-precision focus:ring-1 focus:ring-mint-precision transition-all placeholder:text-text-secondary/40 disabled:opacity-50" 
                    placeholder="Jane Doe" 
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    disabled={status === 'submitting'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-mono text-[11px] text-text-secondary uppercase tracking-widest font-semibold">Tu Email</label>
                  <input 
                    className="w-full bg-[#0b101a] border border-border-tech/80 rounded-md px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-mint-precision focus:ring-1 focus:ring-mint-precision transition-all placeholder:text-text-secondary/40 disabled:opacity-50" 
                    placeholder="tucorreo@ejemplo.com" 
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={status === 'submitting'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-mono text-[11px] text-text-secondary uppercase tracking-widest font-semibold">TelÃ©fono (Opciónal)</label>
                  <input 
                    className="w-full bg-[#0b101a] border border-border-tech/80 rounded-md px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-mint-precision focus:ring-1 focus:ring-mint-precision transition-all placeholder:text-text-secondary/40 disabled:opacity-50" 
                    placeholder="+51 900 000 000" 
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    disabled={status === 'submitting'}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block font-mono text-[11px] text-text-secondary uppercase tracking-widest font-semibold">Â¿QuÃ© tipo de contenido creas? (Opciónal)</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-[#0b101a] border border-border-tech/80 rounded-md px-4 py-3 text-text-secondary text-sm focus:outline-none focus:border-mint-precision focus:ring-1 focus:ring-mint-precision transition-all appearance-none cursor-pointer disabled:opacity-50" 
                      value={formData.rol}
                      onChange={(e) => setFormData({...formData, rol: e.target.value})}
                      disabled={status === 'submitting'}
                    >
                      <option value="" disabled>selecciónar opciÃ³n...</option>
                      <option value="youtube" className="bg-deep-slate">YouTube / Redes Sociales</option>
                      <option value="design" className="bg-deep-slate">DiseÃ±o / Freelance</option>
                      <option value="marketing" className="bg-deep-slate">Marketing / Agencia</option>
                      <option value="education" className="bg-deep-slate">EducaciÃ³n / Cursos</option>
                      <option value="other" className="bg-deep-slate">Otro</option>

                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center mt-0.5 shrink-0">
                      <input type="checkbox" className="peer appearance-none w-4 h-4 border border-border-tech rounded-sm bg-[#0b101a] checked:bg-mint-precision checked:border-mint-precision transition-all cursor-pointer disabled:opacity-50" required disabled={status === 'submitting'} />
                      <svg className="absolute w-3 h-3 text-deep-slate opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity" viewBox="0 0 14 10" fill="none"><path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="font-body text-xs text-text-secondary leading-tight">
                      Acepto la <Link to="/privacy" className="text-mint-precision hover:underline transition-all">PolÃ­tica de Privacidad</Link> y autorizo el tratamiento de mis datos.
                    </span>
                  </label>
                </div>
                
                <div className="pt-4 relative">
                  <button 
                    className="w-full relative group bg-text-primary text-deep-slate px-6 py-4 rounded-md font-bold text-sm transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed" 
                    type="submit"
                    disabled={status === 'submitting'}
                  >
                    <div className="absolute inset-0 bg-mint-precision opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {status === 'submitting' ? 'Enviando...' : 'Empieza gratis'} 
                      {status !== 'submitting' && <span className="transition-transform group-hover:translate-x-1">â†’</span>}
                    </span>
                  </button>

                  {status === 'success' && (
                    <motion.p initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="text-mint-precision text-sm mt-4 text-center font-semibold">Â¡Solicitud enviada! Te contactaremos pronto.</motion.p>
                  )}
                  {status === 'error' && (
                    <motion.p initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="text-red-500 text-sm mt-4 text-center font-semibold">Error de red. Intenta nuevamente.</motion.p>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-4 md:px-8 flex flex-col justify-center items-center gap-4 max-w-7xl mx-auto border-t border-border-tech bg-transparent mt-auto relative z-10">
        <div className="flex gap-6 md:gap-8 flex-wrap justify-center">
          <Link to="/privacy" className="font-body text-xs text-text-secondary hover:text-text-primary transition-colors duration-200">Privacy Policy</Link>
          <Link to="/terms" className="font-body text-xs text-text-secondary hover:text-text-primary transition-colors duration-200">Terms of Service</Link>
        </div>
      </footer>
    </div>
    </>
  );
}

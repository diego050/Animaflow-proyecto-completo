import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <div className="bg-deep-slate text-text-secondary font-body min-h-screen relative selection:bg-mint-precision selection:text-deep-slate">
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-16 max-w-7xl mx-auto left-1/2 -translate-x-1/2 border-b border-border-tech bg-deep-slate/80 backdrop-blur-md">
        <Link to="/" className="text-text-primary font-display font-bold text-2xl tracking-tight hover:text-mint-precision transition-colors">AnimaFlow</Link>
        <Link to="/" className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">← Volver al Inicio</Link>
      </nav>
      <main className="pt-32 pb-24 px-4 md:px-8 max-w-3xl mx-auto relative z-10">
        <h1 className="font-display font-bold text-4xl md:text-5xl text-text-primary mb-8 tracking-tight">Términos de Servicio</h1>
        <div className="space-y-8 text-base leading-relaxed text-text-secondary/90">
          <p className="text-sm font-mono text-text-secondary/60 uppercase tracking-widest border-b border-border-tech pb-4">Última actualización: Mayo 2026</p>
          
          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">1. Aceptación de los Términos</h2>
            <p>Al acceder, solicitar acceso a la Beta, o utilizar la infraestructura de AnimaFlow, usted (o la entidad corporativa a la que representa) acepta estar legalmente sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte, no podrá utilizar nuestro motor determinista.</p>
          </section>

          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">2. Licencia de Uso (Fase Beta)</h2>
            <p>Durante la Beta Privada, se le concede una licencia limitada, revocable, no exclusiva e intransferible para acceder a nuestro Motor SD-XL Core, interfaz gráfica de nodos y herramientas de sincronización frame-accurate.</p>
            <p className="mt-4">Queda estrictamente prohibida la ingeniería inversa de nuestro pipeline de generación o la distribución no autorizada de los binarios locales.</p>
          </section>

          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">3. Propiedad Intelectual Total</h2>
            <p>Creemos en el control creativo absoluto:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Usted retiene el 100% de los derechos comerciales</strong> sobre cualquier video, animación o fotograma generado en nuestra plataforma.</li>
              <li>Los proyectos empaquetados y archivos exportados (.mp4, .aep) son de su entera propiedad. AnimaFlow no reclama ningún derecho de autor sobre sus creaciones de salida.</li>
            </ul>
          </section>

          <section className="mt-12 pt-8 border-t border-border-tech text-sm text-center">
            <p>Para consultas legales adicionales, escriba a <a href="mailto:legal@animaflow.io" className="text-mint-precision hover:underline">legal@animaflow.io</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}

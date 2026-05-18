import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="bg-deep-slate text-text-secondary font-body min-h-screen relative selection:bg-mint-precision selection:text-deep-slate">
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-16 max-w-7xl mx-auto left-1/2 -translate-x-1/2 border-b border-border-tech bg-deep-slate/80 backdrop-blur-md">
        <Link to="/" className="text-text-primary font-display font-bold text-2xl tracking-tight hover:text-mint-precision transition-colors">AnimaFlow</Link>
        <Link to="/" className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">← Volver al Inicio</Link>
      </nav>
      <main className="pt-32 pb-24 px-4 md:px-8 max-w-3xl mx-auto relative z-10">
        <h1 className="font-display font-bold text-4xl md:text-5xl text-text-primary mb-8 tracking-tight">Política de Privacidad</h1>
        <div className="space-y-8 text-base leading-relaxed text-text-secondary/90">
          <p className="text-sm font-mono text-text-secondary/60 uppercase tracking-widest border-b border-border-tech pb-4">Última actualización: Mayo 2026</p>
          
          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">1. Qué datos recopilamos</h2>
            <p className="mb-3">Para ofrecerte acceso a la Beta de AnimaFlow, solo te pedimos la información estrictamente necesaria:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Nombre y email:</strong> para crear tu cuenta y contactarte sobre el servicio.</li>
              <li><strong>Teléfono (opcional):</strong> solo si deseas recibir notificaciones o soporte directo.</li>
              <li><strong>Tipo de contenido (opcional):</strong> para entender mejor tu perfil y mejorar la experiencia.</li>
            </ul>
            <p className="mt-3">No recopilamos datos sensibles ni información personal más allá de lo necesario para el funcionamiento del servicio.</p>
          </section>

          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">2. Cómo usamos tus datos</h2>
            <p className="mb-3">Tus datos tienen un único propósito: ayudarte a crear contenido con AnimaFlow. En concreto:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Usamos tu email para enviarte acceso a la Beta, actualizaciones del producto y novedades relevantes.</li>
              <li><strong>Nunca vendemos, compartimos ni cedemos tus datos a terceros.</strong></li>
              <li>Utilizamos tus animaciones de forma interna para mejorar la calidad y precisión de nuestro motor de generación.</li>
              <li>La información técnica que recopilamos (como rendimiento de exportación) es anónima y solo nos sirve para mejorar el producto.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">3. Tus derechos</h2>
            <p className="mb-3">Tienes control total sobre tus datos. En cualquier momento puedes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acceder</strong> a los datos que tenemos sobre ti.</li>
              <li><strong>Rectificar</strong> información incorrecta o desactualizada.</li>
              <li><strong>Eliminar</strong> tu cuenta y todos tus datos asociados.</li>
              <li><strong>Oponerte</strong> a recibir comunicaciones comerciales.</li>
            </ul>
            <p className="mt-3">Para ejercer cualquiera de estos derechos, escríbenos a <a href="mailto:privacy@animaflow.io" className="text-mint-precision hover:underline">privacy@animaflow.io</a> y te responderemos en un plazo máximo de 30 días.</p>
          </section>

          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">4. Seguridad</h2>
            <p>Protegemos tus datos con cifrado durante la transmisión y el almacenamiento. Nuestros servidores cumplen con los estándares actuales de seguridad, y limitamos el acceso a tu información únicamente al personal técnico necesario para mantener el servicio funcionando.</p>
          </section>

          <section>
            <h2 className="text-2xl text-text-primary font-display font-bold mt-8 mb-4">5. Cookies y tecnologías similares</h2>
            <p>AnimaFlow utiliza cookies estrictamente necesarias para el funcionamiento del servicio (como mantener tu sesión activa). No utilizamos cookies de rastreo ni de terceros con fines publicitarios.</p>
          </section>

          <section className="mt-12 pt-8 border-t border-border-tech text-sm text-center">
            <p>Si tienes alguna duda sobre nuestra política de privacidad, contáctanos en <a href="mailto:privacy@animaflow.io" className="text-mint-precision hover:underline">privacy@animaflow.io</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}

export function OrganizationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AnimaFlow",
    "url": "https://animaflow.com",
    "logo": "https://animaflow.com/logo.png",
    "description": "Plataforma SaaS para convertir texto en videos profesionales con IA",
    "sameAs": [
      "https://twitter.com/animaflow"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": "support@animaflow.com"
    }
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
}

export function SoftwareApplicationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AnimaFlow",
    "applicationCategory": "VideoEditor",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "featureList": [
      "Texto a video con IA",
      "Exportación MP4 + After Effects",
      "Timestamps frame-accurate",
      "Generación automática de animaciones"
    ]
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
}

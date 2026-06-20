"""Evalúa el retriever de componentes (get_relevant_components) sin adivinar.

Corre un set de prompts representativos y reporta, por prompt y en agregado:
  - Qué componentes entran al shortlist y su distribución por rol.
  - Si los componentes ESPERADOS aparecen (hit/miss), cuando se definen.
  - COBERTURA global: cuántos componentes distintos aparecen al menos una vez
    sobre el set, y CUÁLES NUNCA aparecen (candidatos a mejor descripción/tags).

Sirve para decidir qué tunear (lambda de MMR, pisos/topes, descripciones) con
datos en vez de a ojo. Ideal correrlo ANTES y DESPUÉS del re-embed para comparar.

Uso:
    cd backend
    # requiere GEMINI_API_KEY en el entorno (embebe los queries) y la DB poblada
    python scripts/eval_retriever.py
"""
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import ComponentModel
from app.services.embedding import get_relevant_components

TOP_K = 28

# Prompts representativos (texto de escena + idea visual). `expect` es opcional:
# componentes que razonablemente DEBERÍAN aparecer para esa escena.
TEST_CASES = [
    {
        "name": "finanzas-cripto",
        "text": "El bitcoin se disparó un 40% este mes rompiendo récords.",
        "media_query": "gráfico de velas de trading subiendo, dinero, cripto",
        "expect": ["StockCandlestick", "CounterNumber", "TrendLine"],
    },
    {
        "name": "datos-encuesta",
        "text": "El 73% de los usuarios prefiere videos cortos.",
        "media_query": "gráfico circular, porcentaje, estadística",
        "expect": ["StylePieChart", "PercentageRing", "CounterNumber"],
    },
    {
        "name": "cita-motivacional",
        "text": "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
        "media_query": "frase inspiradora elegante sobre fondo limpio",
        "expect": ["QuoteBlock", "StyleTextBlock", "GradientText"],
    },
    {
        "name": "lista-tips",
        "text": "3 trucos para dormir mejor: apaga pantallas, baja la luz, respira.",
        "media_query": "lista de pasos con checks e iconos",
        "expect": ["AnimatedChecklist"],
    },
    {
        "name": "redes-viral",
        "text": "Este video se volvió viral con 2 millones de likes en TikTok.",
        "media_query": "interfaz de tiktok, likes, comentarios, viral",
        "expect": ["TikTokOverlay", "FollowerCounter", "SubscribeButton"],
    },
    {
        "name": "producto-ecommerce",
        "text": "Las nuevas zapatillas ya están disponibles con 30% de descuento.",
        "media_query": "tarjeta de producto, precio, oferta de tienda",
        "expect": ["ProductCardReveal", "PromoCodeBanner", "ShoppingCartBadge"],
    },
    {
        "name": "tech-codigo",
        "text": "Así se escribe un bucle for en Python en tres líneas.",
        "media_query": "editor de código con resaltado de sintaxis",
        "expect": ["CodeBlockHighlight", "TerminalHacker"],
    },
    {
        "name": "noticia-urgente",
        "text": "Última hora: anuncian un nuevo modelo de IA que rompe todos los récords.",
        "media_query": "alerta de noticias de última hora, urgente",
        "expect": ["BreakingNewsAlert", "BreakingNewsTicker"],
    },
    {
        "name": "marca-intro",
        "text": "Bienvenido a AnimaFlow.",
        "media_query": "intro de marca con logo y nombre",
        "expect": ["LogoReveal", "StyleTextBlock"],
    },
    {
        "name": "comparacion-vs",
        "text": "iPhone contra Android: ¿cuál gana en 2026?",
        "media_query": "pantalla de versus, dos lados enfrentados",
        "expect": ["VersusScreen", "ScoreboardCounter"],
    },
    {
        "name": "podcast-invitado",
        "text": "Hoy nos acompaña la doctora Ana, experta en nutrición.",
        "media_query": "tarjeta de invitado de podcast con foto y nombre",
        "expect": ["PodcastGuestCard", "LowerThird", "StyleAvatar"],
    },
    {
        "name": "cuenta-regresiva",
        "text": "La oferta termina en 24 horas, ¡no te la pierdas!",
        "media_query": "temporizador de cuenta regresiva, urgencia",
        "expect": ["FlashSaleTimer", "CountdownTimer"],
    },
    {
        "name": "fondo-ambiental",
        "text": "La calma llega cuando dejas de buscarla.",
        "media_query": "fondo abstracto suave con movimiento sutil",
        "expect": ["FloatingBlobs", "KineticBackground", "ParticleField"],
    },
    {
        "name": "tutorial-app",
        "text": "Toca aquí, luego desliza y listo.",
        "media_query": "mockup de teléfono con cursor mostrando pasos",
        "expect": ["PhoneMockup", "StyleCursor"],
    },
    {
        "name": "ranking-top",
        "text": "Estos son los 5 países con más usuarios.",
        "media_query": "ranking de barras horizontales, top 5",
        "expect": ["HorizontalBarRace", "StyleBarRace", "StyleBarChart"],
    },
]


def role_dist(items):
    return dict(Counter(c["role"] for c in items))


def main():
    db = SessionLocal()
    try:
        active = db.query(ComponentModel).filter(ComponentModel.is_active.is_(True)).all()
        all_names = {c.name for c in active}
        total_active = len(all_names)

        seen_global = Counter()
        expect_hits = 0
        expect_total = 0

        print(f"🔎 Evaluando retriever (top_k={TOP_K}) sobre {len(TEST_CASES)} prompts.")
        print(f"   Componentes activos en DB: {total_active}\n")

        for case in TEST_CASES:
            items = get_relevant_components(
                db, case["text"], case["media_query"],
                top_k=TOP_K, seed=case["name"],
            )
            names = [c["name"] for c in items]
            seen_global.update(names)

            print(f"── {case['name']} ({len(names)} comp) — roles: {role_dist(items)}")
            print(f"   {', '.join(names)}")

            expected = case.get("expect") or []
            if expected:
                hits = [e for e in expected if e in names]
                misses = [e for e in expected if e not in names]
                expect_hits += len(hits)
                expect_total += len(expected)
                flag = "✅" if not misses else "⚠️"
                print(f"   {flag} esperados {len(hits)}/{len(expected)}"
                      + (f" — faltan: {', '.join(misses)}" if misses else ""))
            print()

        # ── Agregado
        never = sorted(all_names - set(seen_global))
        covered = total_active - len(never)
        print("=" * 60)
        print(f"COBERTURA: {covered}/{total_active} componentes aparecieron al menos una vez "
              f"({covered * 100 // max(1, total_active)}%).")
        if expect_total:
            print(f"ESPERADOS: {expect_hits}/{expect_total} hits "
                  f"({expect_hits * 100 // max(1, expect_total)}%).")
        print(f"\nNUNCA APARECEN ({len(never)}) — revisar descripción/tags/rol:")
        for n in never:
            print(f"  - {n}")

        # Top sobre-representados (posible exceso de exposición)
        print("\nMÁS FRECUENTES (top 10):")
        for name, cnt in seen_global.most_common(10):
            print(f"  {cnt:>3}×  {name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

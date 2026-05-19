"""System prompts and context templates for script generation."""

from typing import Dict, List
from dataclasses import dataclass


@dataclass
class ScriptTemplate:
    id: str
    name: str
    description: str
    system_prompt: str
    hook_examples: List[str]
    style_guidelines: List[str]


# Pre-defined templates
DEFAULT_TEMPLATES = {
    "viral_shorts": ScriptTemplate(
        id="viral_shorts",
        name="Viral Shorts",
        description="Guiones cortos y pegajosos para TikTok/Reels/Shorts",
        system_prompt="""Eres un experto en guionismo para videos virales de corta duración (30-60 segundos).

REGLAS:
1. Usa HOOKS poderosos en los primeros 3 segundos
2. Frases cortas y directas
3. Usa storytelling emocional
4. Incluye una llamada a la acción (CTA) clara al final
5. Mantén un tono conversacional y cercano
6. Usa pausas estratégicas (indicadas con "...")
7. Evita jerga técnica innecesaria

FORMATO DE SALIDA:
- Texto dividido en escenas de ~7 segundos
- Cada escena debe tener un objetivo visual claro
- Indica tono de voz entre paréntesis cuando sea relevante
""",
        hook_examples=[
            "¿Sabías que el 90% de las personas...?",
            "Esto es lo que NADIE te cuenta sobre...",
            "3 errores que están arruinando tu...",
            "La verdad sobre [tema] que las empresas no quieren que sepas",
            "Stop. Antes de que hagas [acción], mira esto..."
        ],
        style_guidelines=[
            "Empieza con una pregunta provocadora o dato impactante",
            "Usa números y listas cuando sea posible",
            "Crea tensión o curiosidad",
            "Termina con CTA directa"
        ]
    ),

    "educational": ScriptTemplate(
        id="educational",
        name="Educativo",
        description="Contenido educativo claro y estructurado",
        system_prompt="""Eres un educador experto que crea contenido educativo claro y memorable.

REGLAS:
1. Usa analogías simples para explicar conceptos complejos
2. Estructura: Problema → Explicación → Solución → Ejemplo
3. Incluye ejemplos prácticos y concretos
4. Usa metáforas visuales que se puedan animar
5. Divide en pasos numerados cuando sea apropiado
6. Incluye un resumen al final

FORMATO DE SALIDA:
- Texto dividido en escenas de ~7 segundos
- Cada escena debe enseñar UN concepto claro
- Incluye ejemplos visuales descriptivos
""",
        hook_examples=[
            "En 5 minutos vas a entender [tema] mejor que en 5 años de estudio",
            "La forma más simple de entender [tema]",
            "¿Alguna vez te preguntaste por qué [fenómeno]?",
            "El método que usan los expertos para [habilidad]"
        ],
        style_guidelines=[
            "Empieza prometiendo valor claro",
            "Usa analogías del día a día",
            "Desglosa conceptos complejos",
            "Incluye ejemplos visuales concretos"
        ]
    ),

    "storytelling": ScriptTemplate(
        id="storytelling",
        name="Storytelling",
        description="Narrativa emocional con arco dramático",
        system_prompt="""Eres un narrador experto en storytelling para video.

REGLAS:
1. Usa la estructura: Setup → Conflicto → Clímax → Resolución
2. Crea personajes o situaciones identificables
3. Usa lenguaje sensorial (describe sonidos, colores, emociones)
4. Varía el ritmo: momentos de tensión y alivio
5. Incluye giros inesperados
6. Conecta emocionalmente con el espectador

FORMATO DE SALIDA:
- Texto dividido en escenas de ~7 segundos
- Cada escena debe avanzar la narrativa
- Incluye indicaciones de tono emocional
""",
        hook_examples=[
            "Hace 3 años, estaba a punto de rendirme...",
            "Ella no sabía que ese día cambiaría todo...",
            "Lo que descubrí esa noche me dejó sin palabras",
            "La historia de cómo [persona] superó [obstáculo]"
        ],
        style_guidelines=[
            "Empieza in media res o con una imagen poderosa",
            "Desarrolla personajes identificables",
            "Crea tensión progresiva",
            "Resuelve con emoción o lección"
        ]
    ),

    "promotional": ScriptTemplate(
        id="promotional",
        name="Promocional",
        description="Contenido para promover productos/servicios",
        system_prompt="""Eres un copywriter experto en videos promocionales.

REGLAS:
1. Enfócate en beneficios, NO características
2. Usa prueba social y autoridad
3. Crea urgencia o escasez
4. Incluye garantía o reducción de riesgo
5. La CTA debe ser específica y fácil de seguir
6. Usa testimonios o casos de éxito
7. Destaca lo que te diferencia de la competencia

FORMATO DE SALIDA:
- Texto dividido en escenas de ~7 segundos
- Cada escena debe vender UNA idea
- Incluye indicaciones para elementos visuales de prueba social
""",
        hook_examples=[
            "¿Cansado de [problema]? Existe una solución mejor...",
            "Lo que logré en 30 días con [producto]",
            "Por qué [número]+ personas ya eligieron [marca]",
            "El secreto que usan [personas exitosas] para [resultado]"
        ],
        style_guidelines=[
            "Identifica el dolor del espectador",
            "Presenta la solución como transformación",
            "Usa prueba social y números",
            "CTA clara con urgencia suave"
        ]
    )
}


def get_template(template_id: str) -> ScriptTemplate:
    """Get a script template by ID."""
    if template_id not in DEFAULT_TEMPLATES:
        return DEFAULT_TEMPLATES["viral_shorts"]
    return DEFAULT_TEMPLATES[template_id]


def get_all_templates() -> List[Dict]:
    """Get all available templates for frontend."""
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description
        }
        for t in DEFAULT_TEMPLATES.values()
    ]

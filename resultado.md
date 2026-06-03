k the full candidates.content.parts accessor to get the full model response.

api-1  | 05:38:32 \[animaflow.llm] INFO: Respuesta recibida (818 chars)

api-1  | 05:38:32 \[animaflow.pipeline] INFO: Job c5d28453-2107-43c6-b1f0-d2e76b8cdd95 paused at 'segmented' status awaiting user approval

api-1  | INFO:     127.0.0.1:34802 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:55254 - "GET /api/jobs/c5d28453-2107-43c6-b1f0-d2e76b8cdd95 HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:47720 - "POST /api/jobs/c5d28453-2107-43c6-b1f0-d2e76b8cdd95/approve-scenes HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:47726 - "GET /api/jobs/c5d28453-2107-43c6-b1f0-d2e76b8cdd95 HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:47738 - "GET /api/jobs HTTP/1.1" 200 OK

api-1  | 05:38:47 \[animaflow.scheduler] INFO: Scheduler picked up job c5d28453-2107-43c6-b1f0-d2e76b8cdd95 for phase enrichment

api-1  | 05:38:47 \[animaflow.pipeline] INFO:   Scene 1/2: generating TTS...

api-1  | 05:38:47 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 05:38:50 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/980309733742.wav

api-1  | 05:38:50 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 05:38:50 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/980309733742.wav

api-1  | 05:38:50 \[animaflow.tts.whisper] INFO: Extracted 18 word timestamps

api-1  | 05:38:50 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/980309733742.wav (5.65s, 18 words)

api-1  | 05:38:50 \[animaflow.pipeline] INFO: Deciding component strategy for scene 1...

api-1  | 05:38:51 \[animaflow.embedding] ERROR: Failed to generate Gemini embedding: 429 RESOURCE\_EXHAUSTED. {'error': {'code': 429, 'message': 'Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.', 'status': 'RESOURCE\_EXHAUSTED'}}

api-1  | 05:38:51 \[animaflow.embedding] WARNING: No embedding available. Falling back to random selection.

api-1  | 05:38:51 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['GridPerspective', 'HighlightText', 'MaskedReveal', 'LoadingSpinner', 'HorizontalBarRace']

api-1  | 05:38:51 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['GridPerspective', 'HighlightText', 'MaskedReveal', 'LoadingSpinner', 'HorizontalBarRace']

api-1  | 05:38:53 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:38:53 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:38:53 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:38:57 \[animaflow.llm] INFO: Respuesta recibida (1162 chars)

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1162 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#1a1a1a", "#262626"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "RaysOfLight",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.3

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "fade-in",

api-1  |       "entryDelay": 0.2,

api-1  |       "animation": "spring",

api-1  |       "items": \[

api-1  |         {

api-1  |           "icon": "ph:dog-thin"

api-1  |         }

api-1  |       ],

api-1  |       "gap": 40,

api-1  |       "orientation": "column",

api-1  |       "deletable": false,

api-1  |       "showBadge": false,

api-1  |       "duration": 5.95

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "HighlightText",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¿Sabías que los perros evolucionaron para tener cejas que nos derriten? Por eso sus ojos grandes parecen humanos.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#fcd34d",

api-1  |       "animation": "fade-in",

api-1  |       "loop": false,

api-1  |       "duration": 5.95

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "RippleEffect",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "color": "#fcd34d",

api-1  |       "intensity": 0.2,

api-1  |       "duration": 5.95

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1162 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#1a1a1a", "#262626"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "RaysOfLight",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.3

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "fade-in",

api-1  |       "entryDelay": 0.2,

api-1  |       "animation": "spring",

api-1  |       "items": \[

api-1  |         {

api-1  |           "icon": "ph:dog-thin"

api-1  |         }

api-1  |       ],

api-1  |       "gap": 40,

api-1  |       "orientation": "column",

api-1  |       "deletable": false,

api-1  |       "showBadge": false,

api-1  |       "duration": 5.95

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "HighlightText",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¿Sabías que los perros evolucionaron para tener cejas que nos derriten? Por eso sus ojos grandes parecen humanos.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#fcd34d",

api-1  |       "animation": "fade-in",

api-1  |       "loop": false,

api-1  |       "duration": 5.95

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "RippleEffect",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "color": "#fcd34d",

api-1  |       "intensity": 0.2,

api-1  |       "duration": 5.95

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 854, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#1a1a1a', '#262626'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'RaysOfLight', 'x': 0, 'y': 0, 'opacity': 0.3}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'fade-in', 'entryDelay': 0.2, 'animation': 'spring', 'items': \[{'icon': 'ph:dog-thin'}], 'gap': 40, 'orientation': 'column', 'deletable': False, 'showBadge': False, 'duration': 5.95}, {'type': 'component', 'componentName': 'HighlightText', 'x': 0, 'y': 0, 'text': '¿Sabías que los perros evolucionaron para tener cejas que nos derriten? Por eso sus ojos grandes parecen humanos.', 'fontSize': 96, 'color': '#fcd34d', 'animation': 'fade-in', 'loop': False, 'duration': 5.95}, {'type': 'component', 'componentName': 'RippleEffect', 'x': 0, 'y': 0, 'color': '#fcd34d', 'intensity': 0.2, 'duration': 5.95}]}

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 854, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#1a1a1a', '#262626'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'RaysOfLight', 'x': 0, 'y': 0, 'opacity': 0.3}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'fade-in', 'entryDelay': 0.2, 'animation': 'spring', 'items': \[{'icon': 'ph:dog-thin'}], 'gap': 40, 'orientation': 'column', 'deletable': False, 'showBadge': False, 'duration': 5.95}, {'type': 'component', 'componentName': 'HighlightText', 'x': 0, 'y': 0, 'text': '¿Sabías que los perros evolucionaron para tener cejas que nos derriten? Por eso sus ojos grandes parecen humanos.', 'fontSize': 96, 'color': '#fcd34d', 'animation': 'fade-in', 'loop': False, 'duration': 5.95}, {'type': 'component', 'componentName': 'RippleEffect', 'x': 0, 'y': 0, 'color': '#fcd34d', 'intensity': 0.2, 'duration': 5.95}]}

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Sanitized group: converted 'items' (1) to 'children' (1)

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Sanitized group: converted 'items' (1) to 'children' (1)

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: group

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: group

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: HighlightText

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: HighlightText

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default entry 'slide-up' to layer: HighlightText

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default entry 'slide-up' to layer: HighlightText

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: RippleEffect

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: RippleEffect

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default entry 'fade-in' to layer: RippleEffect

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Added default entry 'fade-in' to layer: RippleEffect

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Smart redistributed 4 layers: 4 decorative, 0 text, 0 icons, 0 UI

api-1  | 05:38:57 \[animaflow.llm.strategy] INFO: Smart redistributed 4 layers: 4 decorative, 0 text, 0 icons, 0 UI

api-1  | 05:38:57 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 05:38:57 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 05:39:01 \[animaflow.pipeline] INFO:   Scene 2/2: generating TTS...

api-1  | 05:39:01 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 05:39:04 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/669100977220.wav

api-1  | 05:39:04 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 05:39:04 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/669100977220.wav

api-1  | INFO:     127.0.0.1:43062 - "GET /health HTTP/1.1" 200 OK

api-1  | 05:39:04 \[animaflow.tts.whisper] INFO: Extracted 15 word timestamps

api-1  | 05:39:04 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/669100977220.wav (5.17s, 15 words)

api-1  | 05:39:04 \[animaflow.pipeline] INFO: Deciding component strategy for scene 2...

api-1  | 05:39:06 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['FloatingBlobs', 'ParticleField', 'Typewriter', 'TextBubble', 'TextReveal']

api-1  | 05:39:06 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['FloatingBlobs', 'ParticleField', 'Typewriter', 'TextBubble', 'TextReveal']

api-1  | 05:39:10 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:39:10 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:39:10 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:39:13 \[animaflow.llm] INFO: Respuesta recibida (1299 chars)

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1299 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#1a1a1a", "#262626"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "id": "bg-bokeh",

api-1  |       "type": "component",

api-1  |       "componentName": "ParticleField",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.4

api-1  |     },

api-1  |     {

api-1  |       "id": "main-text",

api-1  |       "type": "component",

api-1  |       "componentName": "Typewriter",

api-1  |       "x": 0,

api-1  |       "y": -100,

api-1  |       "text": "Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#fcd34d",

api-1  |       "animation": "fade-in",

api-1  |       "duration": 5.47

api-1  |     },

api-1  |     {

api-1  |       "id": "cta-badge",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleBadge",

api-1  |       "x": 0,

api-1  |       "y": 300,

api-1  |       "text": "¡Comenta abajo!",

api-1  |       "variant": "warning",

api-1  |       "size": "lg",

api-1  |       "iconPosition": "right",

api-1  |       "showBadge": true,

api-1  |       "badgeText": "💬",

api-1  |       "duration": 5.47

api-1  |     },

api-1  |     {

api-1  |       "id": "exit-layer-1",

api-1  |       "type": "component",

api-1  |       "componentName": "Typewriter",

api-1  |       "x": 0,

api-1  |       "y": -100,

api-1  |       "text": "Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#fcd34d",

api-1  |       "animation": "fade-in",

api-1  |       "duration": 5.47

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1299 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#1a1a1a", "#262626"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "id": "bg-bokeh",

api-1  |       "type": "component",

api-1  |       "componentName": "ParticleField",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.4

api-1  |     },

api-1  |     {

api-1  |       "id": "main-text",

api-1  |       "type": "component",

api-1  |       "componentName": "Typewriter",

api-1  |       "x": 0,

api-1  |       "y": -100,

api-1  |       "text": "Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#fcd34d",

api-1  |       "animation": "fade-in",

api-1  |       "duration": 5.47

api-1  |     },

api-1  |     {

api-1  |       "id": "cta-badge",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleBadge",

api-1  |       "x": 0,

api-1  |       "y": 300,

api-1  |       "text": "¡Comenta abajo!",

api-1  |       "variant": "warning",

api-1  |       "size": "lg",

api-1  |       "iconPosition": "right",

api-1  |       "showBadge": true,

api-1  |       "badgeText": "💬",

api-1  |       "duration": 5.47

api-1  |     },

api-1  |     {

api-1  |       "id": "exit-layer-1",

api-1  |       "type": "component",

api-1  |       "componentName": "Typewriter",

api-1  |       "x": 0,

api-1  |       "y": -100,

api-1  |       "text": "Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#fcd34d",

api-1  |       "animation": "fade-in",

api-1  |       "duration": 5.47

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 1003, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#1a1a1a', '#262626'], 'angle': 180}, 'layers': \[{'id': 'bg-bokeh', 'type': 'component', 'componentName': 'ParticleField', 'x': 0, 'y': 0, 'opacity': 0.4}, {'id': 'main-text', 'type': 'component', 'componentName': 'Typewriter', 'x': 0, 'y': -100, 'text': 'Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.', 'fontSize': 96, 'color': '#fcd34d', 'animation': 'fade-in', 'duration': 5.47}, {'id': 'cta-badge', 'type': 'component', 'componentName': 'StyleBadge', 'x': 0, 'y': 300, 'text': '¡Comenta abajo!', 'variant': 'warning', 'size': 'lg', 'iconPosition': 'right', 'showBadge': True, 'badgeText': '💬', 'duration': 5.47}, {'id': 'exit-layer-1', 'type': 'component', 'componentName': 'Typewriter', 'x': 0, 'y': -100, 'text': 'Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.', 'fontSize': 96, 'color': '#fcd34d', 'animation': 'fade-in', 'duration': 5.47}]}

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 1003, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#1a1a1a', '#262626'], 'angle': 180}, 'layers': \[{'id': 'bg-bokeh', 'type': 'component', 'componentName': 'ParticleField', 'x': 0, 'y': 0, 'opacity': 0.4}, {'id': 'main-text', 'type': 'component', 'componentName': 'Typewriter', 'x': 0, 'y': -100, 'text': 'Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.', 'fontSize': 96, 'color': '#fcd34d', 'animation': 'fade-in', 'duration': 5.47}, {'id': 'cta-badge', 'type': 'component', 'componentName': 'StyleBadge', 'x': 0, 'y': 300, 'text': '¡Comenta abajo!', 'variant': 'warning', 'size': 'lg', 'iconPosition': 'right', 'showBadge': True, 'badgeText': '💬', 'duration': 5.47}, {'id': 'exit-layer-1', 'type': 'component', 'componentName': 'Typewriter', 'x': 0, 'y': -100, 'text': 'Es pura biología para conquistarte. ¿Cuál es la raza más tierna para ti? Comenta abajo.', 'fontSize': 96, 'color': '#fcd34d', 'animation': 'fade-in', 'duration': 5.47}]}

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Removing duplicate text layer \[3]: 'Es pura biología para conquistarte. ¿Cuál es la ra...'

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Removing duplicate text layer \[3]: 'Es pura biología para conquistarte. ¿Cuál es la ra...'

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Removed 1 garbage props from Typewriter: \['duration']

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Removed 1 garbage props from Typewriter: \['duration']

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Assigned default width 918 for Typewriter (canvas: 1080px)

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Assigned default width 918 for Typewriter (canvas: 1080px)

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: Typewriter

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: Typewriter

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default entry 'slide-up' to layer: Typewriter

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default entry 'slide-up' to layer: Typewriter

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: StyleBadge

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: StyleBadge

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default entry 'scale-in' to layer: StyleBadge

api-1  | 05:39:13 \[animaflow.llm.strategy] INFO: Added default entry 'scale-in' to layer: StyleBadge

api-1  | 05:39:13 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 05:39:13 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | INFO:     172.16.2.5:43904 - "GET /api/jobs/c5d28453-2107-43c6-b1f0-d2e76b8cdd95 HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:43918 - "GET /api/audio/c5d28453-2107-43c6-b1f0-d2e76b8cdd95\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5L


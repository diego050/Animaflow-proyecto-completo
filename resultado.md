pi-1  | 04:59:50 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 04:59:51 \[animaflow.llm] INFO: Respuesta recibida (233 chars)

api-1  | 04:59:51 \[animaflow.llm] WARNING: Script length mismatch: estimated 20.3s, target 15s. Regenerating...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 04:59:51 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 04:59:52 \[animaflow.llm] INFO: Respuesta recibida (222 chars)

api-1  | 04:59:52 \[animaflow.llm] INFO: Retry result: 15.2s (target: 15s)

api-1  | INFO:     172.16.2.5:60606 - "POST /api/jobs/generate-script HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:50268 - "POST /api/jobs/ HTTP/1.1" 201 Created

api-1  | 04:59:58 \[animaflow.scheduler] INFO: Scheduler picked up job ca35bdfc-180d-41e9-8250-1ccda55ae686 for phase segmentation

api-1  | 04:59:59 \[animaflow.pipeline] INFO: Text split into 3 chunks for job ca35bdfc-180d-41e9-8250-1ccda55ae686

api-1  | 04:59:59 \[animaflow.pipeline] INFO: Generating batch visual prompts for 3 scenes...

api-1  | 04:59:59 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | INFO:     172.16.2.5:50278 - "GET /api/jobs HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:50290 - "GET /api/jobs/ca35bdfc-180d-41e9-8250-1ccda55ae686 HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:50292 - "GET /api/jobs/ca35bdfc-180d-41e9-8250-1ccda55ae686/formats HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:50306 - "GET /api/jobs/ca35bdfc-180d-41e9-8250-1ccda55ae686/stream?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 200 OK

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:00:00 \[animaflow.llm] INFO: Respuesta recibida (1171 chars)

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:00:00 \[animaflow.pipeline] INFO: Job ca35bdfc-180d-41e9-8250-1ccda55ae686 paused at 'segmented' status awaiting user approval

api-1  | INFO:     172.16.2.5:50310 - "GET /api/jobs/ca35bdfc-180d-41e9-8250-1ccda55ae686 HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:50322 - "POST /api/jobs/ca35bdfc-180d-41e9-8250-1ccda55ae686/approve-scenes HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:50326 - "GET /api/jobs/ca35bdfc-180d-41e9-8250-1ccda55ae686 HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:50328 - "GET /api/jobs HTTP/1.1" 200 OK

api-1  | 05:00:10 \[animaflow.scheduler] INFO: Scheduler picked up job ca35bdfc-180d-41e9-8250-1ccda55ae686 for phase enrichment

api-1  | 05:00:11 \[animaflow.pipeline] INFO:   Scene 1/3: generating TTS...

api-1  | 05:00:11 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 05:00:14 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/156596037561.wav

api-1  | 05:00:14 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 05:00:14 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/156596037561.wav

api-1  | 05:00:14 \[animaflow.tts.whisper] INFO: Extracted 11 word timestamps

api-1  | 05:00:14 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/156596037561.wav (3.50s, 11 words)

api-1  | 05:00:14 \[animaflow.pipeline] INFO: Deciding component strategy for scene 1...

api-1  | 05:00:16 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['GridPerspective', 'ParticleField', 'TextBubble', 'TextReveal', 'Typewriter']

api-1  | 05:00:16 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['GridPerspective', 'ParticleField', 'TextBubble', 'TextReveal', 'Typewriter']

api-1  | 05:00:18 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:00:18 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:00:18 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | INFO:     127.0.0.1:41380 - "GET /health HTTP/1.1" 200 OK

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:00:22 \[animaflow.llm] INFO: Respuesta recibida (993 chars)

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (993 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#121212", "#1a1a1a"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "id": "dog-icon",

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": -250,

api-1  |       "icon": "mdi:dog",

api-1  |       "size": "120",

api-1  |       "fillArea": true,

api-1  |       "showBadge": false,

api-1  |       "badgeText": "",

api-1  |       "duration": 0.8

api-1  |     },

api-1  |     {

api-1  |       "id": "main-text",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 50,

api-1  |       "text": "¿Crees que tu perro es solo una cara bonita? Te equivocas.",

api-1  |       "variant": "heading",

api-1  |       "size": "lg",

api-1  |       "fillArea": false,

api-1  |       "showBadge": false,

api-1  |       "badgeText": "",

api-1  |       "duration": 2.5

api-1  |     },

api-1  |     {

api-1  |       "id": "accent-line",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleDivider",

api-1  |       "x": 0,

api-1  |       "y": 250,

api-1  |       "orientation": "horizontal",

api-1  |       "thickness": 4,

api-1  |       "duration": 1.0

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (993 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#121212", "#1a1a1a"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "id": "dog-icon",

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": -250,

api-1  |       "icon": "mdi:dog",

api-1  |       "size": "120",

api-1  |       "fillArea": true,

api-1  |       "showBadge": false,

api-1  |       "badgeText": "",

api-1  |       "duration": 0.8

api-1  |     },

api-1  |     {

api-1  |       "id": "main-text",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 50,

api-1  |       "text": "¿Crees que tu perro es solo una cara bonita? Te equivocas.",

api-1  |       "variant": "heading",

api-1  |       "size": "lg",

api-1  |       "fillArea": false,

api-1  |       "showBadge": false,

api-1  |       "badgeText": "",

api-1  |       "duration": 2.5

api-1  |     },

api-1  |     {

api-1  |       "id": "accent-line",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleDivider",

api-1  |       "x": 0,

api-1  |       "y": 250,

api-1  |       "orientation": "horizontal",

api-1  |       "thickness": 4,

api-1  |       "duration": 1.0

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 749, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#121212', '#1a1a1a'], 'angle': 180}, 'layers': \[{'id': 'dog-icon', 'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': -250, 'icon': 'mdi:dog', 'size': '120', 'fillArea': True, 'showBadge': False, 'badgeText': '', 'duration': 0.8}, {'id': 'main-text', 'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 50, 'text': '¿Crees que tu perro es solo una cara bonita? Te equivocas.', 'variant': 'heading', 'size': 'lg', 'fillArea': False, 'showBadge': False, 'badgeText': '', 'duration': 2.5}, {'id': 'accent-line', 'type': 'component', 'componentName': 'StyleDivider', 'x': 0, 'y': 250, 'orientation': 'horizontal', 'thickness': 4, 'duration': 1.0}]}

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 749, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#121212', '#1a1a1a'], 'angle': 180}, 'layers': \[{'id': 'dog-icon', 'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': -250, 'icon': 'mdi:dog', 'size': '120', 'fillArea': True, 'showBadge': False, 'badgeText': '', 'duration': 0.8}, {'id': 'main-text', 'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 50, 'text': '¿Crees que tu perro es solo una cara bonita? Te equivocas.', 'variant': 'heading', 'size': 'lg', 'fillArea': False, 'showBadge': False, 'badgeText': '', 'duration': 2.5}, {'id': 'accent-line', 'type': 'component', 'componentName': 'StyleDivider', 'x': 0, 'y': 250, 'orientation': 'horizontal', 'thickness': 4, 'duration': 1.0}]}

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Removed 4 garbage props from StyleTextBlock: \['duration', 'showBadge', 'badgeText', 'fillArea']

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Removed 4 garbage props from StyleTextBlock: \['duration', 'showBadge', 'badgeText', 'fillArea']

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Assigned default width 120 for IconifyIcon (canvas: 1080px)

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Assigned default width 120 for IconifyIcon (canvas: 1080px)

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Assigned default width 918 for StyleTextBlock (canvas: 1080px)

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Assigned default width 918 for StyleTextBlock (canvas: 1080px)

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: IconifyIcon

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: IconifyIcon

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: StyleTextBlock

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: StyleTextBlock

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: StyleDivider

api-1  | 05:00:22 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: StyleDivider

api-1  | 05:00:22 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 05:00:22 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 05:00:26 \[animaflow.pipeline] INFO:   Scene 2/3: generating TTS...

api-1  | 05:00:26 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 05:00:30 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/135368075686.wav

api-1  | 05:00:30 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 05:00:30 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/135368075686.wav

api-1  | 05:00:31 \[animaflow.tts.whisper] INFO: Extracted 18 word timestamps

api-1  | 05:00:31 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/135368075686.wav (7.57s, 18 words)

api-1  | 05:00:31 \[animaflow.pipeline] INFO: Deciding component strategy for scene 2...

api-1  | 05:00:31 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['FloatingBlobs', 'ParticleField', 'Typewriter', 'TextBubble', 'TextReveal']

api-1  | 05:00:31 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['FloatingBlobs', 'ParticleField', 'Typewriter', 'TextBubble', 'TextReveal']

api-1  | 05:00:32 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:00:32 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:00:32 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:00:36 \[animaflow.llm] INFO: Respuesta recibida (1311 chars)

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1311 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#0f172a", "#1e1b4b"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "FloatingBlobs",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.4,

api-1  |       "colors": \["#38bdf8", "#0f172a"]

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "NetworkNodes",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.3,

api-1  |       "color": "#38bdf8",

api-1  |       "speed": 0.5,

api-1  |       "animation": "fade-in",

api-1  |       "duration": 7.87

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "fade-in",

api-1  |       "entryDelay": 0.5,

api-1  |       "animation": "fade-out",

api-1  |       "duration": 7.87

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "Typewriter",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "Esos ojos grandes están diseñados científicamente para manipular tus sentimientos. Al mirarlos, liberas oxitocina... el químico del amor.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#38bdf8",

api-1  |       "speed": 2,

api-1  |       "animation": "fade-in",

api-1  |       "duration": 7.87

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": -300,

api-1  |       "icon": "mdi:eye-outline",

api-1  |       "size": 

api-1  |       "120",

api-1  |       "fillArea": true,

api-1  |       "duration": 7.87

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1311 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#0f172a", "#1e1b4b"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "FloatingBlobs",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.4,

api-1  |       "colors": \["#38bdf8", "#0f172a"]

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "NetworkNodes",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.3,

api-1  |       "color": "#38bdf8",

api-1  |       "speed": 0.5,

api-1  |       "animation": "fade-in",

api-1  |       "duration": 7.87

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "fade-in",

api-1  |       "entryDelay": 0.5,

api-1  |       "animation": "fade-out",

api-1  |       "duration": 7.87

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "Typewriter",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "Esos ojos grandes están diseñados científicamente para manipular tus sentimientos. Al mirarlos, liberas oxitocina... el químico del amor.",

api-1  |       "fontSize": 96,

api-1  |       "color": "#38bdf8",

api-1  |       "speed": 2,

api-1  |       "animation": "fade-in",

api-1  |       "duration": 7.87

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": -300,

api-1  |       "icon": "mdi:eye-outline",

api-1  |       "size": 

api-1  |       "120",

api-1  |       "fillArea": true,

api-1  |       "duration": 7.87

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 986, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#0f172a', '#1e1b4b'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'FloatingBlobs', 'x': 0, 'y': 0, 'opacity': 0.4, 'colors': \['#38bdf8', '#0f172a']}, {'type': 'component', 'componentName': 'NetworkNodes', 'x': 0, 'y': 0, 'opacity': 0.3, 'color': '#38bdf8', 'speed': 0.5, 'animation': 'fade-in', 'duration': 7.87}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'fade-in', 'entryDelay': 0.5, 'animation': 'fade-out', 'duration': 7.87}, {'type': 'component', 'componentName': 'Typewriter', 'x': 0, 'y': 0, 'text': 'Esos ojos grandes están diseñados científicamente para manipular tus sentimientos. Al mirarlos, liberas oxitocina... el químico del amor.', 'fontSize': 96, 'color': '#38bdf8', 'speed': 2, 'animation': 'fade-in', 'duration': 7.87}, {'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': -300, 'icon': 'mdi:eye-outline', 'size': '120', 'fillArea': True, 'duration': 7.87}]}

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 986, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#0f172a', '#1e1b4b'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'FloatingBlobs', 'x': 0, 'y': 0, 'opacity': 0.4, 'colors': \['#38bdf8', '#0f172a']}, {'type': 'component', 'componentName': 'NetworkNodes', 'x': 0, 'y': 0, 'opacity': 0.3, 'color': '#38bdf8', 'speed': 0.5, 'animation': 'fade-in', 'duration': 7.87}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'fade-in', 'entryDelay': 0.5, 'animation': 'fade-out', 'duration': 7.87}, {'type': 'component', 'componentName': 'Typewriter', 'x': 0, 'y': 0, 'text': 'Esos ojos grandes están diseñados científicamente para manipular tus sentimientos. Al mirarlos, liberas oxitocina... el químico del amor.', 'fontSize': 96, 'color': '#38bdf8', 'speed': 2, 'animation': 'fade-in', 'duration': 7.87}, {'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': -300, 'icon': 'mdi:eye-outline', 'size': '120', 'fillArea': True, 'duration': 7.87}]}

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Removed 1 garbage props from Typewriter: \['duration']

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Removed 1 garbage props from Typewriter: \['duration']

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Auto-fit fontSize: 96 → 95 for text length 137 chars (multi-line fit: 9 lines at 918px width)

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Auto-fit fontSize: 96 → 95 for text length 137 chars (multi-line fit: 9 lines at 918px width)

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Assigned default width 918 for Typewriter (canvas: 1080px)

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Assigned default width 918 for Typewriter (canvas: 1080px)

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Assigned default width 120 for IconifyIcon (canvas: 1080px)

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Assigned default width 120 for IconifyIcon (canvas: 1080px)

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: FloatingBlobs

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: FloatingBlobs

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: NetworkNodes

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: NetworkNodes

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: Typewriter

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: Typewriter

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: IconifyIcon

api-1  | 05:00:36 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: IconifyIcon

api-1  | 05:00:36 \[animaflow.llm.spec\_validator] WARNING: Auto-fixed fontSize 95 → 28: Layer 2: text overflows (137 chars × 57px = 7809px > 918px max)

api-1  | 05:00:36 \[animaflow.llm.spec\_validator] WARNING: Auto-fixed fontSize 95 → 28: Layer 2: text overflows (137 chars × 57px = 7809px > 918px max)

api-1  | 05:00:36 \[animaflow.llm.spec\_validator] WARNING: Auto-fixed fontSize to 48: Layer 2: fontSize 28 too small for mobile video (min 48)

api-1  | 05:00:36 \[animaflow.llm.spec\_validator] WARNING: Auto-fixed fontSize to 48: Layer 2: fontSize 28 too small for mobile video (min 48)

api-1  | 05:00:36 \[animaflow.llm.spec\_validator] WARNING: Spec validation: 2 warnings for aspect\_ratio=9:16:

api-1  |   Layer 2: text overflows (137 chars × 57px = 7809px > 918px max)

api-1  |   Layer 2: fontSize 28 too small for mobile video (min 48)

api-1  | 05:00:36 \[animaflow.llm.spec\_validator] WARNING: Spec validation: 2 warnings for aspect\_ratio=9:16:

api-1  |   Layer 2: text overflows (137 chars × 57px = 7809px > 918px max)

api-1  |   Layer 2: fontSize 28 too small for mobile video (min 48)

api-1  | 05:00:40 \[animaflow.pipeline] INFO:   Scene 3/3: generating TTS...

api-1  | 05:00:40 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 05:00:43 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/143353293879.wav

api-1  | 05:00:43 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 05:00:43 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/143353293879.wav

api-1  | 05:00:43 \[animaflow.tts.whisper] INFO: Extracted 4 word timestamps

api-1  | 05:00:43 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/143353293879.wav (1.39s, 4 words)

api-1  | 05:00:43 \[animaflow.pipeline] INFO: Deciding component strategy for scene 3...

api-1  | 05:00:44 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['KineticBackground', 'TikTokOverlay', 'TextReveal', 'TextBubble', 'SplitScreenGrid']

api-1  | 05:00:44 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['KineticBackground', 'TikTokOverlay', 'TextReveal', 'TextBubble', 'SplitScreenGrid']

api-1  | 05:00:45 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:00:45 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 05:00:45 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 05:00:47 \[animaflow.llm] INFO: Respuesta recibida (842 chars)

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (842 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#1e1b4b", "#0f172a"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "TextReveal",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¡Sígueme para más datos!",

api-1  |       "fontSize": 110,

api-1  |       "color": "#fbbf24",

api-1  |       "animation": "spring-in",

api-1  |       "duration": 1.69

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "AnimatedIcon",

api-1  |       "x": 0,

api-1  |       "y": 250,

api-1  |       "icon": "mdi:account-plus",

api-1  |       "size": 

api-1  |       "color1",

api-1  |       "fillArea": true,

api-1  |       "duration": 1.69

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "FloatingBadge",

api-1  |       "x": 0,

api-1  |       "y": -300,

api-1  |       "text": "NUEVO CONTENIDO",

api-1  |       "entry": "slide-down",

api-1  |       "entryDelay": 0.1,

api-1  |       "duration": 1.69

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (842 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#1e1b4b", "#0f172a"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "TextReveal",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¡Sígueme para más datos!",

api-1  |       "fontSize": 110,

api-1  |       "color": "#fbbf24",

api-1  |       "animation": "spring-in",

api-1  |       "duration": 1.69

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "AnimatedIcon",

api-1  |       "x": 0,

api-1  |       "y": 250,

api-1  |       "icon": "mdi:account-plus",

api-1  |       "size": 

api-1  |       "color1",

api-1  |       "fillArea": true,

api-1  |       "duration": 1.69

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "FloatingBadge",

api-1  |       "x": 0,

api-1  |       "y": -300,

api-1  |       "text": "NUEVO CONTENIDO",

api-1  |       "entry": "slide-down",

api-1  |       "entryDelay": 0.1,

api-1  |       "duration": 1.69

api-1  |     }

api-1  |   ]

api-1  | }

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 627, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#1e1b4b', '#0f172a'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'TextReveal', 'x': 0, 'y': 0, 'text': '¡Sígueme para más datos!', 'fontSize': 110, 'color': '#fbbf24', 'animation': 'spring-in', 'duration': 1.69}, {'type': 'component', 'componentName': 'AnimatedIcon', 'x': 0, 'y': 250, 'icon': 'mdi:account-plus', 'size': 'color1', 'fillArea': True, 'duration': 1.69}, {'type': 'component', 'componentName': 'FloatingBadge', 'x': 0, 'y': -300, 'text': 'NUEVO CONTENIDO', 'entry': 'slide-down', 'entryDelay': 0.1, 'duration': 1.69}]}

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 627, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#1e1b4b', '#0f172a'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'TextReveal', 'x': 0, 'y': 0, 'text': '¡Sígueme para más datos!', 'fontSize': 110, 'color': '#fbbf24', 'animation': 'spring-in', 'duration': 1.69}, {'type': 'component', 'componentName': 'AnimatedIcon', 'x': 0, 'y': 250, 'icon': 'mdi:account-plus', 'size': 'color1', 'fillArea': True, 'duration': 1.69}, {'type': 'component', 'componentName': 'FloatingBadge', 'x': 0, 'y': -300, 'text': 'NUEVO CONTENIDO', 'entry': 'slide-down', 'entryDelay': 0.1, 'duration': 1.69}]}

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Removed 1 garbage props from TextReveal: \['duration']

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Removed 1 garbage props from TextReveal: \['duration']

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Assigned default width 918 for TextReveal (canvas: 1080px)

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Assigned default width 918 for TextReveal (canvas: 1080px)

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: TextReveal

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: TextReveal

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: AnimatedIcon

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: AnimatedIcon

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: FloatingBadge

api-1  | 05:00:47 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: FloatingBadge

api-1  | 05:00:47 \[animaflow.llm.spec\_validator] WARNING: Auto-fixed fontSize 110 → 63: Layer 0: text overflows (24 chars × 66px = 1584px > 918px max)

api-1  | 05:00:47 \[animaflow.llm.spec\_validator] WARNING: Auto-fixed fontSize 110 → 63: Layer 0: text overflows (24 chars × 66px = 1584px > 918px max)

api-1  | 05:00:47 \[animaflow.llm.spec\_validator] WARNING: Spec validation: 1 warnings for aspect\_ratio=9:16:

api-1  |   Layer 0: text overflows (24 chars × 66px = 1584px > 918px max)

api-1  | 05:00:47 \[animaflow.llm.spec\_validator] WARNING: Spec validation: 1 warnings for aspect\_ratio=9:16:

api-1  |   Layer 0: text overflows (24 chars × 66px = 1584px > 918px max)

api-1  | INFO:     127.0.0.1:36260 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:58516 - "GET /api/jobs/ca35bdfc-180d-41e9-8250-1ccda55ae686 HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:35634 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:40992 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:41008 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_2.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:41018 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     127.0.0.1:58730 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:41646 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:41656 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:52526 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:52540 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     127.0.0.1:35198 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:54974 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:49496 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_2.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:49504 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:49516 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_2.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:49530 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:49540 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:35094 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_2.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:35110 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_2.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:35122 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:35128 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:35144 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     127.0.0.1:45194 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:39428 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:47792 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_2.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     127.0.0.1:50844 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     127.0.0.1:59928 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:51542 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     172.16.2.5:51552 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_1.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content

api-1  | INFO:     127.0.0.1:53508 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     127.0.0.1:50774 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:52704 - "GET /api/audio/ca35bdfc-180d-41e9-8250-1ccda55ae686\_0.wav?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 206 Partial Content


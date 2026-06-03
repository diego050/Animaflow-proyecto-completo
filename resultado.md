1  | INFO:     127.0.0.1:40140 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     127.0.0.1:43368 - "GET /health HTTP/1.1" 200 OK

api-1  | 03:16:08 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | 03:16:09 \[animaflow.llm] INFO: Respuesta recibida (247 chars)

api-1  | 03:16:09 \[animaflow.llm] WARNING: Script length mismatch: estimated 19.4s, target 14s. Regenerating...

api-1  | 03:16:09 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 03:16:10 \[animaflow.llm] INFO: Respuesta recibida (206 chars)

api-1  | 03:16:10 \[animaflow.llm] INFO: Retry result: 17.5s (target: 14s)

api-1  | INFO:     172.16.2.5:57796 - "POST /api/jobs/generate-script HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:54678 - "POST /api/jobs/ HTTP/1.1" 201 Created

api-1  | 03:16:12 \[animaflow.scheduler] INFO: Scheduler picked up job 5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c for phase segmentation

api-1  | 03:16:12 \[animaflow.pipeline] INFO: Text split into 3 chunks for job 5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c

api-1  | 03:16:12 \[animaflow.pipeline] INFO: Generating batch visual prompts for 3 scenes...

api-1  | 03:16:12 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | INFO:     172.16.2.5:54682 - "GET /api/jobs HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:54690 - "GET /api/jobs/5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:54720 - "GET /api/jobs/5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c/formats HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:54706 - "GET /api/jobs/5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c/stream?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MzQzODgyOC00NmNhLTQ5N2UtYjRkOC1kNTBlYjdkMjViYmMiLCJleHAiOjE3ODA5MTQ0MTYsImp0aSI6IjYwODU4MGU5LTA5NTMtNDQ3My05ODNmLWIyNWFmODA0MGIyYyJ9.bju2MvwJ8REIw63jCOC-YHwLmFPIwwpsYGn0qmG9BSc HTTP/1.1" 200 OK

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 03:16:14 \[animaflow.llm] INFO: Respuesta recibida (1104 chars)

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 03:16:14 \[animaflow.pipeline] INFO: Job 5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c paused at 'segmented' status awaiting user approval

api-1  | INFO:     172.16.2.5:38500 - "GET /api/jobs/5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:38510 - "POST /api/jobs/5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c/approve-scenes HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:38514 - "GET /api/jobs/5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:38524 - "GET /api/jobs HTTP/1.1" 200 OK

api-1  | 03:16:29 \[animaflow.scheduler] INFO: Scheduler picked up job 5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c for phase enrichment

api-1  | 03:16:30 \[animaflow.pipeline] INFO:   Scene 1/3: generating TTS...

api-1  | 03:16:30 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 03:16:33 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/572388166439.wav

api-1  | 03:16:33 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 03:16:33 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/572388166439.wav

api-1  | 03:16:33 \[animaflow.tts.whisper] INFO: Extracted 16 word timestamps

api-1  | 03:16:33 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/572388166439.wav (4.30s, 16 words)

api-1  | 03:16:33 \[animaflow.pipeline] INFO: Scene 1 duration 4.60s too short for 16 words — extending to 7.67s

api-1  | 03:16:33 \[animaflow.pipeline] INFO: Deciding component strategy for scene 1...

api-1  | 03:16:36 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['FloatingBlobs', 'ParticleField', 'Typewriter', 'TextBubble', 'GlitchTitle']

api-1  | 03:16:36 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['FloatingBlobs', 'ParticleField', 'Typewriter', 'TextBubble', 'GlitchTitle']

api-1  | INFO:     127.0.0.1:41860 - "GET /health HTTP/1.1" 200 OK

api-1  | 03:16:39 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 03:16:39 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 03:16:39 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 03:16:42 \[animaflow.llm] INFO: Respuesta recibida (981 chars)

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (981 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#121212", "#0a0a0a"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "id": "bg-pulse",

api-1  |       "type": "component",

api-1  |       "componentName": "ParticleField",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.3

api-1  |     },

api-1  |     {

api-1  |       "id": "main-text",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¿Tu cuerpo se siente lento y cansado? No es la edad, es lo que estás comiendo...",

api-1  |       "variant": "heading",

api-1  |       "maxLines": 4,

api-1  |       "thickness": 100,

api-1  |       "duration": 2.5

api-1  |     },

api-1  |     {

api-1  |       "id": "icon-exhaustion",

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": 300,

api-1  |       "icon": "ion:battery-dead",

api-1  |       "size": 

api-1  |       "120",

api-1  |       "fillArea": true,

api-1  |       "loop": true,

api-1  |       "duration": 2.0

api-1  |     }

api-1  |   ],

api-1  |   "out\_transition": {

api-1  |     "type": "GlitchTransition",

api-1  |     "duration\_frames": 15

api-1  |   }

api-1  | }

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (981 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#121212", "#0a0a0a"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "id": "bg-pulse",

api-1  |       "type": "component",

api-1  |       "componentName": "ParticleField",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.3

api-1  |     },

api-1  |     {

api-1  |       "id": "main-text",

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¿Tu cuerpo se siente lento y cansado? No es la edad, es lo que estás comiendo...",

api-1  |       "variant": "heading",

api-1  |       "maxLines": 4,

api-1  |       "thickness": 100,

api-1  |       "duration": 2.5

api-1  |     },

api-1  |     {

api-1  |       "id": "icon-exhaustion",

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": 300,

api-1  |       "icon": "ion:battery-dead",

api-1  |       "size": 

api-1  |       "120",

api-1  |       "fillArea": true,

api-1  |       "loop": true,

api-1  |       "duration": 2.0

api-1  |     }

api-1  |   ],

api-1  |   "out\_transition": {

api-1  |     "type": "GlitchTransition",

api-1  |     "duration\_frames": 15

api-1  |   }

api-1  | }

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 746, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#121212', '#0a0a0a'], 'angle': 180}, 'layers': \[{'id': 'bg-pulse', 'type': 'component', 'componentName': 'ParticleField', 'x': 0, 'y': 0, 'opacity': 0.3}, {'id': 'main-text', 'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 0, 'text': '¿Tu cuerpo se siente lento y cansado? No es la edad, es lo que estás comiendo...', 'variant': 'heading', 'maxLines': 4, 'thickness': 100, 'duration': 2.5}, {'id': 'icon-exhaustion', 'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': 300, 'icon': 'ion:battery-dead', 'size': '120', 'fillArea': True, 'loop': True, 'duration': 2.0}], 'out\_transition': {'type': 'GlitchTransition', 'duration\_frames': 15}}

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 746, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#121212', '#0a0a0a'], 'angle': 180}, 'layers': \[{'id': 'bg-pulse', 'type': 'component', 'componentName': 'ParticleField', 'x': 0, 'y': 0, 'opacity': 0.3}, {'id': 'main-text', 'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 0, 'text': '¿Tu cuerpo se siente lento y cansado? No es la edad, es lo que estás comiendo...', 'variant': 'heading', 'maxLines': 4, 'thickness': 100, 'duration': 2.5}, {'id': 'icon-exhaustion', 'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': 300, 'icon': 'ion:battery-dead', 'size': '120', 'fillArea': True, 'loop': True, 'duration': 2.0}], 'out\_transition': {'type': 'GlitchTransition', 'duration\_frames': 15}}

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Removed 2 garbage props from StyleTextBlock: \['thickness', 'duration']

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Removed 2 garbage props from StyleTextBlock: \['thickness', 'duration']

api-1  | 03:16:42 \[animaflow.llm.strategy] WARNING: Unknown component 'StyleTextBlock' — marking for removal

api-1  | 03:16:42 \[animaflow.llm.strategy] WARNING: Unknown component 'StyleTextBlock' — marking for removal

api-1  | 03:16:42 \[animaflow.llm.strategy] WARNING: Unknown component 'IconifyIcon' — marking for removal

api-1  | 03:16:42 \[animaflow.llm.strategy] WARNING: Unknown component 'IconifyIcon' — marking for removal

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: ParticleField

api-1  | 03:16:42 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: ParticleField

api-1  | 03:16:42 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 03:16:42 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 03:16:46 \[animaflow.pipeline] INFO:   Scene 2/3: generating TTS...

api-1  | 03:16:46 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 03:16:48 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/522409696335.wav

api-1  | 03:16:48 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 03:16:48 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/522409696335.wav

api-1  | 03:16:48 \[animaflow.tts.whisper] INFO: Extracted 13 word timestamps

api-1  | 03:16:48 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/522409696335.wav (3.92s, 13 words)

api-1  | 03:16:48 \[animaflow.pipeline] INFO: Scene 2 duration 4.22s too short for 13 words — extending to 6.29s

api-1  | 03:16:48 \[animaflow.pipeline] INFO: Deciding component strategy for scene 2...

api-1  | 03:16:49 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['KineticBackground', 'ParticleField', 'Typewriter', 'TextReveal', 'QuoteBlock']

api-1  | 03:16:49 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['KineticBackground', 'ParticleField', 'Typewriter', 'TextReveal', 'QuoteBlock']

api-1  | 03:16:50 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 03:16:50 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 03:16:50 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 03:16:53 \[animaflow.llm] INFO: Respuesta recibida (1762 chars)

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1762 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#0a0a0a", "#171717"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "ParticleField",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.4

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "spring-in",

api-1  |       "entryDelay": 0.2,

api-1  |       "animation": "fade-out",

api-1  |       "items": \[

api-1  |         {

api-1  |           "label": "y te está apagando por dentro. Tu comida es combustible, no un premio.",

api-1  |           "value": "text"

api-1  |         }

api-1  |       ],

api-1  |       "gap": 40,

api-1  |       "orientation": "column",

api-1  |       "thickness": 0,

api-1  |       "deletable": false,

api-1  |       "showBadge": false,

api-1  |       "badgeText": "",

api-1  |       "from": 0,

api-1  |       "duration": 0

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "y te está apagando por dentro. Tu comida es combustible, no un premio.",

api-1  |       "variant": "heading",

api-1  |       "maxLines": 4,

api-1  |       "fillArea": false,

api-1  |       "showScrollbar": false,

api-1  |       "showRipple": false,

api-1  |       "showPercentages": false,

api-1  |       "autoplay": false,

api-1  |       "muted": false,

api-1  |       "deletable": false,

api-1  |       "showBadge": false,

api-1  |       "from": 0,

api-1  |       "duration": 0

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": -300,

api-1  |       "icon": "lucide:flame",

api-1  |       "size": "120",

api-1  |       "fillArea": false,

api-1  |       "showScrollbar": false,

api-1  |       "showRipple": false,

api-1  | 

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1762 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#0a0a0a", "#171717"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "ParticleField",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.4

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "spring-in",

api-1  |       "entryDelay": 0.2,

api-1  |       "animation": "fade-out",

api-1  |       "items": \[

api-1  |         {

api-1  |           "label": "y te está apagando por dentro. Tu comida es combustible, no un premio.",

api-1  |           "value": "text"

api-1  |         }

api-1  |       ],

api-1  |       "gap": 40,

api-1  |       "orientation": "column",

api-1  |       "thickness": 0,

api-1  |       "deletable": false,

api-1  |       "showBadge": false,

api-1  |       "badgeText": "",

api-1  |       "from": 0,

api-1  |       "duration": 0

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "y te está apagando por dentro. Tu comida es combustible, no un premio.",

api-1  |       "variant": "heading",

api-1  |       "maxLines": 4,

api-1  |       "fillArea": false,

api-1  |       "showScrollbar": false,

api-1  |       "showRipple": false,

api-1  |       "showPercentages": false,

api-1  |       "autoplay": false,

api-1  |       "muted": false,

api-1  |       "deletable": false,

api-1  |       "showBadge": false,

api-1  |       "from": 0,

api-1  |       "duration": 0

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "IconifyIcon",

api-1  |       "x": 0,

api-1  |       "y": -300,

api-1  |       "icon": "lucide:flame",

api-1  |       "size": "120",

api-1  |       "fillArea": false,

api-1  |       "showScrollbar": false,

api-1  |       "showRipple": false,

api-1  | 

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 1316, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#0a0a0a', '#171717'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'ParticleField', 'x': 0, 'y': 0, 'opacity': 0.4}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'spring-in', 'entryDelay': 0.2, 'animation': 'fade-out', 'items': \[{'label': 'y te está apagando por dentro. Tu comida es combustible, no un premio.', 'value': 'text'}], 'gap': 40, 'orientation': 'column', 'thickness': 0, 'deletable': False, 'showBadge': False, 'badgeText': '', 'from': 0, 'duration': 0}, {'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 0, 'text': 'y te está apagando por dentro. Tu comida es combustible, no un premio.', 'variant': 'heading', 'maxLines': 4, 'fillArea': False, 'showScrollbar': False, 'showRipple': False, 'showPercentages': False, 'autoplay': False, 'muted': False, 'deletable': False, 'showBadge': False, 'from': 0, 'duration': 0}, {'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': -300, 'icon': 'lucide:flame', 'size': '120', 'fillArea': False, 'showScrollbar': False, 'showRipple': False, 'showPercentages': False, 'autoplay': False, 'muted': False, 'deletable': False, 'showBadge': False, 'from': 0, 'duration': 0}], 'out\_transition': {'type': 'WipeTransition', 'duration\_frames': 15}}

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 1316, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#0a0a0a', '#171717'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'ParticleField', 'x': 0, 'y': 0, 'opacity': 0.4}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'spring-in', 'entryDelay': 0.2, 'animation': 'fade-out', 'items': \[{'label': 'y te está apagando por dentro. Tu comida es combustible, no un premio.', 'value': 'text'}], 'gap': 40, 'orientation': 'column', 'thickness': 0, 'deletable': False, 'showBadge': False, 'badgeText': '', 'from': 0, 'duration': 0}, {'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 0, 'text': 'y te está apagando por dentro. Tu comida es combustible, no un premio.', 'variant': 'heading', 'maxLines': 4, 'fillArea': False, 'showScrollbar': False, 'showRipple': False, 'showPercentages': False, 'autoplay': False, 'muted': False, 'deletable': False, 'showBadge': False, 'from': 0, 'duration': 0}, {'type': 'component', 'componentName': 'IconifyIcon', 'x': 0, 'y': -300, 'icon': 'lucide:flame', 'size': '120', 'fillArea': False, 'showScrollbar': False, 'showRipple': False, 'showPercentages': False, 'autoplay': False, 'muted': False, 'deletable': False, 'showBadge': False, 'from': 0, 'duration': 0}], 'out\_transition': {'type': 'WipeTransition', 'duration\_frames': 15}}

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Sanitized group: converted 'items' (1) to 'children' (0)

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Sanitized group: converted 'items' (1) to 'children' (0)

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Removed 10 garbage props from StyleTextBlock: \['muted', 'showBadge', 'deletable', 'showPercentages', 'showRipple', 'duration', 'fillArea', 'autoplay', 'from', 'showScrollbar']

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Removed 10 garbage props from StyleTextBlock: \['muted', 'showBadge', 'deletable', 'showPercentages', 'showRipple', 'duration', 'fillArea', 'autoplay', 'from', 'showScrollbar']

api-1  | 03:16:53 \[animaflow.llm.strategy] WARNING: Unknown component 'StyleTextBlock' — marking for removal

api-1  | 03:16:53 \[animaflow.llm.strategy] WARNING: Unknown component 'StyleTextBlock' — marking for removal

api-1  | 03:16:53 \[animaflow.llm.strategy] WARNING: Unknown component 'IconifyIcon' — marking for removal

api-1  | 03:16:53 \[animaflow.llm.strategy] WARNING: Unknown component 'IconifyIcon' — marking for removal

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: ParticleField

api-1  | 03:16:53 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: ParticleField

api-1  | 03:16:53 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 03:16:53 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 03:16:57 \[animaflow.pipeline] INFO:   Scene 3/3: generating TTS...

api-1  | 03:16:57 \[animaflow.tts.service] INFO: Generating TTS with provider: local\_piper

api-1  | 03:17:00 \[animaflow.tts.piper] INFO: Piper audio generated: /app/storage/audio/piper/509882382025.wav

api-1  | 03:17:00 \[animaflow.tts.service] INFO: Extracting timestamps with Groq API...

api-1  | 03:17:00 \[animaflow.tts.whisper] INFO: Transcribing audio with Groq: /app/storage/audio/piper/509882382025.wav

api-1  | 03:17:01 \[animaflow.tts.whisper] INFO: Extracted 9 word timestamps

api-1  | 03:17:01 \[animaflow.tts.service] INFO: TTS complete: /app/storage/audio/piper/509882382025.wav (3.52s, 9 words)

api-1  | 03:17:01 \[animaflow.pipeline] INFO: Scene 3 duration 3.82s too short for 9 words — extending to 4.45s

api-1  | 03:17:01 \[animaflow.pipeline] INFO: Deciding component strategy for scene 3...

api-1  | 03:17:01 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['KineticBackground', 'GlobalVFX', 'TextSwap', 'TextReveal', 'TextBubble']

api-1  | 03:17:01 \[animaflow.llm.strategy] INFO: Vector search returned 15 relevant components: \['KineticBackground', 'GlobalVFX', 'TextSwap', 'TextReveal', 'TextBubble']

api-1  | 03:17:02 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 03:17:02 \[animaflow.llm.strategy] INFO: Found 5 relevant icons for scene

api-1  | 03:17:02 \[animaflow.llm] INFO: Llamando a Gemini (model=gemini-3.1-flash-lite)...

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated parsed result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | Warning: there are non-text parts in the response: \['thought\_signature'], returning concatenated text result from text parts. Check the full candidates.content.parts accessor to get the full model response.

api-1  | 03:17:05 \[animaflow.llm] INFO: Respuesta recibida (1301 chars)

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1301 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#0f172a", "#1e293b"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "KineticBackground",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.8

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "scale-in",

api-1  |       "entryDelay": 0.2,

api-1  |       "items": \[

api-1  |         {

api-1  |           "label": "text-main",

api-1  |           "value": "¡Elige mejor hoy y sígueme para recuperar tu energía!"

api-1  |         }

api-1  |       ],

api-1  |       "gap": 40,

api-1  |       "orientation": "column",

api-1  |       "showBadge": true,

api-1  |       "badgeText": "MOTIVACIÓN",

api-1  |       "duration": 4.45

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¡Elige mejor hoy y sígueme para recuperar tu energía!",

api-1  |       "variant": "heading",

api-1  |       "size": "lg",

api-1  |       "maxLines": 3,

api-1  |       "fillArea": true,

api-1  |       "showBadge": true,

api-1  |       "badgeText": "ENERGÍA",

api-1  |       "duration": 4.45

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "SubscribeButton",

api-1  |       "x": 0,

api-1  |       "y": 300,

api-1  |       "entry": "slide-up",

api-1  |       "entryDelay": 0.5,

api-1  |       "duration": 4.45

api-1  |     }

api-1  |   ],

api-1  |   "out\_transition": {

api-1  |     "type": "WipeTransition",

api-1  |     "duration\_frames": 15

api-1  |   }

api-1  | }

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: RAW Gemini response for scene composer (1301 chars): {

api-1  |   "version": "1.0",

api-1  |   "background": {

api-1  |     "type": "linear-gradient",

api-1  |     "colors": \["#0f172a", "#1e293b"],

api-1  |     "angle": 180

api-1  |   },

api-1  |   "layers": \[

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "KineticBackground",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "opacity": 0.8

api-1  |     },

api-1  |     {

api-1  |       "type": "group",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "entry": "scale-in",

api-1  |       "entryDelay": 0.2,

api-1  |       "items": \[

api-1  |         {

api-1  |           "label": "text-main",

api-1  |           "value": "¡Elige mejor hoy y sígueme para recuperar tu energía!"

api-1  |         }

api-1  |       ],

api-1  |       "gap": 40,

api-1  |       "orientation": "column",

api-1  |       "showBadge": true,

api-1  |       "badgeText": "MOTIVACIÓN",

api-1  |       "duration": 4.45

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "StyleTextBlock",

api-1  |       "x": 0,

api-1  |       "y": 0,

api-1  |       "text": "¡Elige mejor hoy y sígueme para recuperar tu energía!",

api-1  |       "variant": "heading",

api-1  |       "size": "lg",

api-1  |       "maxLines": 3,

api-1  |       "fillArea": true,

api-1  |       "showBadge": true,

api-1  |       "badgeText": "ENERGÍA",

api-1  |       "duration": 4.45

api-1  |     },

api-1  |     {

api-1  |       "type": "component",

api-1  |       "componentName": "SubscribeButton",

api-1  |       "x": 0,

api-1  |       "y": 300,

api-1  |       "entry": "slide-up",

api-1  |       "entryDelay": 0.5,

api-1  |       "duration": 4.45

api-1  |     }

api-1  |   ],

api-1  |   "out\_transition": {

api-1  |     "type": "WipeTransition",

api-1  |     "duration\_frames": 15

api-1  |   }

api-1  | }

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 963, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#0f172a', '#1e293b'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'KineticBackground', 'x': 0, 'y': 0, 'opacity': 0.8}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'scale-in', 'entryDelay': 0.2, 'items': \[{'label': 'text-main', 'value': '¡Elige mejor hoy y sígueme para recuperar tu energía!'}], 'gap': 40, 'orientation': 'column', 'showBadge': True, 'badgeText': 'MOTIVACIÓN', 'duration': 4.45}, {'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 0, 'text': '¡Elige mejor hoy y sígueme para recuperar tu energía!', 'variant': 'heading', 'size': 'lg', 'maxLines': 3, 'fillArea': True, 'showBadge': True, 'badgeText': 'ENERGÍA', 'duration': 4.45}, {'type': 'component', 'componentName': 'SubscribeButton', 'x': 0, 'y': 300, 'entry': 'slide-up', 'entryDelay': 0.5, 'duration': 4.45}], 'out\_transition': {'type': 'WipeTransition', 'duration\_frames': 15}}

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Parsed result type: dict, length: 963, preview: {'version': '1.0', 'background': {'type': 'linear-gradient', 'colors': \['#0f172a', '#1e293b'], 'angle': 180}, 'layers': \[{'type': 'component', 'componentName': 'KineticBackground', 'x': 0, 'y': 0, 'opacity': 0.8}, {'type': 'group', 'x': 0, 'y': 0, 'entry': 'scale-in', 'entryDelay': 0.2, 'items': \[{'label': 'text-main', 'value': '¡Elige mejor hoy y sígueme para recuperar tu energía!'}], 'gap': 40, 'orientation': 'column', 'showBadge': True, 'badgeText': 'MOTIVACIÓN', 'duration': 4.45}, {'type': 'component', 'componentName': 'StyleTextBlock', 'x': 0, 'y': 0, 'text': '¡Elige mejor hoy y sígueme para recuperar tu energía!', 'variant': 'heading', 'size': 'lg', 'maxLines': 3, 'fillArea': True, 'showBadge': True, 'badgeText': 'ENERGÍA', 'duration': 4.45}, {'type': 'component', 'componentName': 'SubscribeButton', 'x': 0, 'y': 300, 'entry': 'slide-up', 'entryDelay': 0.5, 'duration': 4.45}], 'out\_transition': {'type': 'WipeTransition', 'duration\_frames': 15}}

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Generated AnimaComposerSpec for scene.

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Sanitized group: converted 'items' (1) to 'children' (0)

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Sanitized group: converted 'items' (1) to 'children' (0)

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Removed 4 garbage props from StyleTextBlock: \['showBadge', 'badgeText', 'duration', 'fillArea']

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Removed 4 garbage props from StyleTextBlock: \['showBadge', 'badgeText', 'duration', 'fillArea']

api-1  | 03:17:05 \[animaflow.llm.strategy] WARNING: Unknown component 'StyleTextBlock' — marking for removal

api-1  | 03:17:05 \[animaflow.llm.strategy] WARNING: Unknown component 'StyleTextBlock' — marking for removal

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Assigned default width 648 for SubscribeButton (canvas: 1080px)

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Assigned default width 648 for SubscribeButton (canvas: 1080px)

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: SubscribeButton

api-1  | 03:17:05 \[animaflow.llm.strategy] INFO: Added default exit animation to layer: SubscribeButton

api-1  | 03:17:05 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | 03:17:05 \[animaflow.llm.spec\_validator] INFO: Spec validation: clean (no warnings)

api-1  | INFO:     127.0.0.1:54176 - "GET /health HTTP/1.1" 200 OK

api-1  | INFO:     172.16.2.5:59588 - "GET /api/jobs/5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c HTTP/1.1" 200 OK

api-1  | INFO:     127.0.0.1:40732 - "GET /health HTTP/1.1" 200 OK


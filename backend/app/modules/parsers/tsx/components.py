import re
from typing import Dict, Any


def _extract_universal_props(props_str: str) -> dict:
    """
    Extrae CUALQUIER prop (string o numérico) de un string de atributos JSX.
    
    Ejemplos:
      'color="#3b82f6" fontSize={32} delay={10}'
      → {'color': '#3b82f6', 'fontSize': 32, 'delay': 10}
    """
    props = {}
    # String props: name="value"
    for match in re.finditer(r'(\w+)="([^"]+)"', props_str):
        props[match.group(1)] = match.group(2)
    # Numeric props: count={42} or size={12.5} or negative={-10}
    for match in re.finditer(r'(\w+)=\{(-?\d+(?:\.\d+)?)\}', props_str):
        val = match.group(2)
        props[match.group(1)] = float(val) if '.' in val else int(val)
    return props


def _detect_and_parse(tsx_code: str, component_name: str, defaults: dict) -> dict | None:
    match = re.search(rf'<{component_name}\s*([^>]*)/>', tsx_code)
    if not match:
        return None
        
    props_str = match.group(1)
    raw_props = _extract_universal_props(props_str)
    
    result = {}
    for key, default_val in defaults.items():
        if key in raw_props:
            raw_val = raw_props[key]
            # Si el default es int, convertir (para frames, ms, etc)
            if isinstance(default_val, int) and not isinstance(default_val, bool):
                try:
                    raw_val = int(float(raw_val))
                except (ValueError, TypeError):
                    raw_val = default_val
            # Si el default es float, convertir
            elif isinstance(default_val, float):
                try:
                    raw_val = float(raw_val)
                except (ValueError, TypeError):
                    raw_val = default_val
            result[key] = raw_val
        else:
            result[key] = default_val
    
    # Also include any EXTRA props not in defaults (future-proof)
    for key, val in raw_props.items():
        if key not in result:
            result[key] = val
    
    return result


def parse_components_from_tsx(tsx_code: str) -> Dict[str, Any]:
    """
    Parses Remotion components from TSX to be used by the AE Deterministic Generator.
    
    Usa el parser universal _extract_universal_props para capturar
    CUALQUIER prop que el LLM genere (color, bgColor, textColor, fontSize, delay, etc.)
    """
    components = {}
    
    # ════════════════════════════════════════
    # FONDOS Y AMBIENTES
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'KineticBackground', {
        'color1': '#0f172a', 'color2': '#312e81', 'theme': 'default', 'speed': 1.0,
    })
    if result: components['KineticBackground'] = result

    result = _detect_and_parse(tsx_code, 'GridPerspective', {
        'color1': '#38bdf8', 'color2': '#0f172a', 'speed': 4.0,
    })
    if result: components['GridPerspective'] = result

    result = _detect_and_parse(tsx_code, 'ParticleField', {
        'color1': '#ffffff', 'color2': '#0f172a', 'density': 50,
        'color': '#ffffff', 'count': 50, 'speed': 1.0, 'size': 3.0,
    })
    if result: components['ParticleField'] = result

    result = _detect_and_parse(tsx_code, 'RaysOfLight', {
        'color1': '#ffffff', 'color2': '#0f172a', 'numRays': 12,
        'color': '#ffffff', 'opacity': 0.5, 'speed': 1.0,
    })
    if result: components['RaysOfLight'] = result

    # ════════════════════════════════════════
    # TIPOGRAFÍA Y TEXTO
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'TextReveal', {
        'color': '#ffffff', 'animation': 'slide_up',
        'x': 540.0, 'y': 960.0, 'fontSize': 80.0, 'delay': 0,
    })
    if result: components['TextReveal'] = result

    result = _detect_and_parse(tsx_code, 'GlitchTitle', {
        'color': '#ffffff', 'x': 540.0, 'y': 960.0, 'fontSize': 80.0, 'delay': 0,
    })
    if result: components['GlitchTitle'] = result

    result = _detect_and_parse(tsx_code, 'HighlightText', {
        'color': '#ffffff', 'highlightColor': '#eab308', 'textColor': '#ffffff',
        'x': 540.0, 'y': 960.0, 'fontSize': 80.0, 'delay': 0,
    })
    if result: components['HighlightText'] = result

    result = _detect_and_parse(tsx_code, 'Typewriter', {
        'text': '', 'color': '#ffffff', 'cursorColor': '#ffffff',
        'x': 540.0, 'y': 960.0, 'fontSize': 48.0, 'delay': 0,
    })
    if result: components['Typewriter'] = result

    # ════════════════════════════════════════
    # UI MOCKUPS
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'BrowserWindow', {
        'text': '', 'url': 'https://animaflow.app', 'bgColor': '#ffffff',
        'width': 800.0, 'height': 500.0, 'x': 540.0, 'y': 960.0,
    })
    if result: components['BrowserWindow'] = result

    result = _detect_and_parse(tsx_code, 'SearchEngineTyping', {
        'text': '', 'query': '', 'bgColor': '#ffffff', 'textColor': '#1e293b',
        'width': 900.0, 'delay': 0,
    })
    if result: components['SearchEngineTyping'] = result

    result = _detect_and_parse(tsx_code, 'CursorClick', {
        'startX': 800.0, 'startY': 1500.0, 'color': '#ffffff',
        'x': 540.0, 'y': 960.0, 'clickFrame': 30,
    })
    if result: components['CursorClick'] = result

    result = _detect_and_parse(tsx_code, 'PhoneMockup', {
        'text': '', 'bgColor': '#1e293b', 'screenColor': '#0f172a',
        'x': 540.0, 'y': 960.0,
    })
    if result: components['PhoneMockup'] = result

    # ════════════════════════════════════════
    # DATOS Y GRÁFICOS
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'BarChartReveal', {
        'color1': '#3b82f6', 'color2': '#0ea5e9', 'color': '#3b82f6',
        'bgColor': 'transparent', 'delay': 0,
    })
    if result: components['BarChartReveal'] = result

    result = _detect_and_parse(tsx_code, 'TrendLine', {
        'color': '#10b981', 'lineWidth': 4.0, 'delay': 0,
    })
    if result: components['TrendLine'] = result

    result = _detect_and_parse(tsx_code, 'PercentageRing', {
        'color': '#8b5cf6', 'bgColor': '#1e293b', 'textColor': '#ffffff',
        'targetPercentage': 85.0, 'label': '', 'delay': 0,
    })
    if result: components['PercentageRing'] = result

    # ════════════════════════════════════════
    # FORMAS Y ABSTRACTOS
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'NetworkNodes', {
        'nodeColor': '#38bdf8', 'lineColor': '#38bdf8',
        'color': '#38bdf8', 'nodeCount': 8, 'delay': 0,
    })
    if result: components['NetworkNodes'] = result

    result = _detect_and_parse(tsx_code, 'AbstractWave', {
        'color': '#818cf8', 'amplitude': 100.0, 'frequency': 0.02,
    })
    if result: components['AbstractWave'] = result

    result = _detect_and_parse(tsx_code, 'FloatingBlobs', {
        'color1': '#f43f5e', 'color2': '#f59e0b', 'blur': 150.0,
    })
    if result: components['FloatingBlobs'] = result

    # ════════════════════════════════════════
    # TRANSICIONES
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'ZoomBlurTransition', {
        'intensity': 100.0, 'delay': 0,
    })
    if result: components['ZoomBlurTransition'] = result

    result = _detect_and_parse(tsx_code, 'GlitchTransition', {
        'intensity': 1.0, 'color': '#ffffff', 'delay': 0,
    })
    if result: components['GlitchTransition'] = result

    result = _detect_and_parse(tsx_code, 'WipeTransition', {
        'color': '#0f172a', 'angle': 45.0, 'speed': 1.0,
    })
    if result: components['WipeTransition'] = result

    result = _detect_and_parse(tsx_code, 'LightLeakTransition', {
        'color': '#ff7800', 'intensity': 0.7, 'delay': 0,
    })
    if result: components['LightLeakTransition'] = result

    # ════════════════════════════════════════
    # VFX GLOBALES Y SOCIAL MEDIA
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'GlobalVFX', {
        'grainIntensity': 0.5, 'chromaticAmount': 2.0, 'vignetteIntensity': 0.8,
        'intensity': 0.5,
    })
    if result: components['GlobalVFX'] = result

    result = _detect_and_parse(tsx_code, 'SocialProgressBar', {
        'color': 'rgba(255, 255, 255, 0.8)', 'height': 4,
    })
    if result: components['SocialProgressBar'] = result

    result = _detect_and_parse(tsx_code, 'SubscribeButton', {
        'clickFrame': 90, 'color': '#FF0000', 'textColor': '#FFFFFF',
        'clickedColor': '#333333', 'text': 'Subscribe',
        'clickedText': 'Subscribed', 'fontSize': 40,
    })
    if result: components['SubscribeButton'] = result

    # ════════════════════════════════════════
    # E-COMMERCE & RETAIL
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'ProductCardReveal', {
        'title': 'Limited Edition Sneakers', 'price': '$199.99',
        'bgColor': '#ffffff', 'priceColor': '#10b981', 'textColor': '#0f172a',
        'fontSize': 36, 'delay': 0, 'x': 540.0, 'y': 960.0,
    })
    if result: components['ProductCardReveal'] = result

    result = _detect_and_parse(tsx_code, 'TestimonialReview', {
        'author': 'Sarah Jenkins',
        'review': '"This tool saved our team 20 hours a week!"',
        'rating': 5, 'starColor': '#fbbf24', 'bgColor': '#ffffff',
        'textColor': '#334155', 'fontSize': 28, 'x': 540.0, 'y': 800.0,
    })
    if result: components['TestimonialReview'] = result

    result = _detect_and_parse(tsx_code, 'ShoppingCartBadge', {
        'triggerFrame': 60, 'badgeColor': '#ef4444', 'iconColor': '#0f172a',
        'delay': 0, 'x': 540.0, 'y': 960.0,
    })
    if result: components['ShoppingCartBadge'] = result

    result = _detect_and_parse(tsx_code, 'FeatureChecklist', {
        'itemsStr': 'Free Worldwide Shipping,Premium Quality,30-Day Guarantee',
        'checkColor': '#10b981', 'textColor': '#1e293b', 'bgColor': 'transparent',
        'fontSize': 32, 'delay': 0, 'x': 540.0, 'y': 540.0,
    })
    if result: components['FeatureChecklist'] = result

    # ════════════════════════════════════════
    # INTERFACES INTERACTIVAS
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'TinderSwipeCard', {
        'name': 'SaaS Startup', 'subtitle': 'Looking for growth',
        'swipeFrame': 90, 'bgColor': '#ffffff', 'stampColor': '#22c55e',
        'stampText': 'MATCH!', 'x': 540.0, 'y': 960.0,
    })
    if result: components['TinderSwipeCard'] = result

    result = _detect_and_parse(tsx_code, 'CalendarDatePop', {
        'targetDate': 15, 'month': 'November', 'circleColor': '#ef4444',
        'bgColor': '#ffffff', 'textColor': '#334155', 'x': 540.0, 'y': 960.0,
    })
    if result: components['CalendarDatePop'] = result

    result = _detect_and_parse(tsx_code, 'SplitScreenGrid', {
        'splitFrame': 60,
    })
    if result: components['SplitScreenGrid'] = result

    result = _detect_and_parse(tsx_code, 'MusicPlayerUI', {
        'songTitle': 'Lo-Fi Chill Vibes', 'artist': 'AnimaFlow Beats',
        'progressColor': '#1db954', 'bgColor': '#141414', 'albumColor': '#f5576c',
        'x': 540.0, 'y': 800.0,
    })
    if result: components['MusicPlayerUI'] = result

    # ════════════════════════════════════════
    # DEV TOOLS & TECH
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'TerminalHacker', {
        'lines': 'npm install animaflow,> Installing dependencies...,> Building project...,> Success! Server running on port 3000',
        'textColor': '#22c55e', 'bgColor': '#0f172a', 'cursorColor': '#22c55e',
        'speed': 2, 'fontSize': 24, 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['TerminalHacker'] = result

    result = _detect_and_parse(tsx_code, 'APIRequestFlow', {
        'method': 'POST', 'endpoint': '/api/v1/generate', 'responseCode': 200,
        'color': '#3b82f6', 'bgColor': '#1e293b', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'fontSize': 24, 'delay': 0,
    })
    if result: components['APIRequestFlow'] = result

    result = _detect_and_parse(tsx_code, 'GitCommitGraph', {
        'branches': 2, 'nodeColor': '#3b82f6', 'color': '#334155',
        'mergeFrame': 90, 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['GitCommitGraph'] = result

    result = _detect_and_parse(tsx_code, 'CodeBlockHighlight', {
        'code': 'function calculateROI(investment, return) {\n  const profit = return - investment;\n  return (profit / investment) * 100;\n}',
        'language': 'javascript', 'highlightLine': 2, 'color': '#e2e8f0',
        'bgColor': '#0f172a', 'accentColor': '#38bdf8', 'x': 540.0, 'y': 540.0,
        'fontSize': 24, 'delay': 0,
    })
    if result: components['CodeBlockHighlight'] = result

    result = _detect_and_parse(tsx_code, 'NotificationToast', {
        'title': 'Payment Received', 'message': '$4,200.00 from Acme Corp',
        'icon': '💰', 'color': '#22c55e', 'bgColor': 'rgba(255, 255, 255, 0.9)',
        'textColor': '#0f172a', 'x': 540.0, 'y': 150.0, 'fontSize': 20, 'delay': 0,
    })
    if result: components['NotificationToast'] = result

    result = _detect_and_parse(tsx_code, 'LoadingSpinner', {
        'color': '#3b82f6', 'bgColor': '#1e293b', 'speed': 1.0, 'size': 100.0,
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['LoadingSpinner'] = result

    # ════════════════════════════════════════
    # PODCAST & AUDIO
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'AudioSpectrumBars', {
        'barCount': 15, 'barWidth': 12.0, 'speed': 1.0, 'color': '#10b981',
        'x': 540.0, 'y': 800.0, 'delay': 0,
    })
    if result: components['AudioSpectrumBars'] = result

    result = _detect_and_parse(tsx_code, 'PodcastGuestCard', {
        'name': 'Sam Altman', 'role': 'CEO, OpenAI', 'glowColor': '#3b82f6',
        'bgColor': '#0f172a', 'textColor': '#ffffff', 'x': 540.0, 'y': 540.0,
        'fontSize': 32, 'delay': 0,
    })
    if result: components['PodcastGuestCard'] = result

    result = _detect_and_parse(tsx_code, 'MessageBubble', {
        'messages': 'R:Hey, did you see the new feature?;S:Yeah! It looks amazing. 🚀',
        'senderColor': '#22c55e', 'receiverColor': '#334155', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'fontSize': 24, 'delay': 0,
    })
    if result: components['MessageBubble'] = result

    result = _detect_and_parse(tsx_code, 'WaveformVisualizer', {
        'lineWidth': 6.0, 'amplitude': 100.0, 'color': '#8b5cf6',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['WaveformVisualizer'] = result

    result = _detect_and_parse(tsx_code, 'QuoteBlock', {
        'text': 'The future belongs to those who build it.', 'author': 'Creator',
        'color': '#eab308', 'bgColor': 'transparent', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'fontSize': 48, 'delay': 0,
    })
    if result: components['QuoteBlock'] = result

    result = _detect_and_parse(tsx_code, 'SoundWaveCircle', {
        'rings': 4, 'speed': 1.0, 'color': '#f43f5e',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['SoundWaveCircle'] = result

    # ════════════════════════════════════════
    # NEWS, BROADCAST & SPORTS
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'LowerThird', {
        'name': 'JANE DOE', 'title': 'Chief Technology Officer', 'color': '#2563eb',
        'bgColor': '#ffffff', 'textColor': '#0f172a', 'x': 200.0, 'y': 800.0,
        'fontSize': 48, 'delay': 0,
    })
    if result: components['LowerThird'] = result

    result = _detect_and_parse(tsx_code, 'BreakingNewsTicker', {
        'text': 'LATEST UPDATES: Market hits record highs...', 'bgColor': '#ef4444',
        'textColor': '#ffffff', 'speed': 10.0, 'fontSize': 32, 'delay': 0,
    })
    if result: components['BreakingNewsTicker'] = result

    result = _detect_and_parse(tsx_code, 'VersusScreen', {
        'nameA': 'REACT', 'nameB': 'VUE', 'colorA': '#61dafb', 'colorB': '#42b883',
        'textColor': '#ffffff', 'fontSize': 120, 'delay': 0,
    })
    if result: components['VersusScreen'] = result

    result = _detect_and_parse(tsx_code, 'ScoreboardCounter', {
        'valueA': 104, 'valueB': 98, 'labelA': 'HOME', 'labelB': 'AWAY',
        'colorA': '#ef4444', 'colorB': '#3b82f6', 'bgColor': '#0f172a',
        'textColor': '#ffffff', 'x': 540.0, 'y': 540.0, 'fontSize': 120, 'delay': 0,
    })
    if result: components['ScoreboardCounter'] = result

    result = _detect_and_parse(tsx_code, 'BreakingNewsAlert', {
        'headline': 'MAJOR ANNOUNCEMENT', 'bgColor': '#ef4444', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'fontSize': 80, 'delay': 0,
    })
    if result: components['BreakingNewsAlert'] = result

    result = _detect_and_parse(tsx_code, 'CountdownTimer', {
        'seconds': 10, 'bgColor': '#0f172a', 'textColor': '#ffffff', 'color': '#eab308',
        'x': 540.0, 'y': 540.0, 'fontSize': 200, 'delay': 0,
    })
    if result: components['CountdownTimer'] = result

    # ════════════════════════════════════════
    # ADVANCED DATA VIZ
    # ════════════════════════════════════════
    
    result = _detect_and_parse(tsx_code, 'PieChartReveal', {
        'values': '40,35,25', 'colors': '#3b82f6,#10b981,#f59e0b',
        'labels': 'Product A,Product B,Product C', 'bgColor': '#0f172a',
        'textColor': '#ffffff', 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['PieChartReveal'] = result

    result = _detect_and_parse(tsx_code, 'StockCandlestick', {
        'data': '120,90,100,110;130,105,110,125;140,110,125,115;120,80,115,90;110,70,90,105',
        'upColor': '#22c55e', 'downColor': '#ef4444', 'bgColor': '#0f172a',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['StockCandlestick'] = result

    result = _detect_and_parse(tsx_code, 'RadarSpiderChart', {
        'values': '80,95,60,85,70', 'fillColor': 'rgba(59, 130, 246, 0.5)',
        'color': '#3b82f6', 'labels': 'Speed,Power,Agility,Stamina,Focus',
        'textColor': '#ffffff', 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['RadarSpiderChart'] = result

    result = _detect_and_parse(tsx_code, 'FunnelChart', {
        'values': '10000,5000,2000,500', 'colors': '#3b82f6,#8b5cf6,#ec4899,#ef4444',
        'labels': 'Visits,Signups,Trials,Customers', 'bgColor': 'transparent',
        'textColor': '#ffffff', 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['FunnelChart'] = result

    result = _detect_and_parse(tsx_code, 'HorizontalBarRace', {
        'items': 'JavaScript:100,Python:90,TypeScript:85,Go:70,Rust:60',
        'colors': '#f7df1e,#3776ab,#3178c6,#00add8,#dea584', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['HorizontalBarRace'] = result

    result = _detect_and_parse(tsx_code, 'CounterNumber', {
        'from': 0, 'to': 1000000, 'prefix': '$', 'suffix': '+', 'color': '#22c55e',
        'x': 540.0, 'y': 540.0, 'fontSize': 150, 'delay': 0,
    })
    if result: components['CounterNumber'] = result

    # ════════════════════════════════════════
    # SOCIAL MEDIA & UGC
    # ════════════════════════════════════════

    result = _detect_and_parse(tsx_code, 'TweetCard', {
        'username': 'SaaS Founder', 'handle': '@saas_founder',
        'content': 'Just shipped...', 'retweets': '1.2K', 'likes': '4.5K',
        'verified': True, 'bgColor': '#ffffff', 'textColor': '#0f172a',
        'color': '#1d9bf0', 'x': 540.0, 'y': 540.0, 'fontSize': 32, 'delay': 0,
    })
    if result: components['TweetCard'] = result

    result = _detect_and_parse(tsx_code, 'InstagramPost', {
        'username': 'animaflow.app', 'likes': '1,245', 'caption': 'Launching our new feature today!',
        'bgColor': '#ffffff', 'textColor': '#0f172a', 'color': '#e1306c',
        'x': 540.0, 'y': 540.0, 'fontSize': 24, 'delay': 0,
    })
    if result: components['InstagramPost'] = result

    result = _detect_and_parse(tsx_code, 'TikTokOverlay', {
        'likes': '1.2M', 'comments': '45.2K', 'shares': '12K', 'soundName': 'Original Sound',
        'color': '#fe2c55', 'textColor': '#ffffff', 'x': 900.0, 'y': 960.0, 'delay': 0,
    })
    if result: components['TikTokOverlay'] = result

    result = _detect_and_parse(tsx_code, 'YouTubeEndScreen', {
        'title': 'Thanks for watching!', 'subscribeColor': '#ff0000',
        'bgColor': 'rgba(0, 0, 0, 0.8)', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['YouTubeEndScreen'] = result

    result = _detect_and_parse(tsx_code, 'FollowerCounter', {
        'startCount': 5000, 'endCount': 100000, 'platform': 'insta',
        'color': '#e1306c', 'bgColor': '#ffffff', 'textColor': '#0f172a',
        'x': 540.0, 'y': 540.0, 'fontSize': 120, 'delay': 0,
    })
    if result: components['FollowerCounter'] = result

    result = _detect_and_parse(tsx_code, 'SocialSharePopup', {
        'title': 'Share to friends', 'bgColor': '#ffffff', 'textColor': '#0f172a',
        'color': '#3b82f6', 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['SocialSharePopup'] = result

    # ════════════════════════════════════════
    # ADVANCED E-COMMERCE & B2C
    # ════════════════════════════════════════

    result = _detect_and_parse(tsx_code, 'PromoCodeBanner', {
        'code': 'SUMMER50', 'discount': '50% OFF', 'bgColor': '#eab308',
        'textColor': '#0f172a', 'color': '#ffffff',
        'x': 540.0, 'y': 540.0, 'fontSize': 60, 'delay': 0,
    })
    if result: components['PromoCodeBanner'] = result

    result = _detect_and_parse(tsx_code, 'SizeSelector', {
        'sizes': 'XS,S,M,L,XL', 'selectedSize': 'M', 'color': '#0f172a',
        'bgColor': '#ffffff', 'textColor': '#0f172a',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['SizeSelector'] = result

    result = _detect_and_parse(tsx_code, 'AppStoreButtons', {
        'showApple': True, 'showGoogle': True, 'bgColor': '#000000',
        'textColor': '#ffffff', 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['AppStoreButtons'] = result

    result = _detect_and_parse(tsx_code, 'FeatureUnlock', {
        'featureName': 'Premium Export 4K', 'color': '#eab308',
        'bgColor': '#0f172a', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['FeatureUnlock'] = result

    result = _detect_and_parse(tsx_code, 'FlashSaleTimer', {
        'hours': 0, 'minutes': 15, 'seconds': 30, 'color': '#ef4444',
        'bgColor': '#000000', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['FlashSaleTimer'] = result

    result = _detect_and_parse(tsx_code, 'PricingTableReveal', {
        'tier1': 'Starter', 'tier2': 'Pro', 'tier3': 'Enterprise',
        'price1': '$0', 'price2': '$29', 'price3': '$99',
        'highlightColor': '#3b82f6', 'bgColor': '#1e293b', 'textColor': '#ffffff',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['PricingTableReveal'] = result

    # ════════════════════════════════════════
    # SPRINT 4: PRIMITIVAS GEOMÉTRICAS (LEGO BLOCKS)
    # ════════════════════════════════════════

    result = _detect_and_parse(tsx_code, 'AnimatedShape', {
        'shape': 'rounded-rect', 'width': 200, 'height': 200, 'borderRadius': 32,
        'startX': -200, 'startY': 540.0, 'endX': 540.0, 'endY': 540.0,
        'shadowColor': 'rgba(0,0,0,0.3)', 'shadowBlur': 20, 'rotation': 0, 'opacity': 1.0,
        'color': '#3b82f6', 'delay': 0,
    })
    if result: components['AnimatedShape'] = result

    result = _detect_and_parse(tsx_code, 'AnimatedLine', {
        'startX': 100, 'startY': 100, 'endX': 900, 'endY': 900,
        'strokeWidth': 8, 'dashStyle': 'solid', 'arrowHead': False,
        'color': '#3b82f6', 'delay': 0,
    })
    if result: components['AnimatedLine'] = result

    result = _detect_and_parse(tsx_code, 'AnimatedIcon', {
        'icon': 'star', 'animation': 'bounce', 'size': 120,
        'color': '#eab308', 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['AnimatedIcon'] = result

    result = _detect_and_parse(tsx_code, 'FloatingBadge', {
        'text': 'NEW!', 'shape': 'pill', 'borderWidth': 0, 'shadow': True,
        'color': '#ef4444', 'textColor': '#ffffff', 'x': 540.0, 'y': 540.0,
        'fontSize': 32, 'delay': 0,
    })
    if result: components['FloatingBadge'] = result

    result = _detect_and_parse(tsx_code, 'AnimatedArrow', {
        'startX': 200, 'startY': 200, 'endX': 800, 'endY': 800,
        'curved': True, 'strokeWidth': 10, 'headSize': 25,
        'color': '#ffffff', 'delay': 0,
    })
    if result: components['AnimatedArrow'] = result

    result = _detect_and_parse(tsx_code, 'EmojiFloat', {
        'emoji': '🔥', 'count': 10, 'spread': 300, 'speed': 1.0,
        'x': 540.0, 'y': 1000.0, 'fontSize': 60, 'delay': 0,
    })
    if result: components['EmojiFloat'] = result

    result = _detect_and_parse(tsx_code, 'GradientOverlay', {
        'color1': '#000000', 'color2': 'transparent', 'angle': 180, 'opacity': 0.8,
        'delay': 0,
    })
    if result: components['GradientOverlay'] = result

    result = _detect_and_parse(tsx_code, 'TextBubble', {
        'text': 'Hello World!', 'pointerPosition': 'bottom', 'shadow': True,
        'bgColor': '#ffffff', 'textColor': '#0f172a', 'x': 540.0, 'y': 540.0,
        'fontSize': 40, 'delay': 0,
    })
    if result: components['TextBubble'] = result

    # ════════════════════════════════════════
    # SPRINT 4.5: PRIMITIVAS EXTRA (KIT DEFINITIVO)
    # ════════════════════════════════════════

    result = _detect_and_parse(tsx_code, 'MediaFrame', {
        'url': '', 'borderRadius': 20, 'borderWidth': 0, 'borderColor': '#ffffff',
        'dropShadow': True, 'objectFit': 'cover', 'x': 540.0, 'y': 540.0,
        'width': 600.0, 'height': 400.0, 'delay': 0,
    })
    if result: components['MediaFrame'] = result

    result = _detect_and_parse(tsx_code, 'RippleEffect', {
        'maxRadius': 300, 'count': 3, 'speed': 1.0, 'color': '#3b82f6',
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['RippleEffect'] = result

    result = _detect_and_parse(tsx_code, 'MaskedReveal', {
        'direction': 'up', 'content': 'Revealed Text', 'color': '#ffffff',
        'bgColor': 'transparent', 'fontSize': 60, 'x': 540.0, 'y': 540.0,
        'width': 800.0, 'height': 150.0, 'delay': 0,
    })
    if result: components['MaskedReveal'] = result

    result = _detect_and_parse(tsx_code, 'ProgressPill', {
        'startPercent': 0, 'endPercent': 100, 'barColor': '#3b82f6',
        'trackColor': '#e2e8f0', 'duration': 60, 'showLabel': True,
        'textColor': '#0f172a', 'x': 540.0, 'y': 540.0, 'width': 600.0,
        'height': 40.0, 'fontSize': 24, 'delay': 0,
    })
    if result: components['ProgressPill'] = result

    # ════════════════════════════════════════
    # FIXES AUDITORÍA SPRINT 4: TEXTO AVANZADO
    # ════════════════════════════════════════

    result = _detect_and_parse(tsx_code, 'StrikethroughText', {
        'text': 'Strikethrough', 'color': '#ffffff', 'strikeColor': '#ef4444',
        'strikeWidth': 8, 'fontSize': 80, 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['StrikethroughText'] = result

    result = _detect_and_parse(tsx_code, 'UnderlineReveal', {
        'text': 'Underline', 'color': '#ffffff', 'underlineColor': '#3b82f6',
        'underlineWidth': 6, 'fontSize': 80, 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['UnderlineReveal'] = result

    result = _detect_and_parse(tsx_code, 'SplitText', {
        'topText': 'SECRET', 'bottomText': 'MESSAGE', 'revealedText': 'UNLOCKED',
        'color': '#ffffff', 'revealedColor': '#10b981', 'fontSize': 100,
        'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['SplitText'] = result

    result = _detect_and_parse(tsx_code, 'TextSwap', {
        'initialText': 'BEFORE', 'finalText': 'AFTER', 'initialColor': '#ef4444',
        'finalColor': '#10b981', 'fontSize': 80, 'x': 540.0, 'y': 540.0, 'delay': 0,
    })
    if result: components['TextSwap'] = result

    return components

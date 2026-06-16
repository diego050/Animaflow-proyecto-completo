import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette, ChevronDown, ChevronRight } from 'lucide-react';
import { Player } from '@remotion/player';
import { COMPONENT_REGISTRY } from '../../remotion/registry';
import { AnimatedWrapper } from '../../remotion/AnimatedWrapper';
import type { EntryType, ExitType } from '../../remotion/AnimatedWrapper';
import {
  getComponentManifest,
  getDefaultProps,
  type PropDefinition,
  type PropType,
} from '../../remotion/manifest';

const STYLE_SYSTEM_EXAMPLES = [
  {
    id: 'card-padding-border',
    name: 'Card con Padding y Borde',
    icon: '🃏',
    spec: {
      type: 'group',
      layout: 'flex',
      direction: 'column',
      gap: 12,
      style: {
        padding: 24,
        borderWidth: 2,
        borderColor: '#334155',
        borderRadius: 12,
        boxShadow: { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.3)' }
      },
      children: [
        { type: 'text', text: 'Título de la Card', fontSize: 24, fontWeight: 700 },
        { type: 'text', text: 'Descripción con padding interno', fontSize: 16 }
      ]
    }
  },
  {
    id: 'badge-asymmetric-padding',
    name: 'Badge con Padding Asimétrico',
    icon: '🏷️',
    spec: {
      type: 'text',
      text: 'NUEVO',
      style: {
        padding: [6, 12, 6, 12],
        borderRadius: 999,
        backgroundColor: '#00FFAB',
        color: '#0F172A',
        fontWeight: 700
      }
    }
  },
  {
    id: 'group-flex-padding',
    name: 'Grupo con Flex y Padding',
    icon: '📦',
    spec: {
      type: 'group',
      layout: 'flex',
      direction: 'row',
      justifyContent: 'space-between',
      gap: 16,
      style: {
        padding: [20, 32, 20, 32],
        margin: 40,
        backgroundColor: '#1E293B',
        borderRadius: 16
      },
      children: [
        { type: 'text', text: 'Item 1', fontSize: 18 },
        { type: 'text', text: 'Item 2', fontSize: 18 },
        { type: 'text', text: 'Item 3', fontSize: 18 }
      ]
    }
  },
  {
    id: 'image-filters',
    name: 'Imagen con Filtros',
    icon: '🖼️',
    spec: {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800',
      style: {
        borderRadius: 16,
        opacity: 0.8,
        blur: 2,
        saturate: 1.2,
        boxShadow: { x: 0, y: 8, blur: 24, spread: 0, color: 'rgba(0,0,0,0.4)' }
      }
    }
  },
  {
    id: 'text-shadow-decoration',
    name: 'Texto con Sombra y Decoración',
    icon: '✨',
    spec: {
      type: 'text',
      text: 'Texto Importante',
      style: {
        textShadow: { x: 2, y: 2, blur: 4, color: 'rgba(0,0,0,0.5)' },
        textDecoration: 'underline',
        lineHeight: 1.5
      }
    }
  },
  // --- Video Style System Components ---
  {
    id: 'style-button',
    name: 'StyleButton (CTA)',
    icon: '🔘',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#1a0a2e', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleButton',
          text: 'Suscríbete Ahora',
          variant: 'primary',
          size: 'lg',
          icon: 'mdi:arrow-right',
          iconPosition: 'right',
          x: 540,
          y: 960,
          entry: 'spring-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleButton',
          text: 'Ver Demo',
          variant: 'outline',
          size: 'md',
          x: 540,
          y: 1060,
          entry: 'spring-in',
          entryDelay: 1,
        },
      ],
    },
  },
  {
    id: 'style-card',
    name: 'StyleCard (Container)',
    icon: '📋',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleCard',
          title: 'Datos Increíbles',
          subtitle: 'El 73% de los usuarios prefieren video',
          variant: 'elevated',
          x: 540,
          y: 960,
          width: 400,
          entry: 'slide-up',
          entryDelay: 0.3,
          style: { padding: 32, borderRadius: 16, boxShadow: { x: 0, y: 8, blur: 32, spread: 0, color: 'rgba(0,0,0,0.4)' } },
        },
      ],
    },
  },
  {
    id: 'style-badge',
    name: 'StyleBadge (Label)',
    icon: '🏅',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#1a0a00', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'NUEVO',
          variant: 'success',
          size: 'lg',
          icon: 'mdi:sparkles',
          x: 540,
          y: 300,
          entry: 'spring-in',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: '73% OFF',
          variant: 'warning',
          size: 'md',
          x: 540,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'LIMITADO',
          variant: 'error',
          size: 'sm',
          x: 540,
          y: 480,
          entry: 'spring-in',
          entryDelay: 0.8,
        },
      ],
    },
  },
  {
    id: 'style-avatar',
    name: 'StyleAvatar (Icon-based)',
    icon: '👤',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:account',
          name: 'María García',
          subtitle: '⭐⭐⭐⭐⭐ 4.9',
          size: 'lg',
          variant: 'ring',
          showBadge: true,
          badgeText: 'Nuevo',
          x: 540,
          y: 500,
          entry: 'spring-in',
          entryDelay: 0.3,
        },
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:account-tie',
          name: 'Carlos López',
          subtitle: 'CEO @ TechCorp',
          size: 'md',
          variant: 'gradient',
          x: 300,
          y: 800,
          entry: 'spring-in',
          entryDelay: 0.6,
        },
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:account-star',
          name: 'Ana Martínez',
          subtitle: 'Diseñadora UX',
          size: 'sm',
          variant: 'solid',
          x: 780,
          y: 800,
          entry: 'spring-in',
          entryDelay: 0.9,
        },
      ],
    },
  },
  {
    id: 'style-progress',
    name: 'StyleProgressBar',
    icon: '📊',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleProgressBar',
          value: 73,
          max: 100,
          variant: 'linear',
          color: '#00FFAB',
          showLabel: true,
          labelPosition: 'top',
          x: 540,
          y: 600,
          entry: 'fade-in',
          entryDelay: 0.3,
        },
        {
          type: 'component',
          componentName: 'StyleProgressBar',
          value: 85,
          max: 100,
          variant: 'circular',
          color: '#FF8C00',
          size: 100,
          strokeWidth: 8,
          showLabel: true,
          labelPosition: 'bottom',
          x: 540,
          y: 900,
          entry: 'fade-in',
          entryDelay: 0.6,
        },
      ],
    },
  },
  {
    id: 'grid-layout',
    name: 'Grid Layout (2x2)',
    icon: '🔲',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'group',
          layout: 'grid',
          gridCols: 2,
          gap: 16,
          style: { padding: 24 },
          children: [
            { type: 'component', componentName: 'StyleBadge', text: 'Feature 1', variant: 'success', size: 'md', entry: 'fade-in', entryDelay: 0.2 },
            { type: 'component', componentName: 'StyleBadge', text: 'Feature 2', variant: 'info', size: 'md', entry: 'fade-in', entryDelay: 0.4 },
            { type: 'component', componentName: 'StyleBadge', text: 'Feature 3', variant: 'warning', size: 'md', entry: 'fade-in', entryDelay: 0.6 },
            { type: 'component', componentName: 'StyleBadge', text: 'Feature 4', variant: 'error', size: 'md', entry: 'fade-in', entryDelay: 0.8 },
          ],
        },
      ],
    },
  },
  {
    id: 'style-chip',
    name: 'StyleChip (Tags)',
    icon: '🏷️',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleChip',
          text: 'React',
          icon: 'mdi:react',
          variant: 'filled',
          size: 'md',
          x: 300,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleChip',
          text: 'TypeScript',
          icon: 'mdi:language-typescript',
          variant: 'outlined',
          size: 'md',
          x: 540,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.4,
        },
        {
          type: 'component',
          componentName: 'StyleChip',
          text: 'Python',
          icon: 'mdi:language-python',
          variant: 'soft',
          size: 'md',
          x: 780,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.6,
        },
      ],
    },
  },
  {
    id: 'style-textblock',
    name: 'StyleTextBlock',
    icon: '📝',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'El Futuro del Video',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 300,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: '"La creatividad es la inteligencia divirtiéndose." — Albert Einstein',
          variant: 'quote',
          align: 'center',
          x: 540,
          y: 500,
          width: 450,
          entry: 'slide-up',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'AnimaFlow convierte texto y audio en videos editables con animaciones frame-accurate para After Effects.',
          variant: 'body',
          align: 'center',
          x: 540,
          y: 700,
          width: 400,
          entry: 'slide-up',
          entryDelay: 0.8,
        },
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Generado automáticamente',
          variant: 'caption',
          align: 'center',
          x: 540,
          y: 900,
          width: 300,
          entry: 'slide-up',
          entryDelay: 1.1,
        },
      ],
    },
  },
  {
    id: 'style-callout',
    name: 'StyleCallout (Annotations)',
    icon: '📌',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleCard',
          title: 'Feature Principal',
          subtitle: 'Haz clic en el botón para comenzar',
          variant: 'elevated',
          x: 540,
          y: 600,
          width: 350,
          entry: 'slide-up',
          entryDelay: 0.3,
          style: { padding: 24, borderRadius: 16 },
        },
        {
          type: 'component',
          componentName: 'StyleCallout',
          text: '¡Importante!',
          direction: 'right',
          variant: 'arrow',
          x: 350,
          y: 600,
          entry: 'slide-right',
          entryDelay: 0.8,
          style: { color: '#00FFAB', fontSize: 16 },
        },
        {
          type: 'component',
          componentName: 'StyleCallout',
          text: 'Nuevo',
          direction: 'top',
          variant: 'circle',
          x: 700,
          y: 400,
          entry: 'spring-in',
          entryDelay: 1.1,
          style: { color: '#FF8C00' },
        },
      ],
    },
  },
  {
    id: 'style-watermark',
    name: 'StyleWatermark (Branding)',
    icon: '💧',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Video Corporativo',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 400,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.3,
        },
        {
          type: 'component',
          componentName: 'StyleWatermark',
          icon: 'mdi:watermark',
          position: 'top-right',
          opacity: 0.3,
          size: 60,
          entry: 'fade-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleWatermark',
          icon: 'mdi:play-circle',
          position: 'bottom-left',
          opacity: 0.2,
          size: 48,
          entry: 'fade-in',
          entryDelay: 0.7,
        },
      ],
    },
  },
  {
    id: 'style-charts',
    name: 'StyleCharts (Data Viz)',
    icon: '📊',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleBarChart',
          data: [
            { label: 'Ene', value: 45, color: '#2C3E50' },
            { label: 'Feb', value: 73, color: '#00FFAB' },
            { label: 'Mar', value: 91, color: '#FF8C00' },
          ],
          variant: 'vertical',
          showLabels: true,
          showValues: true,
          x: 280,
          y: 500,
          entry: 'fade-in',
          entryDelay: 0.3,
        },
        {
          type: 'component',
          componentName: 'StyleLineChart',
          data: [
            { x: 'Ene', y: 45 },
            { x: 'Feb', y: 73 },
            { x: 'Mar', y: 55 },
            { x: 'Abr', y: 91 },
          ],
          showDots: true,
          showGrid: true,
          lineColor: '#3B82F6',
          fillArea: true,
          x: 800,
          y: 500,
          entry: 'fade-in',
          entryDelay: 0.6,
        },
        {
          type: 'component',
          componentName: 'StylePieChart',
          data: [
            { label: 'Video', value: 73, color: '#00FFAB' },
            { label: 'Texto', value: 18, color: '#FF8C00' },
            { label: 'Audio', value: 9, color: '#3B82F6' },
          ],
          variant: 'donut',
          showLabels: true,
          showValues: true,
          x: 540,
          y: 900,
          entry: 'fade-in',
          entryDelay: 0.9,
        },
      ],
    },
  },
  {
    id: 'full-dashboard',
    name: 'Full Dashboard (All Components)',
    icon: '🎛️',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Dashboard Analytics',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 100,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleWatermark',
          icon: 'mdi:chart-box',
          position: 'top-right',
          opacity: 0.2,
          size: 48,
          entry: 'fade-in',
          entryDelay: 0.4,
        },
        {
          type: 'component',
          componentName: 'StyleDivider',
          orientation: 'horizontal',
          style: 'gradient',
          color: '#00FFAB',
          thickness: 2,
          width: 500,
          x: 540,
          y: 160,
          entry: 'fade-in',
          entryDelay: 0.4,
        },
        {
          type: 'group',
          layout: 'grid',
          gridCols: 2,
          gap: 16,
          style: { padding: 20 },
          children: [
            { type: 'component', componentName: 'StyleAvatar', icon: 'mdi:rocket', name: 'Lanzamiento', subtitle: 'Q2 2026', size: 'sm', variant: 'ring', entry: 'fade-in', entryDelay: 0.5 },
            { type: 'component', componentName: 'StyleAvatar', icon: 'mdi:chart-line', name: 'Crecimiento', subtitle: '+340%', size: 'sm', variant: 'gradient', entry: 'fade-in', entryDelay: 0.7 },
          ],
        },
        {
          type: 'component',
          componentName: 'StyleBarChart',
          data: [
            { label: 'Q1', value: 30, color: '#2C3E50' },
            { label: 'Q2', value: 65, color: '#00FFAB' },
            { label: 'Q3', value: 85, color: '#FF8C00' },
            { label: 'Q4', value: 95, color: '#3B82F6' },
          ],
          variant: 'vertical',
          showLabels: true,
          showValues: true,
          x: 540,
          y: 600,
          entry: 'fade-in',
          entryDelay: 0.9,
        },
        {
          type: 'component',
          componentName: 'StylePieChart',
          data: [
            { label: 'Orgánico', value: 45, color: '#00FFAB' },
            { label: 'Paid', value: 30, color: '#FF8C00' },
            { label: 'Social', value: 25, color: '#3B82F6' },
          ],
          variant: 'donut',
          showLabels: true,
          showValues: true,
          x: 540,
          y: 950,
          entry: 'fade-in',
          entryDelay: 1.2,
        },
        {
          type: 'component',
          componentName: 'StyleCallout',
          text: '↑ 340% growth',
          direction: 'bottom',
          variant: 'arrow',
          x: 700,
          y: 500,
          entry: 'slide-down',
          entryDelay: 1.5,
          style: { color: '#00FFAB', fontSize: 14 },
        },
        {
          type: 'group',
          layout: 'flex',
          direction: 'row',
          justifyContent: 'center',
          gap: 8,
          children: [
            { type: 'component', componentName: 'StyleChip', text: 'Analytics', variant: 'filled', size: 'sm', entry: 'fade-in', entryDelay: 1.7 },
            { type: 'component', componentName: 'StyleChip', text: 'Growth', variant: 'filled', size: 'sm', entry: 'fade-in', entryDelay: 1.8 },
            { type: 'component', componentName: 'StyleChip', text: '2026', variant: 'filled', size: 'sm', entry: 'fade-in', entryDelay: 1.9 },
          ],
        },
      ],
    },
  },
  {
    id: 'animate-number',
    name: 'StyleAnimateNumber (Counters)',
    icon: '🔢',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleAnimateNumber',
          value: 73,
          format: 'percentage',
          decimals: 0,
          x: 280,
          y: 400,
          entry: 'fade-in',
          entryDelay: 0.3,
          style: { fontSize: 64, fontWeight: 700, color: '#00FFAB' },
        },
        {
          type: 'component',
          componentName: 'StyleAnimateNumber',
          value: 1234567,
          format: 'compact',
          prefix: '+',
          x: 540,
          y: 400,
          entry: 'fade-in',
          entryDelay: 0.6,
          style: { fontSize: 48, fontWeight: 700, color: '#FF8C00' },
        },
        {
          type: 'component',
          componentName: 'StyleAnimateNumber',
          value: 45999,
          format: 'currency',
          decimals: 0,
          x: 800,
          y: 400,
          entry: 'fade-in',
          entryDelay: 0.9,
          style: { fontSize: 48, fontWeight: 700, color: '#3B82F6' },
        },
      ],
    },
  },
  {
    id: 'scramble-ticker',
    name: 'ScrambleText + Ticker',
    icon: '📡',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleScrambleText',
          text: 'ACCESS GRANTED',
          x: 540,
          y: 300,
          entry: 'fade-in',
          entryDelay: 0.3,
          style: { fontSize: 36, color: '#00FFAB', fontFamily: 'JetBrains Mono, monospace' },
        },
        {
          type: 'component',
          componentName: 'StyleScrambleText',
          text: 'SYSTEM BREACH DETECTED',
          x: 540,
          y: 500,
          entry: 'fade-in',
          entryDelay: 1.5,
          style: { fontSize: 28, color: '#EF4444', fontFamily: 'JetBrains Mono, monospace' },
        },
        {
          type: 'component',
          componentName: 'StyleTicker',
          text: 'BTC $45,230 • ETH $3,120 • SOL $98 • AAPL $178 • TSLA $245 • GOOGL $142',
          speed: 2,
          x: 540,
          y: 1800,
          entry: 'fade-in',
          entryDelay: 0.5,
        },
      ],
    },
  },
  {
    id: 'hover-scroll-cursor',
    name: 'Simulated Hover + Fake Scroll + Cursor',
    icon: '🖱️',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleSimulatedHover',
          text: 'Suscríbete Ahora',
          icon: 'mdi:arrow-right',
          variant: 'button',
          hoverFrame: 60,
          hoverDuration: 30,
          x: 540,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.3,
          style: { backgroundColor: '#2C3E50', padding: 16, fontSize: 18 },
        },
        {
          type: 'component',
          componentName: 'StyleFakeScroll',
          items: [
            { content: 'María García', subtitle: '⭐⭐⭐⭐⭐ Increíble producto!', icon: 'mdi:account' },
            { content: 'Carlos López', subtitle: 'Muy recomendado, 10/10', icon: 'mdi:account-tie' },
            { content: 'Ana Martínez', subtitle: 'Excelente servicio al cliente', icon: 'mdi:account-star' },
            { content: 'Pedro Sánchez', subtitle: 'Lo uso todos los días', icon: 'mdi:account' },
            { content: 'Laura Torres', subtitle: 'Mejor que la competencia', icon: 'mdi:account-check' },
          ],
          speed: 0.5,
          itemHeight: 70,
          visibleItems: 3,
          showScrollbar: true,
          x: 540,
          y: 900,
          entry: 'slide-up',
          entryDelay: 0.5,
          style: { width: 340, borderRadius: 12 },
        },
        {
          type: 'component',
          componentName: 'StyleCursor',
          points: [
            { x: 540, y: 400, click: true, holdFrames: 15 },
            { x: 540, y: 900, click: false },
          ],
          speed: 2,
          showRipple: true,
          entry: 'fade-in',
          entryDelay: 0.8,
        },
      ],
    },
  },
  {
    id: 'bar-race',
    name: 'StyleBarRace (Rankings)',
    icon: '🏆',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Top Frameworks 2026',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 150,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleBarRace',
          data: [
            { label: 'React', value: 85, color: '#3B82F6' },
            { label: 'Vue', value: 65, color: '#14B8A6' },
            { label: 'Angular', value: 45, color: '#EF4444' },
            { label: 'Svelte', value: 35, color: '#FF8C00' },
            { label: 'Solid', value: 25, color: '#8B5CF6' },
            { label: 'Qwik', value: 15, color: '#EC4899' },
          ],
          barHeight: 32,
          gap: 8,
          showLabels: true,
          showValues: true,
          x: 540,
          y: 600,
          entry: 'fade-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleAnimateNumber',
          value: 85,
          format: 'percentage',
          x: 540,
          y: 950,
          entry: 'fade-in',
          entryDelay: 1.2,
          style: { fontSize: 48, fontWeight: 700, color: '#3B82F6' },
        },
      ],
    },
  },
  {
    id: 'funnel-chart',
    name: 'StyleFunnelChart (Conversion)',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Embudo de Conversión',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 150,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleFunnelChart',
          data: [
            { label: 'Visitas', value: 10000, color: '#00FFAB' },
            { label: 'Registros', value: 4500, color: '#3B82F6' },
            { label: 'Activaciones', value: 2200, color: '#FF8C00' },
            { label: 'Compras', value: 890, color: '#EF4444' },
            { label: 'Retención', value: 450, color: '#8B5CF6' },
          ],
          showLabels: true,
          showValues: true,
          showPercentages: true,
          x: 540,
          y: 600,
          entry: 'fade-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleAnimateNumber',
          value: 4.5,
          format: 'percentage',
          decimals: 1,
          x: 540,
          y: 950,
          entry: 'fade-in',
          entryDelay: 1.2,
          style: { fontSize: 48, fontWeight: 700, color: '#00FFAB' },
        },
      ],
    },
  },
  {
    id: 'radar-chart',
    name: 'StyleRadarChart (Multi-axis)',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Análisis de Rendimiento',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 150,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleRadarChart',
          data: [
            { label: 'Velocidad', value: 85 },
            { label: 'Calidad', value: 72 },
            { label: 'Costo', value: 60 },
            { label: 'Escalabilidad', value: 90 },
            { label: 'Seguridad', value: 78 },
            { label: 'UX', value: 65 },
          ],
          showLabels: true,
          showGrid: true,
          showValues: true,
          size: 280,
          x: 540,
          y: 550,
          entry: 'fade-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleRadarChart',
          data: [
            { label: 'React', value: 90 },
            { label: 'Vue', value: 70 },
            { label: 'Angular', value: 55 },
            { label: 'Svelte', value: 45 },
            { label: 'Solid', value: 35 },
            { label: 'Qwik', value: 25 },
          ],
          showLabels: true,
          showGrid: true,
          showValues: false,
          fillColor: 'rgba(59, 130, 246, 0.15)',
          lineColor: '#3B82F6',
          size: 280,
          x: 540,
          y: 950,
          entry: 'fade-in',
          entryDelay: 1,
        },
      ],
    },
  },
  {
    id: 'spring-physics',
    name: 'Improved Spring Physics',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'Gentle',
          variant: 'success',
          size: 'md',
          x: 200,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'Snappy',
          variant: 'info',
          size: 'md',
          x: 400,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.4,
        },
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'Bouncy',
          variant: 'warning',
          size: 'md',
          x: 600,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.6,
        },
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'Stiff',
          variant: 'error',
          size: 'md',
          x: 800,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.8,
        },
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Spring Physics Comparison',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 200,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.2,
        },
      ],
    },
  },
  {
    id: 'layout-transitions',
    name: 'Layout Transitions',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Smooth Position Transitions',
          variant: 'heading',
          align: 'center',
          x: 540,
          y: 150,
          width: 500,
          entry: 'slide-up',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:rocket',
          name: 'Position A',
          subtitle: 'Start position',
          size: 'md',
          variant: 'ring',
          id: 'avatar-1',
          x: 300,
          y: 500,
          entry: 'spring-in',
          entryDelay: 0.3,
          transitionDuration: 20,
          transitionEasing: 'spring',
          transitionSpring: 'bouncy',
        },
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:chart-line',
          name: 'Position B',
          subtitle: 'End position',
          size: 'md',
          variant: 'gradient',
          id: 'avatar-2',
          x: 780,
          y: 500,
          entry: 'spring-in',
          entryDelay: 0.5,
          transitionDuration: 20,
          transitionEasing: 'spring',
          transitionSpring: 'snappy',
        },
        {
          type: 'component',
          componentName: 'StyleDivider',
          orientation: 'horizontal',
          style: 'gradient',
          color: '#00FFAB',
          thickness: 2,
          width: 400,
          x: 540,
          y: 700,
          entry: 'fade-in',
          entryDelay: 0.7,
        },
        {
          type: 'component',
          componentName: 'StyleTextBlock',
          text: 'Elements smoothly transition between positions using spring physics',
          variant: 'body',
          align: 'center',
          x: 540,
          y: 800,
          width: 400,
          entry: 'slide-up',
          entryDelay: 0.9,
        },
      ],
    },
  }
];

type UniversalPropDef = { name: string; type: PropType; label: string; defaultValue?: string | number; options?: string[]; min?: number; max?: number };

// Universales de POSICIÓN / ANIMACIÓN — aplican a TODOS los componentes (los
// maneja el wrapper, no el componente). Siempre se muestran.
const POSITION_ANIM_PROPS: UniversalPropDef[] = [
  { name: 'x', type: 'number', label: 'Position X', defaultValue: 540 },
  { name: 'y', type: 'number', label: 'Position Y', defaultValue: 960 },
  { name: 'scale', type: 'number', label: 'Scale', defaultValue: 1 },
  { name: 'rotation', type: 'number', label: 'Rotation (deg)', defaultValue: 0 },
  { name: 'opacity', type: 'number', label: 'Opacity', defaultValue: 1, min: 0, max: 1 },
  { name: 'entry', type: 'select', label: 'Entry Animation', options: ['fade-in', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale-in', 'spring-in', 'bounce-in'] },
  { name: 'entryDelay', type: 'number', label: 'Entry Delay (s)', defaultValue: 0 },
  { name: 'entryDuration', type: 'number', label: 'Entry Duration (frames)', defaultValue: 15 },
  { name: 'exit', type: 'select', label: 'Exit Animation', options: ['fade-out', 'slide-up-out', 'slide-down-out', 'slide-left-out', 'slide-right-out', 'scale-out', 'spring-out', 'bounce-out'] },
  { name: 'exitDuration', type: 'number', label: 'Exit Duration (frames)', defaultValue: 15 },
];

// Universales de ESTILO — solo relevantes en componentes de texto/UI. Para
// fondos/decorativos/charts NO se muestran (eran los inputs "irrelevantes" tipo
// fontSize en FloatingBlobs). `bgColor` se quitó de aquí: el fondo es del PREVIEW,
// no del componente (ver control de fondo en el área del Player).
const STYLE_UNIVERSAL_PROPS: UniversalPropDef[] = [
  { name: 'color', type: 'color', label: 'Color' },
  { name: 'textColor', type: 'color', label: 'Text Color', defaultValue: '#f8fafc' },
  { name: 'fontSize', type: 'number', label: 'Font Size (px)', defaultValue: 64 },
  { name: 'width', type: 'number', label: 'Width' },
  { name: 'height', type: 'number', label: 'Height' },
];

const STYLE_RELEVANT_ROLES = new Set(['text', 'ui']);
const STYLE_RELEVANT_CATEGORIES = new Set(['Text', 'UI']);

/**
 * Props editor for a single component.
 * Keyed by componentName in the parent so React remounts it (resetting all state)
 * when the user navigates to a different component.
 */
function ComponentPropsEditor({
  componentName,
  manifestEntry,
  onPropsChange,
}: {
  componentName: string;
  manifestEntry: ReturnType<typeof getComponentManifest>;
  onPropsChange: (props: Record<string, unknown>) => void;
}) {
  const [showUniversalProps, setShowUniversalProps] = useState(false);

  // ¿Mostrar universales de ESTILO (color/fontSize/...)? Solo en texto/UI; en
  // fondos/decorativos/charts no aplican (evita inputs irrelevantes).
  const showStyle = !!(
    manifestEntry &&
    (STYLE_RELEVANT_ROLES.has(manifestEntry.role) || STYLE_RELEVANT_CATEGORIES.has(manifestEntry.category))
  );
  const relevantUniversals = useMemo(
    () => (showStyle ? [...POSITION_ANIM_PROPS, ...STYLE_UNIVERSAL_PROPS] : POSITION_ANIM_PROPS),
    [showStyle]
  );

  // Initialize props from manifest defaults + universal defaults (lazy init — runs once per mount)
  const [props, setProps] = useState<Record<string, unknown>>(() => {
    const componentDefaults = getDefaultProps(componentName);
    const universalDefaults: Record<string, unknown> = {};
    for (const up of relevantUniversals) {
      if (up.defaultValue !== undefined) {
        universalDefaults[up.name] = up.defaultValue;
      }
    }
    return { ...universalDefaults, ...componentDefaults };
  });

  const handlePropChange = useCallback((key: string, value: string | number | boolean) => {
    setProps(prev => {
      const next = { ...prev, [key]: value };
      onPropsChange(next);
      return next;
    });
  }, [onPropsChange]);

  const baseInputClass = 'w-full bg-surface-lowest border border-border-tech rounded-lg p-2 text-sm text-text-primary';

  const renderPropInput = useCallback((prop: PropDefinition) => {
    const value = props[prop.name];

    switch (prop.type) {
      case 'text-long':
        return (
          <textarea
            value={String(value ?? prop.defaultValue ?? '')}
            onChange={(e) => handlePropChange(prop.name, e.target.value)}
            className={`${baseInputClass} resize-y`}
            rows={3}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={Number(value ?? prop.defaultValue ?? 0)}
            onChange={(e) => handlePropChange(prop.name, Number(e.target.value))}
            min={prop.min}
            max={prop.max}
            className={baseInputClass}
          />
        );
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(value ?? prop.defaultValue ?? '#000000')}
              onChange={(e) => handlePropChange(prop.name, e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-border-tech"
            />
            <input
              type="text"
              value={String(value ?? prop.defaultValue ?? '')}
              onChange={(e) => handlePropChange(prop.name, e.target.value)}
              className={`${baseInputClass} flex-1 font-mono text-xs`}
            />
          </div>
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!(value ?? prop.defaultValue ?? false)}
              onChange={(e) => handlePropChange(prop.name, e.target.checked)}
              className="w-4 h-4 rounded border-border-tech text-mint-precision focus:ring-mint-precision/30"
            />
            <span className="text-xs text-text-secondary">
              {value ?? prop.defaultValue ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );
      case 'select':
        return (
          <select
            value={String(value ?? prop.defaultValue ?? '')}
            onChange={(e) => handlePropChange(prop.name, e.target.value)}
            className={baseInputClass}
          >
            {(prop.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'icon':
        return (
          <div>
            <input
              type="text"
              value={String(value ?? prop.defaultValue ?? '')}
              onChange={(e) => handlePropChange(prop.name, e.target.value)}
              className={`${baseInputClass} font-mono text-xs`}
              placeholder="mdi:heart"
            />
            <p className="mt-1 text-[10px] text-text-secondary/50">Format: prefix:name (e.g., mdi:heart)</p>
          </div>
        );
      case 'list':
        return (
          <div>
            <input
              type="text"
              value={Array.isArray(value) ? JSON.stringify(value) : String(value ?? prop.defaultValue ?? '')}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handlePropChange(prop.name, parsed);
                } catch {
                  handlePropChange(prop.name, e.target.value);
                }
              }}
              className={`${baseInputClass} font-mono text-xs`}
              placeholder="JSON array or comma-separated"
            />
            <p className="mt-1 text-[10px] text-text-secondary/50">JSON array or comma-separated values</p>
          </div>
        );
      default: // 'string'
        return (
          <input
            type="text"
            value={String(value ?? prop.defaultValue ?? '')}
            onChange={(e) => handlePropChange(prop.name, e.target.value)}
            className={baseInputClass}
          />
        );
    }
  }, [props, handlePropChange]);

  const renderUniversalInput = useCallback((prop: UniversalPropDef) => {
    const value = props[prop.name];

    switch (prop.type) {
      case 'number':
        return (
          <input
            type="number"
            value={Number(value ?? prop.defaultValue ?? 0)}
            onChange={(e) => handlePropChange(prop.name, Number(e.target.value))}
            min={prop.min}
            max={prop.max}
            className={baseInputClass}
          />
        );
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(value ?? prop.defaultValue ?? '#000000')}
              onChange={(e) => handlePropChange(prop.name, e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-border-tech"
            />
            <input
              type="text"
              value={String(value ?? prop.defaultValue ?? '')}
              onChange={(e) => handlePropChange(prop.name, e.target.value)}
              className={`${baseInputClass} flex-1 font-mono text-xs`}
            />
          </div>
        );
      case 'select':
        return (
          <select
            value={String(value ?? prop.defaultValue ?? '')}
            onChange={(e) => handlePropChange(prop.name, e.target.value)}
            className={baseInputClass}
          >
            <option value="">None</option>
            {(prop.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={String(value ?? prop.defaultValue ?? '')}
            onChange={(e) => handlePropChange(prop.name, e.target.value)}
            className={baseInputClass}
          />
        );
    }
  }, [props, handlePropChange]);

  return (
    <>
      {/* Dynamic Component Props (from manifest) */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Component Props
        </h3>
        {manifestEntry!.props.map((prop) => (
          <div key={prop.name}>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              {prop.label}
            </label>
            {prop.description && (
              <p className="text-[10px] text-text-secondary/50 mb-1">{prop.description}</p>
            )}
            {renderPropInput(prop)}
          </div>
        ))}
      </div>

      {/* Universal Props (collapsible) */}
      <div className="border-t border-border-tech pt-4">
        <button
          onClick={() => setShowUniversalProps(!showUniversalProps)}
          className="flex items-center gap-2 w-full text-left text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          {showUniversalProps ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Posición y Animación{showStyle ? ' / Estilo' : ''}
        </button>

        {showUniversalProps && (
          <div className="mt-3 space-y-3">
            {relevantUniversals.map((prop) => (
              <div key={prop.name}>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {prop.label}
                </label>
                {renderUniversalInput(prop)}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function AnimationPlayground() {
  const { componentName } = useParams();
  const navigate = useNavigate();

  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [showStyleExamples, setShowStyleExamples] = useState(false);

  const selectedExample = useMemo(
    () => STYLE_SYSTEM_EXAMPLES.find((e) => e.id === activeExample),
    [activeExample]
  );

  // Find the component dynamically
  const Component = componentName ? COMPONENT_REGISTRY[componentName] : null;

  // Get manifest entry for current component
  const manifestEntry = useMemo(
    () => (componentName ? getComponentManifest(componentName) : undefined),
    [componentName]
  );

  // Props state lifted here so Player can read it; child component manages its own defaults
  const [props, setProps] = useState<Record<string, unknown>>({});

  // Fase 2: selector de aspect ratio para validar responsividad en todos los formatos.
  const [aspect, setAspect] = useState<'9:16' | '4:5' | '1:1' | '16:9'>('9:16');

  // Lote A: fondo del preview (color o transparente).
  const [previewTransparent, setPreviewTransparent] = useState(false);
  const [previewBgColor, setPreviewBgColor] = useState('#0f172a');

  // Lote A: envuelve el componente en AnimatedWrapper para que entry/exit SÍ se
  // vean en el Playground (igual que en el render real con AnimaComposer). Las
  // props de animación se quitan del componente interno para no animar doble.
  const PreviewComponent = useMemo(() => {
    if (!Component) return null;
    const Wrapped: React.FC<Record<string, unknown>> = (p) => {
      const { entry, exit, entryDelay, entryDuration, exitDuration, ...rest } = p;
      return (
        <AnimatedWrapper
          entry={(entry as EntryType) || null}
          exit={(exit as ExitType) || null}
          delay={typeof entryDelay === 'number' ? entryDelay : 0}
          entryDuration={typeof entryDuration === 'number' ? entryDuration : 15}
          exitDuration={typeof exitDuration === 'number' ? exitDuration : 15}
          durationInFrames={150}
        >
          <Component {...(rest as Record<string, unknown>)} />
        </AnimatedWrapper>
      );
    };
    return Wrapped;
  }, [Component]);

  if (!Component || !PreviewComponent) {
    return <div className="p-8 text-white">Componente no encontrado.</div>;
  }

  const ASPECTS: Record<'9:16' | '4:5' | '1:1' | '16:9', { w: number; h: number }> = {
    '9:16': { w: 1080, h: 1920 },
    '4:5': { w: 1080, h: 1350 },
    '1:1': { w: 1080, h: 1080 },
    '16:9': { w: 1920, h: 1080 },
  };
  const dim = ASPECTS[aspect];
  const previewScale = Math.min(440 / dim.w, 600 / dim.h);
  const previewW = Math.round(dim.w * previewScale);
  const previewH = Math.round(dim.h * previewScale);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 bg-surface-container border-r border-border-tech p-6 overflow-y-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/admin/animations')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium mb-4"
          >
            <ArrowLeft size={16} />
            Volver a la galería
          </button>
          <h2 className="text-xl font-display font-bold text-text-primary">{componentName}</h2>
          {manifestEntry && (
            <p className="mt-1 text-xs text-text-secondary/70">{manifestEntry.description}</p>
          )}
        </div>

        {/* Style System Examples Toggle */}
        <div className="border-t border-border-tech pt-4">
          <button
            onClick={() => setShowStyleExamples(!showStyleExamples)}
            className="flex items-center gap-2 w-full text-left text-sm font-medium text-text-primary hover:text-mint-precision transition-colors"
          >
            <Palette size={16} />
            Sistema de Estilos
            <span className="ml-auto text-xs text-text-secondary">
              {showStyleExamples ? '▼' : '▶'}
            </span>
          </button>

          {showStyleExamples && (
            <div className="mt-3 space-y-2">
              {STYLE_SYSTEM_EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  onClick={() => setActiveExample(example.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeExample === example.id
                      ? 'bg-mint-precision/10 border border-mint-precision/30 text-mint-precision'
                      : 'bg-surface-lowest border border-border-tech hover:border-mint-precision/30 text-text-primary'
                  }`}
                >
                  <span className="mr-2">{example.icon}</span>
                  {example.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Example Info */}
        {selectedExample && (
          <div className="border-t border-border-tech pt-4">
            <h3 className="text-xs font-medium text-text-secondary mb-2">Ejemplo Activo</h3>
            <div className="bg-surface-lowest border border-border-tech rounded-lg p-3">
              <p className="text-sm text-text-primary font-medium">{selectedExample.name}</p>
              <pre className="mt-2 text-xs text-text-secondary/70 overflow-x-auto font-mono">
                {JSON.stringify(selectedExample.spec, null, 2).substring(0, 300)}...
              </pre>
            </div>
          </div>
        )}

        {/* Component Props Editor — keyed by componentName so React remounts on navigation */}
        {!showStyleExamples && !selectedExample && manifestEntry && componentName && (
          <ComponentPropsEditor
            key={componentName}
            componentName={componentName}
            manifestEntry={manifestEntry}
            onPropsChange={setProps}
          />
        )}

        {/* No manifest entry fallback */}
        {!showStyleExamples && !selectedExample && !manifestEntry && componentName && (
          <div className="text-sm text-text-secondary/70">
            No manifest entry for <span className="font-mono text-text-primary">{componentName}</span>
          </div>
        )}
      </div>

      {/* Player Area */}
      <div className="flex-1 bg-surface-lowest p-8 flex flex-col items-center justify-center relative">
        {/* Controles: aspect ratio + fondo del preview */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(ASPECTS) as Array<keyof typeof ASPECTS>).map((ar) => (
            <button
              key={ar}
              onClick={() => setAspect(ar)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                aspect === ar
                  ? 'bg-mint-precision/10 border border-mint-precision/30 text-mint-precision'
                  : 'bg-surface-container border border-border-tech hover:border-mint-precision/30 text-text-secondary'
              }`}
            >
              {ar}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border-tech" />
          {/* Fondo del preview (Lote A) */}
          <button
            onClick={() => setPreviewTransparent((t) => !t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              previewTransparent
                ? 'bg-mint-precision/10 border border-mint-precision/30 text-mint-precision'
                : 'bg-surface-container border border-border-tech hover:border-mint-precision/30 text-text-secondary'
            }`}
            title="Fondo transparente"
          >
            Transparente
          </button>
          <input
            type="color"
            value={previewBgColor}
            onChange={(e) => { setPreviewBgColor(e.target.value); setPreviewTransparent(false); }}
            className="w-8 h-8 rounded cursor-pointer border border-border-tech"
            title="Color de fondo del preview"
          />
        </div>
        <div
          className="p-4 rounded-xl shadow-2xl border border-border-tech"
          // Tablero de ajedrez para visualizar la transparencia.
          style={previewTransparent ? {
            backgroundColor: '#1a1a1a',
            backgroundImage: 'linear-gradient(45deg,#2a2a2a 25%,transparent 25%),linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2a 75%),linear-gradient(-45deg,transparent 75%,#2a2a2a 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
          } : { backgroundColor: 'var(--surface-container, #16181d)' }}
        >
          <Player
            key={`${aspect}-${previewTransparent}`}
            component={PreviewComponent}
            inputProps={{ ...props, x: dim.w / 2, y: dim.h / 2 }}
            durationInFrames={150} // 5 segundos
            compositionWidth={dim.w}
            compositionHeight={dim.h}
            fps={30}
            style={{
              width: `${previewW}px`,
              height: `${previewH}px`,
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: previewTransparent ? 'transparent' : previewBgColor,
            }}
            controls
            autoPlay
            loop
          />
        </div>
        <p className="mt-4 text-xs text-text-secondary/60 text-center max-w-sm">
          Vista previa en canvas {dim.w}×{dim.h} ({aspect}), escalado a {previewW}×{previewH}. Cambia formato/fondo y prueba las animaciones de entrada/salida.
        </p>
      </div>
    </div>
  );
}

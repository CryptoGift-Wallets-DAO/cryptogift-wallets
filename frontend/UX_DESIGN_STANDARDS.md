# UX DESIGN STANDARDS - CryptoGift Wallets
## Estándares de Diseño de Experiencia de Usuario

*Documentación oficial de patrones de diseño y estándares UX para toda la plataforma*

---

## 🎨 LEARNING PATH COMPONENT - DISEÑO MAESTRO

El componente **LearningPath** establece el estándar de diseño UX para toda la plataforma. Todos los componentes interactivos deben seguir estos principios.

### 📋 PRINCIPIOS FUNDAMENTALES

#### 1. FILOSOFÍA UX CENTRAL
- **Diseño Limpio**: Eliminar elementos visuales innecesarios (botones X, indicadores redundantes)
- **Interacción Natural**: Hover/touch como sistema principal de navegación
- **Feedback Visual**: Animaciones spring physics para respuesta táctil
- **Mobile-First**: Identical behavior entre desktop y mobile

#### 2. SISTEMA HOVER/TOUCH OBLIGATORIO

```typescript
// ✅ PATRÓN CORRECTO: Hover system con state management
const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());

// Desktop Events
onMouseEnter={() => handleNodeHover(nodeId, nodeStatus)}
onMouseLeave={() => handleNodeUnhover(nodeId)}

// Mobile Events (IDÉNTICOS)
onTouchStart={() => handleNodeHover(nodeId, nodeStatus)}
onTouchEnd={() => handleNodeUnhover(nodeId)}
```

```typescript
// ❌ PATRÓN INCORRECTO: Click toggles con botones
const [showCard, setShowCard] = useState(false);
onClick={() => setShowCard(!showCard)} // NO USAR
```

#### 3. CLICK OUTSIDE TO CLOSE

```typescript
// ✅ IMPLEMENTACIÓN CORRECTA
useEffect(() => {
  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    const target = event.target as Element;
    
    // Detectar si click fue en elemento relevante
    if (target.closest('[data-card]') || target.closest('[data-node]')) {
      return; // No cerrar si click en card o nodo
    }
    
    // Cerrar todas las cards visibles
    if (visibleCards.size > 0) {
      setVisibleCards(new Set());
    }
  };

  // Solo agregar listeners cuando necesarios
  if (visibleCards.size > 0) {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }
}, [visibleCards]);
```

### 🎭 ANIMATION STANDARDS

#### Spring Physics Obligatorio

```typescript
// ✅ CONFIGURACIÓN ESTÁNDAR
// Cards de información
transition={{ 
  type: "spring",
  stiffness: 300,    // Velocidad de respuesta
  damping: 25,       // Suavidad
  duration: 0.4      // Duración máxima
}}

// Hover en nodos  
whileHover={{ 
  scale: 1.1,
  transition: { 
    type: "spring", 
    stiffness: 400,  // Más rápido para hover
    damping: 10      // Más rebote
  }
}}
```

#### Secuencias de Animación

```typescript
// ✅ ENTRY ANIMATION
initial={{ opacity: 0, y: -20, scale: 0.8 }}
animate={{ opacity: 1, y: 0, scale: 1 }}

// ✅ EXIT ANIMATION  
exit={{ opacity: 0, y: -10, scale: 0.9 }}
```

### 💎 GLASS MORPHISM STANDARDS

```css
/* ✅ GLASS EFFECT OBLIGATORIO */
.glass-card {
  /* Background con transparencia */
  background: linear-gradient(
    135deg, 
    rgba(255, 255, 255, 0.95) 0%, 
    rgba(255, 255, 255, 0.90) 100%
  );
  
  /* Dark mode */
  .dark & {
    background: linear-gradient(
      135deg,
      rgba(31, 41, 55, 0.95) 0%,
      rgba(17, 24, 39, 0.90) 100%
    );
  }
  
  /* Blur effects */
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  
  /* Borders y shadows */
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* Border radius */
  border-radius: 1rem; /* 16px */
}
```

### 📐 POSITIONING MATHEMATICS

#### Card Positioning Formula

```typescript
// ✅ FÓRMULA DE POSICIONAMIENTO
const nodeSize = compact ? 60 : 80;

// SVG Dimensions (incluir espacio para cards)
const svgWidth = Math.max(...nodes.map(n => n.position.x)) + 300;
const svgHeight = Math.max(...nodes.map(n => n.position.y)) + 350; // +350px para cards

// Card Position (SIEMPRE DEBAJO del nodo)
const cardTop = node.position.y + nodeSize / 2 + 15; // 15px de separación
const cardLeft = node.position.x - 100; // Centrada (card width = 200px)
```

### 🎯 CONDITIONAL INDICATORS

```typescript
// ✅ INDICADORES CONDICIONALES
{node.status !== 'locked' && (
  <text
    x={node.position.x}
    y={node.position.y + nodeSize / 2 + 12}
    textAnchor="middle"
    fontSize="10"
    fill="#6B7280"
    className="pointer-events-none select-none"
  >
    {visibleCards.has(node.id) ? 'Click → Entrenar' : 'Hover → Info'}
  </text>
)}

// ❌ INCORRECTO: Mostrar indicadores en nodos locked
{/* NO hacer esto */}
<text>Click → Info</text> // Sin verificar status
```

---

## 🚀 APLICACIÓN A OTROS COMPONENTES

### Modal Systems
- Usar mismo sistema click-outside-to-close
- Aplicar glass morphism effects
- Spring physics para enter/exit animations

### Dropdown Menus
- Hover para desktop, touch para mobile
- No botones de cierre, click outside to close
- Positioning debajo del trigger element

### Card Grids
- Hover effects con scale: 1.05
- Glass morphism backgrounds
- Consistent spacing y border radius

### Form Interactions
- Focus states con spring animations
- Error states con shake animations
- Success feedback con scale + opacity

---

## 📝 CHECKLIST DE CUMPLIMIENTO

Al crear/modificar componentes interactivos, verificar:

- [ ] ✅ Sistema hover/touch implementado (no solo click)
- [ ] ✅ Click outside to close funcional
- [ ] ✅ NO botones X innecesarios
- [ ] ✅ Animaciones spring physics (stiffness: 300, damping: 25)
- [ ] ✅ Glass morphism effects aplicados
- [ ] ✅ Mobile events idénticos a desktop events
- [ ] ✅ Indicadores condicionales (solo elementos activos)
- [ ] ✅ Event listeners cleanup en useEffect
- [ ] ✅ Positioning mathematics correctas
- [ ] ✅ Responsive behavior verificado

---

## 🔧 HERRAMIENTAS Y LIBRERÍAS

### Animaciones
- **Framer Motion**: Única librería permitida para animaciones
- **AnimatePresence**: Para exit animations
- **Spring Physics**: Configuración estándar documentada

### Styling
- **Tailwind CSS**: Sistema de design tokens
- **Backdrop filters**: Para glass morphism
- **Custom CSS**: Solo cuando Tailwind no sea suficiente

### State Management
- **useState**: Para state local de UI
- **useRef**: Para referencias DOM
- **useEffect**: Para event listeners y cleanup

---

**Estos estándares son OBLIGATORIOS para mantener consistencia UX en toda la plataforma.**

*Última actualización: Agosto 2024*
*Mantenido por: El equipo de CryptoGift Wallets*
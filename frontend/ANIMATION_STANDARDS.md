# ANIMATION STANDARDS - CryptoGift Wallets
## Estándares de Animaciones y Efectos Visuales

*Especificaciones técnicas para animaciones consistentes en toda la plataforma*

---

## 🎭 FRAMER MOTION - CONFIGURACIÓN ESTÁNDAR

### 📋 PRINCIPIOS FUNDAMENTALES

#### 1. SPRING PHYSICS OBLIGATORIO
Todas las animaciones deben usar **spring physics** para naturalidad y respuesta táctil.

```typescript
// ✅ CONFIGURACIÓN ESTÁNDAR - USAR SIEMPRE
const standardSpring = {
  type: "spring",
  stiffness: 300,    // Velocidad de respuesta
  damping: 25,       // Suavidad y rebote
  duration: 0.4      // Duración máxima
};
```

#### 2. CATEGORÍAS DE ANIMACIÓN

```typescript
// 🎯 CARD ANIMATIONS (Learning Path, Modals)
const cardAnimations = {
  initial: { opacity: 0, y: -20, scale: 0.8 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.9 },
  transition: { 
    type: "spring",
    stiffness: 300,
    damping: 25,
    duration: 0.4
  }
};

// 🖱️ HOVER ANIMATIONS (Buttons, Nodes)  
const hoverAnimations = {
  scale: 1.1,
  transition: { 
    type: "spring", 
    stiffness: 400,  // Más rápido para hover
    damping: 10      // Más rebote para feedback
  }
};

// 👆 TAP ANIMATIONS (Click feedback)
const tapAnimations = {
  scale: 0.95,
  transition: { 
    type: "spring",
    stiffness: 600,  // Muy rápido
    damping: 20
  }
};

// 🌊 PAGE TRANSITIONS
const pageTransitions = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3 }
};
```

### 🎨 GLASS MORPHISM ANIMATIONS

```typescript
// ✅ GLASS CARD CON ANIMACIONES
<motion.div
  className="
    backdrop-blur-xl backdrop-saturate-150
    bg-gradient-to-br from-white/95 to-white/90 
    dark:from-gray-800/95 dark:to-gray-900/90
    border border-white/20 dark:border-gray-700/30
    rounded-2xl shadow-2xl
  "
  initial={{ opacity: 0, y: -20, scale: 0.8 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: -10, scale: 0.9 }}
  transition={{ 
    type: "spring",
    stiffness: 300,
    damping: 25,
    duration: 0.4
  }}
  whileHover={{ 
    scale: 1.02,
    transition: { type: "spring", stiffness: 400, damping: 10 }
  }}
  whileTap={{ scale: 0.98 }}
>
  Content here
</motion.div>
```

### 🌟 LOADING & PROGRESS ANIMATIONS

```typescript
// ✅ PROGRESS RING ANIMATION
<motion.circle
  r={radius}
  stroke="currentColor"
  strokeWidth="4"
  fill="transparent"
  strokeDasharray={circumference}
  strokeDashoffset={circumference}
  animate={{ 
    strokeDashoffset: circumference - (progress / 100) * circumference 
  }}
  transition={{
    type: "spring",
    stiffness: 100,
    damping: 20,
    duration: 1.5
  }}
/>

// ✅ SKELETON LOADING
<motion.div
  className="bg-gray-200 dark:bg-gray-700 rounded"
  animate={{
    opacity: [0.5, 1, 0.5]
  }}
  transition={{
    duration: 1.5,
    repeat: Infinity,
    ease: "easeInOut"
  }}
/>

// ✅ PULSE EFFECT
<motion.div
  animate={{
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1]
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }}
>
  Pulse content
</motion.div>
```

### 🎯 ESPECÍFICOS POR COMPONENTE

#### Learning Path Nodes
```typescript
// ✅ NODE HOVER EFFECT
whileHover={node.status !== 'locked' ? { 
  scale: 1.1,
  transition: { type: "spring", stiffness: 400, damping: 10 }
} : undefined}

// ✅ NODE TAP EFFECT  
whileTap={node.status !== 'locked' ? { scale: 0.95 } : undefined}

// ✅ GLOW ANIMATION PARA NODOS ACTIVOS
{(isActive || node.status === 'in-progress') && (
  <circle
    className="animate-pulse"
    opacity="0.2"
  />
)}
```

#### Modal Animations
```typescript
// ✅ MODAL BACKDROP
<motion.div
  className="fixed inset-0 bg-black/50 backdrop-blur-sm"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
>

// ✅ MODAL CONTENT
<motion.div
  initial={{ scale: 0.9, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.9, opacity: 0 }}
  transition={{ 
    type: "spring",
    stiffness: 300,
    damping: 25
  }}
>
```

#### Button Animations
```typescript
// ✅ STANDARD BUTTON
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>

// ✅ PRIMARY ACTION BUTTON
<motion.button
  className="bg-gradient-to-r from-purple-500 to-pink-500"
  whileHover={{ 
    scale: 1.05,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 15 }}
>
```

---

## 🚀 PERFORMANCE & OPTIMIZACIÓN

### 📊 MEJORES PRÁCTICAS

#### 1. LAZY ANIMATION LOADING
```typescript
// ✅ CONDITIONAL ANIMATIONS
const shouldAnimate = useInView(ref, { once: true });

<motion.div
  initial={{ opacity: 0 }}
  animate={shouldAnimate ? { opacity: 1 } : {}}
  transition={{ duration: 0.5 }}
>
```

#### 2. ANIMATION PRESENCE
```typescript
// ✅ SIEMPRE USAR AnimatePresence PARA EXIT ANIMATIONS
<AnimatePresence mode="wait">
  {showModal && (
    <motion.div
      key="modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      Modal content
    </motion.div>
  )}
</AnimatePresence>
```

#### 3. WILL-CHANGE OPTIMIZATION
```css
/* ✅ APLICAR EN ELEMENTOS ANIMADOS */
.animated-element {
  will-change: transform, opacity;
}

/* ❌ NO USAR EN TODOS LOS ELEMENTOS */
* {
  will-change: auto; /* Default, solo cambiar cuando necesario */
}
```

### 🎛️ ANIMATION CONTROLS

```typescript
// ✅ ANIMATION CONTROLS PARA SECUENCIAS COMPLEJAS
const controls = useAnimation();

useEffect(() => {
  if (isVisible) {
    controls.start({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        staggerChildren: 0.1
      }
    });
  }
}, [isVisible, controls]);

<motion.div
  animate={controls}
  initial={{ opacity: 0, y: 20 }}
>
```

---

## 🔧 DEBUGGING & TOOLS

### 📱 ANIMATION DEBUGGING

```typescript
// ✅ DEBUG MODE PARA ANIMACIONES
const DEBUG_ANIMATIONS = process.env.NODE_ENV === 'development';

<motion.div
  animate={{ x: 100 }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 25,
    // Debug: Slow motion para testing
    duration: DEBUG_ANIMATIONS ? 2 : 0.4
  }}
>
```

### 🎥 ANIMATION VARIANTS

```typescript
// ✅ VARIANTS PARA ANIMACIONES REUTILIZABLES
const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: -20, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.9 
  }
};

<motion.div
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
>
```

---

## 📋 CHECKLIST DE ANIMACIONES

### ✅ OBLIGATORIO EN CADA ANIMACIÓN:
- [ ] ✅ Spring physics configurado (stiffness: 300, damping: 25)
- [ ] ✅ Hover effects para elementos interactivos
- [ ] ✅ Tap feedback en botones y elementos clickeables
- [ ] ✅ Exit animations con AnimatePresence
- [ ] ✅ Performance: useInView para animaciones costosas
- [ ] ✅ Mobile compatibility verificada
- [ ] ✅ Reduced motion respeta prefers-reduced-motion
- [ ] ✅ Loading states animados apropiadamente

### 🚫 EVITAR:
- ❌ Animaciones sin spring physics (linear animations)
- ❌ Durations fijas sin transition types
- ❌ Exit animations sin AnimatePresence
- ❌ will-change en todos los elementos
- ❌ Animaciones que bloquean la UI
- ❌ Efectos que causan motion sickness

---

## 🎨 TEMAS Y COLORES EN ANIMACIONES

### 🌓 DARK MODE SUPPORT
```typescript
// ✅ ANIMACIONES QUE RESPETAN TEMA
<motion.div
  className="
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
  "
  animate={{
    backgroundColor: [
      "rgb(255, 255, 255)", // light
      "rgb(31, 41, 55)"     // dark - adjust based on theme
    ]
  }}
  transition={{ duration: 0.3 }}
>
```

### 🎨 GRADIENT ANIMATIONS
```typescript
// ✅ ANIMATED GRADIENTS
<motion.div
  className="bg-gradient-to-r"
  animate={{
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
  }}
  style={{
    backgroundSize: "200% 200%"
  }}
  transition={{
    duration: 3,
    repeat: Infinity,
    ease: "linear"
  }}
>
```

---

**Estos estándares garantizan animaciones consistentes, performantes y accesibles en toda la plataforma.**

*Última actualización: Agosto 2024*
*Mantenido por: El equipo de CryptoGift Wallets*
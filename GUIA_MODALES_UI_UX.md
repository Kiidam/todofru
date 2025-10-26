# Guía de Desarrollo de Módulos TodoFrut - v2.0

Esta guía establece los estándares y mejores prácticas para el desarrollo de módulos en la plataforma TodoFrut, garantizando consistencia visual, accesibilidad y funcionalidad óptima.

## 🎯 **OBJETIVO PRINCIPAL**
Asegurar que **TODOS** los módulos nuevos y existentes tengan características consistentes, texto legible y funcionalidad uniforme.

---

## 📋 **CHECKLIST OBLIGATORIO - TODO MÓDULO NUEVO**

### ✅ **1. LEGIBILIDAD DE TEXTO (CRÍTICO)**
- [ ] **Todos los textos tienen color `text-gray-900` (negro casi absoluto)**
- [ ] **Backgrounds de formularios son `bg-white` (blanco puro)**
- [ ] **Labels usan `text-sm font-medium text-gray-900`**
- [ ] **Placeholders usan color `#6B7280` (gray-500)**
- [ ] **NO usar colores claros como gray-400, gray-300 para texto principal**

### ✅ **2. ESTRUCTURA DE MODAL ESTÁNDAR**
- [ ] Importación dinámica: `const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });`
- [ ] Ancho mínimo 600px en desktop, 90vw en móvil
- [ ] Header con título claro y descriptivo
- [ ] Formulario estructurado con grid layout
- [ ] Botones de acción alineados a la derecha
- [ ] Soporte completo para teclado (Escape, Tab navigation)

### ✅ **3. FORMULARIOS ACCESIBLES**
- [ ] Cada input tiene `id` único y `label` asociado con `htmlFor`
- [ ] Labels descriptivos y claros
- [ ] Placeholders informativos pero no como única descripción
- [ ] Estados de error claramente visibles
- [ ] Validación en tiempo real
- [ ] Soporte completo para navegación con teclado

### ✅ **4. CONSISTENCIA VISUAL**
- [ ] Colores del sistema: Verde `#10B981` para primary, Rojo `#EF4444` para danger
- [ ] Tipografía: Inter font stack
- [ ] Espaciado consistente: padding y margin usando múltiplos de 4px
- [ ] Bordes redondeados: `rounded-lg` (8px) para modales, `rounded-md` (6px) para inputs
- [ ] Sombras estándar para modales

### ✅ **5. FUNCIONALIDAD ESTÁNDAR**
- [ ] CRUD completo (Create, Read, Update, Delete)
- [ ] Búsqueda y filtrado
- [ ] Paginación si hay más de 10 elementos
- [ ] Estados de carga visibles
- [ ] Manejo de errores con mensajes claros
- [ ] Validación tanto frontend como backend

### **❌ PROBLEMA #4: SIDEBAR DUPLICADO**

**NUNCA tengas layouts duplicados** en las carpetas `app/` y `src/app/` porque causan renderizado múltiple de componentes.

#### **❌ INCORRECTO:**
```
├── app/
│   ├── layout.tsx                    ❌ Layout duplicado
│   └── dashboard/
│       └── layout.tsx                ❌ Layout duplicado
└── src/
    └── app/
        ├── layout.tsx                ❌ CAUSA PROBLEMAS
        └── (dashboard)/
            └── layout.tsx            ❌ CAUSA SIDEBAR DOBLE
```

#### **✅ CORRECTO:**
```
├── app/                              ✅ Solo una carpeta app
│   ├── layout.tsx                    ✅ Un solo layout principal
│   └── dashboard/
│       └── layout.tsx                ✅ Un solo layout de dashboard
└── src/
    ├── components/                   ✅ Solo componentes en src
    ├── lib/
    └── utils/
```

**REGLA:** Solo debe existir UNA carpeta `app/` en la raíz del proyecto. La carpeta `src/` debe contener únicamente componentes, utilidades y configuraciones, NUNCA layouts o páginas.

---

## 🎨 **GUÍA DE COLORES Y TIPOGRAFÍA**

### **Colores para Texto (OBLIGATORIO)**
```css
/* USAR SIEMPRE para texto principal */
.text-primary { color: #111827; }      /* text-gray-900 - MUY OSCURO */
.text-secondary { color: #374151; }    /* text-gray-700 - OSCURO */
.text-muted { color: #6B7280; }        /* text-gray-500 - SOLO PARA AYUDA */

/* NUNCA USAR para texto principal */
.text-light { color: #D1D5DB; }        /* text-gray-300 - MUY CLARO */
.text-very-light { color: #F3F4F6; }   /* text-gray-100 - ILEGIBLE */
```

### **Backgrounds Obligatorios**
```css
.modal-bg { background: #FFFFFF; }     /* bg-white - SIEMPRE para modales */
.input-bg { background: #FFFFFF; }     /* bg-white - SIEMPRE para inputs */
.page-bg { background: #F9FAFB; }      /* bg-gray-50 - Para páginas */
```

---

## 🔧 **PLANTILLA DE MÓDULO ESTÁNDAR**

### **1. Estructura de Archivo Base**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface TuEntidad {
  id: string;
  nombre: string;
  // ... otros campos
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  nombre: string;
  // ... otros campos
}

export default function TuModuloPage() {
  // Estados estándar
  const [entidades, setEntidades] = useState<TuEntidad[]>([]);
  const [filteredEntidades, setFilteredEntidades] = useState<TuEntidad[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<TuEntidad | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    // ... otros campos
  });

  // Efectos y funciones...
}
```

### **2. Modal con Texto Legible (OBLIGATORIO)**
```typescript
<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} ariaLabel="Gestionar Entidad">
  <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
    {/* HEADER CON TEXTO OSCURO */}
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-xl font-bold text-gray-900">
        {editingEntity ? 'Editar' : 'Crear Nueva'} Entidad
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        {editingEntity ? 'Modifica los datos de la entidad' : 'Completa los datos para crear una nueva entidad'}
      </p>
    </div>
    
    {/* FORMULARIO CON CONTRASTE ALTO */}
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-900 mb-2">
          Nombre *
        </label>
        <input
          id="nombre"
          type="text"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Ingrese el nombre de la entidad"
          required
        />
      </div>
      
      {/* MÁS CAMPOS... */}
      
      {/* BOTONES CON CONTRASTE ALTO */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => setIsModalOpen(false)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
        >
          {editingEntity ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  </div>
</Modal>
```

---

## 🎯 **CLASES CSS ESTÁNDAR OBLIGATORIAS**

### **Para Labels (SIEMPRE usar esto)**
```css
.label-standard {
  @apply block text-sm font-medium text-gray-900 mb-2;
}
```

### **Para Inputs (SIEMPRE usar esto)**
```css
.input-standard {
  @apply w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white 
         focus:ring-2 focus:ring-green-500 focus:border-transparent
         placeholder:text-gray-500;
}
```

### **Para Botones Primarios**
```css
.btn-primary {
  @apply px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 
         rounded-md transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2;
}
```

### **Para Botones Secundarios**
```css
.btn-secondary {
  @apply px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 
         rounded-md transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2;
}
```

---

## 📱 **RESPONSIVIDAD OBLIGATORIA**

### **Breakpoints Estándar**
```css
/* Mobile First Approach */
.modal-content {
  @apply w-full max-w-[90vw] p-4;
}

/* Tablet */
@media (min-width: 768px) {
  .modal-content {
    @apply max-w-2xl p-6;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .modal-content {
    @apply max-w-4xl;
  }
}
```

---

## 🔍 **TESTING OBLIGATORIO**

### **Checklist de Pruebas**
- [ ] **Contraste**: Texto claramente legible en todos los tamaños
- [ ] **Navegación por teclado**: Tab, Enter, Escape funcionan correctamente
- [ ] **Responsive**: Funciona en móvil (375px), tablet (768px) y desktop (1024px+)
- [ ] **Estados**: Loading, error, success se muestran correctamente
- [ ] **CRUD**: Crear, leer, actualizar y eliminar funcionan sin errores
- [ ] **Validación**: Frontend y backend validan correctamente
- [ ] **Accesibilidad**: Screen readers pueden navegar el formulario

---

## 🚨 **ERRORES CRÍTICOS A EVITAR**

### **❌ PROBLEMA #1: DOBLE X EN MODALES**

**NUNCA agregues un botón X manual en el header del modal**. El componente Modal ya incluye automáticamente un botón X.

#### **❌ INCORRECTO (causa doble X):**
```typescript
// ❌ NUNCA hacer esto - causa doble X
<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
    <h3>Título</h3>
    <button onClick={() => setIsModalOpen(false)}>×</button>  {/* ❌ X DUPLICADA */}
  </div>
</Modal>
```

#### **✅ CORRECTO (sin doble X):**
```typescript
// ✅ SIEMPRE usar así - sin X manual
<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
  <div className="px-6 py-4 border-b border-gray-200">
    <h3 className="text-lg font-bold text-gray-900">Título del Modal</h3>
    <p className="text-sm text-gray-600 mt-1">Descripción del modal</p>
  </div>
  {/* El componente Modal ya maneja el botón X automáticamente */}
</Modal>
```

### **❌ PROBLEMA #2: TEXTO ILEGIBLE**

#### **❌ INCORRECTO:**
```typescript
// ❌ Texto muy claro - ILEGIBLE
<label className="text-gray-400">Nombre</label>
<input className="text-gray-300" />
```

#### **✅ CORRECTO:**
```typescript
// ✅ Texto oscuro y legible
<label className="block text-sm font-medium text-gray-900 mb-2">Nombre</label>
<input className="text-gray-900 bg-white" />
```

### **❌ PROBLEMA #3: FALTA DE ESTRUCTURA**

#### **❌ INCORRECTO:**
```typescript
// ❌ Sin estructura clara
<Modal>
  <input placeholder="Nombre" />
  <button>Guardar</button>
</Modal>
```

#### **✅ CORRECTO:**
```typescript
// ✅ Estructura completa y clara
<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} ariaLabel="Crear entidad">
  <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
    {/* HEADER */}
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-bold text-gray-900">Crear Nueva Entidad</h3>
      <p className="text-sm text-gray-600 mt-1">Completa los datos para crear una nueva entidad</p>
    </div>
    
    {/* FORMULARIO */}
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-900 mb-2">
          Nombre *
        </label>
        <input
          id="nombre"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
          required
        />
      </div>
      
      {/* BOTONES */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" className="btn-primary">
          Crear
        </button>
      </div>
    </form>
  </div>
</Modal>
```

---

## 📚 **EJEMPLOS DE REFERENCIA**

### **Módulos Implementados Correctamente:**
1. **app/dashboard/productos/page.tsx** - ⭐ PLANTILLA DE REFERENCIA
2. **app/dashboard/clientes/page.tsx** - Ejemplo completo con CRUD
3. **app/dashboard/proveedores/page.tsx** - Ejemplo con validaciones

### **Para copiar estructura:**
```bash
# Usar como base para nuevos módulos
cp app/dashboard/productos/page.tsx app/dashboard/nuevo-modulo/page.tsx
```

---

## 🎯 **PROTOCOLO DE IMPLEMENTACIÓN**

### **Pasos Obligatorios para Nuevos Módulos:**

1. **📋 PLANIFICACIÓN**
   - Definir entidad y campos requeridos
   - Crear interfaces TypeScript
   - Diseñar API endpoints necesarios

2. **🏗️ ESTRUCTURA BASE**
   - Copiar plantilla de módulo de referencia
   - Adaptar interfaces y tipos
   - Configurar estados básicos

3. **🎨 IMPLEMENTACIÓN UI**
   - Aplicar clases CSS estándar obligatorias
   - Verificar contraste de texto (usar herramientas como Contrast Checker)
   - Implementar responsive design

4. **⚡ FUNCIONALIDAD**
   - Implementar CRUD completo
   - Agregar validaciones frontend y backend
   - Manejar estados de error y loading

5. **🧪 TESTING**
   - Probar en todos los breakpoints
   - Verificar navegación por teclado
   - Validar accesibilidad con screen reader
   - Testear todas las funciones CRUD

6. **📝 DOCUMENTACIÓN**
   - Actualizar este archivo con nuevos módulos
   - Documentar cualquier patrón especial implementado

---

## 🔧 **HERRAMIENTAS RECOMENDADAS**

### **Para Verificar Contraste:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### **Para Testing de Accesibilidad:**
- [axe DevTools](https://www.deque.com/axe/devtools/) (Extensión Chrome)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)

### **Para Testing Responsive:**
- Chrome DevTools Device Mode
- [ResponsiveDesignChecker](https://responsivedesignchecker.com/)

---

## 📊 **ESTADO ACTUAL DE MÓDULOS**

| Módulo | Legibilidad | Modal | Responsive | CRUD | Testing | Estado |
|--------|-------------|-------|------------|------|---------|--------|
| Productos | ✅ | ✅ | ✅ | ✅ | ✅ | ⭐ REFERENCIA |
| Clientes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Proveedores | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Inventarios | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Pedidos-Compra | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Marcas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Categorías | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Unidad Medida | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Tipo Artículo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Grupo Cliente | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Razón Social | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Documentos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |
| Cuentas Cobrar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ COMPLETO |

---

## 🎯 **CONCLUSIÓN**

**REGLA DE ORO**: Si un módulo no pasa el test de legibilidad (texto claramente visible sin esfuerzo), NO está listo para producción.

**EVERY MODULE MUST HAVE**:
- ✅ Texto negro/oscuro (`text-gray-900`)
- ✅ Background blanco en formularios (`bg-white`)
- ✅ Modal estructurado según plantilla
- ✅ Funcionalidad CRUD completa
- ✅ Responsive design
- ✅ Accesibilidad básica (labels, keyboard nav)

---

**Fecha de Actualización**: Septiembre 2025  
**Estado**: ✅ SISTEMA ESTABLE Y FUNCIONAL  
**Prioridad**: MANTENER ESTÁNDARES DE CALIDAD  
**Responsable**: Equipo TodoFrut

---

## 1. Modal de Creación/Edición: Requerimientos Generales

- **El modal debe ser un overlay**: debe abrirse sobre la vista actual, bloqueando la interacción con el fondo y sin navegar a otra página.
- **Centrado y espacioso**: el modal debe estar centrado y tener un ancho mínimo de 600px, o 40% del viewport. En dispositivos pequeños, debe ocupar hasta el 90% del ancho.
- **Padding interno**: suficiente espacio interno para que el contenido no se vea apretado.
- **Responsivo**: el modal debe adaptarse a distintos tamaños de pantalla.
- **Tipografía legible**: todos los textos e inputs deben tener contraste suficiente.
- **No romper flujos**: la apertura/cierre del modal no debe provocar recargas ni navegación de rutas.
- **React Portals**: Implementado usando portales para renderizar fuera del DOM tree.
- **Keyboard support**: Soporte completo para navegación con teclado (Escape para cerrar).

### Ejemplo de CSS para el modal

```css
.modal-content {
  min-width: 600px;
  max-width: 90vw;
  width: 40vw;
  padding: 2rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
@media (max-width: 768px) {
  .modal-content {
    min-width: unset;
    width: 90vw;
    padding: 1rem;
  }
}
```

---

## 2. Aplicación en todos los módulos

✅ **COMPLETADO**: Modal unificado aplicado en todos los módulos:
  - **✅ Productos** (Referencia implementada)
  - **✅ Agrupador de Productos**
  - **✅ Proveedores**
  - **✅ Clientes**
  - **✅ Grupo de Cliente**
  - **✅ Tipo de Artículo**
  - **✅ Marcas**
  - **✅ Unidad de Medida**
  - **✅ Razón Social**
  - **✅ Documentos**

- El modal debe ser reutilizable y coherente visualmente en todos los casos.

---

## 3. Arquitectura del Componente Modal

### 3.1. Implementación Técnica

```typescript
// src/components/ui/Modal.tsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, ariaLabel }) => {
  // Soporte para teclado y scroll management
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};
```

### 3.2. Uso en Módulos

```typescript
// Importación dinámica para SSR
const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

// Uso en componente
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  ariaLabel="Crear nuevo producto"
>
  <div className="modal-header">
    <h2 className="text-xl font-bold text-gray-900 mb-6">
      {editing ? 'Editar' : 'Crear Nuevo'} Producto
    </h2>
  </div>
  <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
    {/* Contenido del formulario */}
  </form>
</Modal>
```

---

## 4. Contraste y Color de Texto

### 4.1. Inputs y Labels en Modales

- Todos los inputs, labels y textos dentro del modal deben tener colores de texto suficientemente oscuros y legibles.
- Asegúrate de que no haya textos "muy claros" o poco diferenciables, ni en estados normales, deshabilitados o con foco.

### 4.2. Placeholders en Inputs de Búsqueda

✅ **IMPLEMENTADO**: El color del placeholder debe ser visible y con buen contraste.
- Utiliza `#8a8a8a` para el color del placeholder.

```css
/* app/globals.css */
input::placeholder {
  color: #8a8a8a !important;
  opacity: 1;
}
```

---

## 5. Estándares de Accesibilidad (WCAG)

### 5.1. Formularios Accesibles

✅ **IMPLEMENTADO EN TODOS LOS MÓDULOS**:

```typescript
// Ejemplo de campo accesible
<div>
  <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-2">
    Nombre del Producto
  </label>
  <input
    id="product-name"
    type="text"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
    placeholder="Ingrese el nombre del producto"
    required
    aria-describedby="product-name-help"
  />
  <span id="product-name-help" className="text-xs text-gray-500">
    Nombre único para identificar el producto
  </span>
</div>
```

### 5.2. Elementos Select

```typescript
// Select con etiqueta accesible
<div>
  <label htmlFor="product-status" className="block text-sm font-medium text-gray-700 mb-2">
    Estado
  </label>
  <select
    id="product-status"
    value={formData.status}
    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
    aria-describedby="product-status-help"
  >
    <option value="active">Activo</option>
    <option value="inactive">Inactivo</option>
  </select>
  <span id="product-status-help" className="text-xs text-gray-500">
    Estado actual del producto en el sistema
  </span>
</div>
```

---

## 6. Buenas prácticas

- No dupliques lógica de apertura/cierre de modales, usa un componente modal reutilizable.
- Mantén la lógica de navegación en la vista principal, nunca navegues a otra ruta para abrir formularios.
- Usa las variables y estilos globales del sistema para mantener la coherencia visual.
- Haz pruebas en móvil y escritorio para asegurar la responsividad.

---

## 5. Ejemplo de Componente Modal Reutilizable en React

```jsx
// Modal.jsx
export default function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(60, 70, 90, 0.65);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          min-width: 600px;
          max-width: 90vw;
          width: 40vw;
          padding: 2rem;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        @media (max-width: 768px) {
          .modal-content {
            min-width: unset;
            width: 90vw;
            padding: 1rem;
          }
        }
        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
```

---

## 6. CSS Global Implementado

```css
/* app/globals.css */

/* Overlay del modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
  backdrop-filter: blur(2px);
}

/* Contenido del modal */
.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  min-width: 300px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: scale(1);
  transition: all 0.2s ease-out;
}

/* Responsive */
@media (min-width: 768px) {
  .modal-content {
    min-width: 600px;
    width: 40vw;
  }
}

/* Placeholder mejorado */
input::placeholder,
textarea::placeholder {
  color: #8a8a8a !important;
  opacity: 1;
}

/* Focus states mejorados */
input:focus,
textarea:focus,
select:focus {
  outline: none;
  ring: 2px;
  ring-color: #10b981;
  border-color: transparent;
}
```

---

## 7. Estado Final del Proyecto

### Módulos Con Estado Crítico ⚠️

| Módulo | Estado | Errores | Acción Requerida |
|--------|--------|---------|------------------|
| **Pedidos de Compra** | 🔴 Crítico | Null reference errors | Recrear con validaciones |
| **Cuentas por Cobrar** | 🔴 Eliminado | Corrupción total | Recrear desde cero |
| Productos | ✅ | 0 | Funcional |
| Agrupador de Productos | ✅ | 0 | Funcional |
| Clientes | ✅ | 0 | Funcional |
| Proveedores | ✅ | 0 | Funcional |
| Marcas | ✅ | 0 | Funcional |
| Unidad de Medida | ✅ | 0 | Funcional |
| Tipo de Artículo | ✅ | 0 | Funcional |
| Grupo de Cliente | ✅ | 0 | Funcional |
| Razón Social | ✅ | 0 | Funcional |
| Documentos | ✅ | 0 | Funcional |

### Protocolo de Recuperación 🔧

1. **PASO 1**: Limpiar archivos corruptos completamente
2. **PASO 2**: Recrear módulos desde plantilla funcional (usar Productos como referencia)
3. **PASO 3**: Implementar validaciones null/undefined estrictas
4. **PASO 4**: Probar cada módulo individualmente antes de integración
5. **PASO 5**: **NO realizar ediciones masivas** - Una a la vez

### Módulos Completados ✅

| Módulo | Estado | Accesibilidad | Modal Component |
|--------|--------|---------------|-----------------|
| Productos | ✅ | ✅ | ✅ |
| Agrupador de Productos | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ |
| Proveedores | ✅ | ✅ | ✅ |
| Marcas | ✅ | ✅ | ✅ |
| Unidad de Medida | ✅ | ✅ | ✅ |
| Tipo de Artículo | ✅ | ✅ | ✅ |
| Grupo de Cliente | ✅ | ✅ | ✅ |
| Razón Social | ✅ | ✅ | ✅ |
| Documentos | ✅ | ✅ | ✅ |

### Tecnologías Utilizadas

- **Next.js 15.5.2** con Turbopack
- **React 18** con Hooks
- **TypeScript** para tipado estricto ⚠️ **(ERRORES ACTIVOS)**
- **Tailwind CSS** para estilos
- **React Portals** para modales
- **Dynamic Imports** para SSR optimization

### Estado Actual - Enero 2025 🚨

1. **⚠️ Sistema Comprometido**: 1,242+ errores de compilación
2. **🔴 Módulos Afectados**: Pedidos de Compra, Cuentas por Cobrar
3. **🔧 En Reparación**: Limpieza y recreación en progreso
4. **✅ Módulos Funcionales**: 10 de 12 módulos operativos
5. **📋 Protocolo Actualizado**: Nuevas medidas de seguridad implementadas
6. **⏱️ Prioridad**: Resolver errores antes de nuevas funcionalidades

---

## Protocolo de Seguridad para Futuras Modificaciones

### ⚠️ ADVERTENCIAS CRÍTICAS:

1. **NO** realizar ediciones masivas de archivos
2. **NO** modificar múltiples módulos simultáneamente  
3. **SIEMPRE** verificar compilación después de cada cambio
4. **USAR** módulo de Productos como plantilla de referencia
5. **IMPLEMENTAR** validaciones null/undefined estrictas

### Pasos Obligatorios Antes de Editar:

```bash
# 1. Verificar estado actual
npm run build

# 2. Backup del archivo (si la compilación pasa)
cp archivo-original.tsx archivo-original.backup.tsx

# 3. Editar UNO a la vez
# 4. Verificar inmediatamente
npm run build

# 5. Si hay errores, revertir inmediatamente
```

---

**Fecha de Actualización**: Enero 2025  
**Estado**: 🚨 SISTEMA EN REPARACIÓN CRÍTICA  
**Prioridad**: MÁXIMA - Estabilización del sistema  
**Responsable**: Equipo TodoFrut

**⚠️ ESTE DOCUMENTO REFLEJA EL ESTADO REAL ACTUAL DEL SISTEMA**
## Entrada numérica consistente

- Todos los campos numéricos (cantidad, precio unitario, totales editables) deben seleccionar su contenido al recibir foco. Al escribir, el nuevo valor reemplaza el existente, evitando concatenaciones.
- Los inputs deben usar `type="number"` con `min` y `step` apropiados según el contexto.
- No se debe mostrar texto auxiliar dentro de las opciones de selección (por ejemplo, evitar paréntesis o descripciones largas). Las opciones de unidad deben ser cortas y claras: `unidad`, `kg`, `g`, `t`, `lt`, `ml`.
- Mantener recalculo en tiempo real de subtotales y totales cuando cambie cantidad o precio.
- Aplicar esta regla en todos los formularios donde el usuario ingrese cantidades o precios.

# Guía de Modales y Mejora de UI/UX en TodoFrut

Esta guía documenta los cambios, buenas prácticas y requerimientos implementados en la plataforma TodoFrut para la gestión de formularios modales, contraste de textos y consistencia visual en todos los módulos.

**✅ Estado: COMPLETADO - Todos los módulos unificados (Septiembre 2025)**

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
- **TypeScript** para tipado estricto
- **Tailwind CSS** para estilos
- **React Portals** para modales
- **Dynamic Imports** para SSR optimization

### Beneficios Alcanzados

1. **🎯 Consistencia**: Todos los modales siguen el mismo patrón
2. **♿ Accesibilidad**: Cumple estándares WCAG 2.1
3. **📱 Responsive**: Funciona perfectamente en todos los dispositivos
4. **⚡ Performance**: Optimizado con dynamic imports y portals
5. **🔧 Mantenible**: Componente reutilizable y documentado
6. **🎨 UX Mejorada**: Microinteracciones y transiciones suaves

---

**Fecha de Finalización**: Septiembre 9, 2025  
**Estado**: ✅ PROYECTO COMPLETADO  
**Mantenedor**: Equipo TodoFrut

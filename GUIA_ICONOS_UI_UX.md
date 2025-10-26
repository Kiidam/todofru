# Guía de Iconos UI/UX

Objetivo: asegurar el uso consistente de iconos en todos los módulos del proyecto.

## Principios generales

- Tamaño base: `h-5 w-5`.
- Estilo de acción: icono sin texto, color por tipo de acción.
- Contenedor: `flex items-center space-x-3` dentro de la celda de Acciones.
- Accesibilidad: usar `title` y `aria-label` descriptivos.
- Hover: usar variantes más oscuras del mismo color para feedback.

## Mapeo de acciones → icono y color

- Ver: `Eye` → `text-gray-700 hover:text-gray-900`.
- Editar: `Edit2` → `text-blue-600 hover:text-blue-800`.
- Activar: `CheckCircle` → `text-green-600 hover:text-green-800`.
- Desactivar: `Ban` → `text-yellow-600 hover:text-yellow-800`.
- Eliminar: `Trash2` → `text-red-600 hover:text-red-800`.
- Imprimir: `Printer` → `text-gray-700 hover:text-gray-900`.
- Exportar: `FileDown` → `text-gray-700 hover:text-gray-900`.
- Importar: `FileUp` → `text-gray-700 hover:text-gray-900`.

## Ejemplo estándar de celda de acciones

```tsx
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex items-center space-x-3">
    <button
      onClick={onEdit}
      className="text-blue-600 hover:text-blue-800"
      title="Editar"
      aria-label="Editar"
    >
      <Edit2 className="h-5 w-5" />
    </button>
    <button
      onClick={onToggle}
      className={isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}
      title={isActive ? 'Desactivar' : 'Activar'}
      aria-label={isActive ? 'Desactivar' : 'Activar'}
    >
      {isActive ? <Ban className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
    </button>
    <button
      onClick={onDelete}
      className="text-red-600 hover:text-red-800"
      title="Eliminar"
      aria-label="Eliminar"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  </div>
</td>
```

## Módulos y aplicación

- Inventarios: usar `Edit2`, `Ban/CheckCircle`, `Trash2` como arriba.
- Ventas y Compras: `Eye`, `Printer`, `Edit2` para listado/detalle.
- Productos: acciones de mantenimiento iguales a Inventarios.
- Proveedores/Clientes: `Eye` y `Edit2` en listas; `Trash2` sólo si aplica.

## Notas

- Mantener consistencia de colores y tamaños en todos los módulos.
- Evitar texto dentro de los botones de acción; usar tooltips (`title`).
- Si se requiere un estado deshabilitado, aplicar `opacity-50 cursor-not-allowed`.
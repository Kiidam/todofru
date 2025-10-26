# Guía de Estilo de Tablas y Proveedores (UI/UX)

Objetivo: Establecer un estándar visual y funcional para todas las tablas del sistema y para el formulario modal de "Agregar proveedor", asegurando coherencia global.

## 1) Estándar Global para Tablas

Aplicar de forma consistente en todos los módulos: Productos, Proveedores, Clientes, Inventarios, etc.

- Bordes: `border border-gray-200` en el contenedor y `border-b border-gray-200` en el `thead`.
- Colores:
  - Fondo tabla: `bg-white`
  - Fondo encabezado: `bg-gray-50`
  - Texto principal: `text-gray-900`
  - Texto secundario: `text-gray-700`
- Espaciado y padding:
  - Encabezados: `px-6 py-3`
  - Filas: `px-6 py-4`
- Tamaño de fuente:
  - Encabezados: `text-xs font-semibold uppercase tracking-wider`
  - Celdas: `text-sm`
- Efecto hover de fila: `hover:bg-gray-50 transition-colors`
- Contenedor: `bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden`
- Tabla: `w-full`

### Plantilla base (usar en todo el sistema)

```html
<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <table class="w-full">
    <thead class="bg-gray-50 border-b border-gray-200">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Columna A</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Columna B</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Acciones</th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4 text-sm text-gray-900">Dato A</td>
        <td class="px-6 py-4 text-sm text-gray-900">Dato B</td>
        <td class="px-6 py-4 text-right">
          <button class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50">Editar</button>
          <button class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50">Eliminar</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Reglas adicionales
- Sin estilos inline; usar utilidades Tailwind estándar.
- Badges de estado:
  - Activo: `inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800`
  - Inactivo: `inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800`
- Íconos de acciones: tamaño `w-4 h-4` y color según acción.

---

## 2) Lista de Proveedores (estilo estandarizado)

Debe seguir el estándar de tabla anterior, con columnas y encabezados consistentes y formato de datos uniforme.

- Columnas recomendadas: Proveedor | Doc (DNI/RUC) | Teléfono | Email | Dirección | Acciones
- Alineación: todas `text-left`; acciones `text-right`.
- Formato de datos:
  - Teléfono: formato E.164 (`+51 999 999 999`)
  - Email: en minúsculas, validado
  - Documento: solo dígitos (DNI: 8, RUC: 11)

### Ejemplo de tabla de proveedores

```html
<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <table class="w-full">
    <thead class="bg-gray-50 border-b border-gray-200">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Proveedor</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Doc</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Teléfono</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Email</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Dirección</th>
        <th class="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Acciones</th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4 text-sm text-gray-900">Razón Social / Nombre</td>
        <td class="px-6 py-4 text-sm text-gray-900">20601030013</td>
        <td class="px-6 py-4 text-sm text-gray-900">+51 998 123 456</td>
        <td class="px-6 py-4 text-sm text-gray-900">proveedor@correo.com</td>
        <td class="px-6 py-4 text-sm text-gray-900">Av. Central 123</td>
        <td class="px-6 py-4 text-right">
          <button class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Editar">✏️</button>
          <button class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="Eliminar">🗑️</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 3) "Agregar proveedor" (modal unificado)

- El botón "Agregar Proveedor" abre un formulario modal.
- Estilos del modal: coherentes con el sistema (ver `GUIA_MODALES_UI_UX.md`).
- Campos requeridos:
  - Tipo de documento: selector `DNI`/`RUC`
  - `numeroIdentificacion` (DNI: 8, RUC: 11)
  - `razonSocial` (min 3 caracteres)
  - `telefono` (formato E.164)
  - `email` (formato válido)
  - `direccion` (min 10 caracteres)
- Validaciones consistentes: mismas reglas usadas en Clientes/Proveedores.

### Plantilla visual del formulario

```html
<div class="p-6 bg-white rounded-lg">
  <h3 class="text-xl font-bold text-gray-900 mb-4">Agregar Proveedor</h3>
  <form class="space-y-4">
    <div class="flex gap-2">
      <button type="button" class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900 bg-white">DNI</button>
      <button type="button" class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900 bg-white">RUC</button>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-900 mb-2">DNI/RUC *</label>
      <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-green-500" placeholder="Ingrese DNI (8) o RUC (11)" />
      <p class="mt-1 text-sm text-red-600">Mensaje de validación</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-900 mb-2">Razón Social *</label>
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-900 mb-2">Representante Legal (opcional)</label>
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-green-500" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-900 mb-2">Teléfono *</label>
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-green-500" placeholder="+51 999 999 999" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-900 mb-2">Email *</label>
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-green-500" placeholder="correo@proveedor.com" />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-900 mb-2">Dirección *</label>
      <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-green-500" />
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
      <button type="button" class="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200">Cancelar</button>
      <button type="submit" class="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">Guardar proveedor</button>
    </div>
  </form>
</div>
```

---

## 4) Aplicación Global y Consistencia

- Usar esta guía en todas las tablas del sistema.
- Los modales deben seguir el mismo diseño visual (tipografía, colores, espaciados) y validaciones consistentes.
- Agregar las clases recomendadas a los componentes existentes de tablas y formularios.
- Si se crea un nuevo módulo, debe utilizar esta plantilla de tabla y el modal estándar.

### Integración sugerida (CSS global)
Añadir (si es necesario) utilidades en `app/globals.css` para refinar consistencia:

```css
/* Mejorar contraste de placeholders */
input::placeholder { color: #8a8a8a; opacity: 1; }
/* Tamaño mínimo de hit-area para acciones en tablas */
.table-action { padding: 0.5rem; border-radius: 0.5rem; }
```

---

Fecha de actualización: Octubre 2025  
Responsable: Equipo TodoFru  
Estado: Estándar aplicado en guía; debe implementarse en los módulos de tablas y en el modal de proveedores.
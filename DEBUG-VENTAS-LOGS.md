# 🐛 DEBUG DE VENTAS - LOGS DETALLADOS

## 📋 CAMBIOS REALIZADOS

Se agregaron logs detallados en el endpoint `/api/pedidos-venta` para identificar exactamente dónde falla el proceso de registro de ventas.

---

## 🔍 LOGS AGREGADOS

### **1. Validación Inicial**
```
📥 Body recibido en /api/pedidos-venta: {...}
✅ Datos validados: { clienteId, fecha, motivo, numeroPedido, fechaEntrega, itemsCount }
```

### **2. Validación de Cliente**
```
🔍 Validando cliente: [clienteId]
✅ Cliente validado: [clienteId]
```

### **3. Validación de Productos**
```
🔍 Validando productos...
✅ Productos encontrados: X de Y
```

### **4. Validación de Stock**
```
🔍 Validando stock...
  Producto [id]: stock=X, necesario=Y
  Producto [id]: stock=X, necesario=Y
✅ Stock suficiente para todos los productos
```

### **5. Cálculo de Totales**
```
💰 Totales calculados: { subtotal, impuestos, total }
```

### **6. Información de Usuario y Fecha**
```
🔍 Usuario ID: [userId]
📅 Fecha de venta: [fecha]
📝 Número de pedido: [numero]
```

### **7. Transacción de Base de Datos**
```
💾 Iniciando transacción...
✅ Pedido creado: [pedidoId]
✅ Items del pedido creados
✅ Stock actualizado para [productoId]: X → Y
✅ Movimiento de inventario creado para [productoId]
✅ Transacción completada exitosamente
```

### **8. Errores (si los hay)**
```
❌ Error de validación: {...}
❌ Productos duplicados: [...]
❌ Algunos productos no existen o están inactivos
❌ Stock insuficiente para producto [id]
❌ Error en transacción: [error]
❌ Error general en POST /api/pedidos-venta: [error]
```

---

## 🧪 CÓMO USAR LOS LOGS

### **Paso 1: Abrir Terminal del Servidor**

Busca la terminal donde está corriendo `npm run dev`. Ahí aparecerán todos los logs del servidor.

### **Paso 2: Intentar Registrar una Venta**

1. Abrir: `http://localhost:3000/dashboard/movimientos/ventas`
2. Hacer clic en "Registrar venta"
3. Seleccionar productos y cliente
4. Hacer clic en "Confirmar registro"

### **Paso 3: Revisar Logs en la Terminal**

Busca los logs que empiezan con emojis:
- 📥 → Datos recibidos
- 🔍 → Proceso de validación
- ✅ → Operación exitosa
- ❌ → Error encontrado

### **Paso 4: Identificar el Problema**

El **ÚLTIMO LOG CON ❌** te dirá exactamente qué está fallando:

#### **Ejemplo 1: Error de Usuario**
```
🔍 Usuario ID: undefined
❌ Error en transacción: Column 'usuarioId' cannot be null
```
**Solución:** Problema con la autenticación. Hacer logout/login.

#### **Ejemplo 2: Error de Stock**
```
🔍 Validando stock...
  Producto abc123: stock=5, necesario=10
❌ Stock insuficiente para producto abc123
```
**Solución:** El producto no tiene suficiente stock.

#### **Ejemplo 3: Error de Cliente**
```
🔍 Validando cliente: xyz789
❌ Cliente no encontrado o inactivo
```
**Solución:** El cliente está inactivo o no existe.

#### **Ejemplo 4: Error de Producto**
```
🔍 Validando productos...
✅ Productos encontrados: 0 de 1
❌ Algunos productos no existen o están inactivos
```
**Solución:** El producto seleccionado está inactivo o no existe.

---

## 🎯 CHECKLIST DE VERIFICACIÓN

Cuando intentes registrar una venta, verifica que veas estos logs EN ORDEN:

- [ ] 📥 Body recibido
- [ ] ✅ Datos validados
- [ ] 🔍 Validando cliente
- [ ] ✅ Cliente validado
- [ ] 🔍 Validando productos
- [ ] ✅ Productos encontrados
- [ ] 🔍 Validando stock
- [ ] ✅ Stock suficiente
- [ ] 💰 Totales calculados
- [ ] 🔍 Usuario ID
- [ ] 📅 Fecha de venta
- [ ] 📝 Número de pedido
- [ ] 💾 Iniciando transacción
- [ ] ✅ Pedido creado
- [ ] ✅ Items del pedido creados
- [ ] ✅ Stock actualizado
- [ ] ✅ Movimiento de inventario creado
- [ ] ✅ Transacción completada

**Si todos estos logs aparecen:** La venta se registró correctamente.

**Si alguno falta o hay un ❌:** Ahí está el problema.

---

## 🔧 SOLUCIONES RÁPIDAS

### **Error: "usuarioId cannot be null"**

**Causa:** El usuario no está autenticado correctamente.

**Solución:**
1. Hacer logout del sistema
2. Hacer login nuevamente
3. Verificar que el log muestre: `🔍 Usuario ID: [un UUID válido]`

---

### **Error: "Stock insuficiente"**

**Causa:** El producto no tiene suficiente stock.

**Solución:**
1. Ir a Productos
2. Editar el producto
3. Aumentar el stock
4. Intentar nuevamente la venta

---

### **Error: "Cliente no encontrado"**

**Causa:** El cliente está inactivo o fue eliminado.

**Solución:**
1. Ir a Clientes
2. Verificar que el cliente existe y está activo
3. Si está inactivo, activarlo
4. Intentar nuevamente la venta

---

### **Error: "Producto no encontrado"**

**Causa:** El producto está inactivo o fue eliminado.

**Solución:**
1. Ir a Productos
2. Verificar que el producto existe y está activo
3. Si está inactivo, activarlo
4. Intentar nuevamente la venta

---

## 📊 SIGUIENTE PASO

**AHORA DEBES:**

1. ✅ Verificar que el servidor se reinició con los nuevos cambios
2. ✅ Abrir la terminal donde corre `npm run dev`
3. ✅ Intentar registrar una venta
4. ✅ **COPIAR Y PEGAR TODOS LOS LOGS** que aparezcan en la terminal
5. ✅ Buscar el último log con ❌
6. ✅ Ese log te dirá exactamente cuál es el problema

---

## 📝 EJEMPLO COMPLETO DE LOGS EXITOSOS

```
📥 Body recibido en /api/pedidos-venta: {
  "clienteId": "cliente-001",
  "fecha": "2025-10-28",
  "motivo": "Pedido de venta #PV-123456",
  "numeroPedido": "PV-123456",
  "fechaEntrega": "2025-10-30",
  "items": [
    {
      "productoId": "prod-001",
      "cantidad": 10,
      "precio": 20
    }
  ]
}
✅ Datos validados: {
  clienteId: 'cliente-001',
  fecha: '2025-10-28',
  motivo: 'Pedido de venta #PV-123456',
  numeroPedido: 'PV-123456',
  fechaEntrega: '2025-10-30',
  itemsCount: 1
}
🔍 Validando cliente: cliente-001
✅ Cliente validado: cliente-001
🔍 Validando productos...
✅ Productos encontrados: 1 de 1
🔍 Validando stock...
  Producto prod-001: stock=100, necesario=10
✅ Stock suficiente para todos los productos
💰 Totales calculados: { subtotal: 200, impuestos: 0, total: 200 }
🔍 Usuario ID: user-123
📅 Fecha de venta: 2025-10-28T00:00:00.000Z
📝 Número de pedido: PV-123456
💾 Iniciando transacción...
✅ Pedido creado: pedido-abc-123
✅ Items del pedido creados
✅ Stock actualizado para prod-001: 100 → 90
✅ Movimiento de inventario creado para prod-001
✅ Transacción completada exitosamente
```

---

**Fecha:** 28 de octubre de 2025  
**Estado:** ✅ LOGS AGREGADOS  
**Por:** GitHub Copilot

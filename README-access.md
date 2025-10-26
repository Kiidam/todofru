# Acceso y Revisión del Sistema TodaFru



## 1. Credenciales de acceso
- Usuario: `admin@todafru.com`
- Contraseña: `admin123`
- Nota: Son credenciales de desarrollo habilitadas en el proveedor de credenciales del sistema.

## 2. URL de ingreso
- Login: `http://localhost:3000/login`
- Dashboard: `http://localhost:3000/dashboard`
- Si el servidor corre en otro puerto (por ejemplo `3002`), usa `http://localhost:3002/login` y `http://localhost:3002/dashboard`.

## 3. Puesta en marcha
- Requisitos:
  - Navegador: `Google Chrome` o `Firefox` actualizado.
  - Variables de entorno: `.env` con `NEXTAUTH_SECRET` y `DATABASE_URL` apuntando a MySQL.
- Arranque del servidor:
  - En el directorio `todofru/`: 
    - Desarrollo: `npm run dev` (Turbopack) → abre `http://localhost:3000`.
    - Producción: `npm run build` y `npm run start`.
- Datos de ejemplo (opcional para demos rápidas):
  1. Abrir MySQL Workbench.
  2. Ejecutar `USE <tu_base_de_datos>;`.
  3. Cargar y ejecutar `todofru/scripts/sample-data.sql` (inserta usuarios, productos, proveedor/cliente, compra/venta y movimientos).

## 4. Pasos para navegar y qué revisar
- Login:
  1. Ve a `http://localhost:3000/login`.
  2. Ingresa las credenciales y pulsa “Iniciar sesión”.
  3. Debes ir al dashboard.

- Inventario:
  - Menú lateral → `Inventario`.
  - Verifica productos (`Espinaca Baby`, `Tomate`) con `stock`, `precio` y `valor de stock`.

- Proveedores:
  - Menú lateral → `Proveedores`.
  - Valida `Agrícola San José S.A.C.` como proveedor activo.

- Clientes:
  - Menú lateral → `Clientes`.
  - Verifica `Bazar Las Flores`.

- Productos:
  - Menú lateral → `Productos`.
  - Revisa atributos y unidad de medida (`kg`).

- Movimientos:
  - Menú lateral → `Movimientos`.
  - Compras:
    - `Movimientos → Compras` → “Registrar compra”.
    - Proveedor: `Agrícola San José S.A.C.`.
    - Ítems: `Espinaca Baby` 2 kg a 2.00; `Tomate` 2 kg a 6.50.
    - Confirma y valida que se genere un pedido (`PC-YYYY-XXXXXX`) y que el stock aumente (movimientos `ENTRADA`).
  - Ventas:
    - `Movimientos → Ventas` → “Registrar venta”.
    - Cliente: `Bazar Las Flores`.
    - Ítems de prueba: Espinaca 1 kg; Tomate 0.5 kg.
    - Confirma y valida movimientos `SALIDA` y stock descontado.

## 5. Validaciones rápidas esperadas
- Tras registrar compra y venta de ejemplo:
  - Espinaca: stock ≈ `1 kg`.
  - Tomate: stock ≈ `1.5 kg`.
  - `Movimientos` muestra las operaciones con precio y vínculo a pedidos.

## 6. Soporte
- Correo de contacto: `admin@todafru.com`.
- En un reporte, incluir: captura del error, acción realizada (p.e. “Registrar compra”), hora aproximada y navegador.
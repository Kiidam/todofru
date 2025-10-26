/*
  Script de pruebas del nuevo módulo de proveedores
  - Prueba RENIEC (DNI) vía ruta interna: /api/integrations/decolecta/reniec?dni=XXXXXXX
  - Prueba SUNAT (RUC) vía ruta interna: /api/integrations/decolecta/sunat?ruc=XXXXXXXXXXX
  - Prueba creación de proveedor (si hay sesión/autorización)
*/

(async () => {
  const base = process.env.TEST_BASE_URL || "http://localhost:3004";

  const log = (label, data) => {
    console.log(`\n=== ${label} ===`);
    console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
  };

  const commonHeaders = {
    Accept: "application/json",
    // Forzar bypass de autenticación en entorno de prueba
    "x-test-bypass-auth": "1",
  };

  // Helper para GET
  async function get(path) {
    const url = `${base}${path}`;
    const resp = await fetch(url, { headers: commonHeaders });
    let body;
    try { body = await resp.json(); } catch { body = { ok: false, error: "JSON parse error" }; }
    return { status: resp.status, body };
  }

  // Helper para POST
  async function post(path, payload) {
    const url = `${base}${path}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { ...commonHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body;
    try { body = await resp.json(); } catch { body = { ok: false, error: "JSON parse error" }; }
    return { status: resp.status, body };
  }

  // 1) RENIEC (DNI)
  const dni = process.env.TEST_DNI || "46027897";
  const reniec = await get(`/api/integrations/decolecta/reniec?dni=${dni}`);
  log("RENIEC GET", reniec);

  // 2) SUNAT (RUC)
  const ruc = process.env.TEST_RUC || "20601030013";
  const sunat = await get(`/api/integrations/decolecta/sunat?ruc=${ruc}`);
  log("SUNAT GET", sunat);

  // 3) Crear proveedor (bypass de auth activado)
  const payload = {
    tipoEntidad: "PERSONA_JURIDICA",
    razonSocial: sunat.body?.data?.razonSocial || "Proveedor de prueba S.A.",
    nombre: sunat.body?.data?.razonSocial || "Proveedor de prueba S.A.",
    numeroIdentificacion: ruc,
    direccion: sunat.body?.data?.direccion || "Av. Siempre Viva 123",
    telefono: "+51 999 999 999",
    email: "proveedor@test.dev",
    representanteLegal: "Homero Simpson",
  };

  const create = await post("/api/proveedores", payload);
  log("Crear proveedor POST", create);
})();
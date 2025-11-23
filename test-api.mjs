import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/clientes/ruc?ruc=74216474',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

console.log('🔍 Probando endpoint:', `http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log('📥 Status:', res.statusCode);
  console.log('📦 Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Respuesta:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('❌ Error parseando JSON:', e.message);
      console.log('📄 Data recibida:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error en la petición:', e.message);
});

req.end();

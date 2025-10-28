require('dotenv').config();
(async () => {
  try {
    const url = 'http://localhost:3000/api/proveedores?simple=true&limit=50';
    const res = await fetch(url);
    const json = await res.json();
    console.log('CLIENT GOT', (json && json.data && json.data.length) || 0);
  } catch (err) {
    console.error('ERR', err);
    process.exitCode = 2;
  }
})();

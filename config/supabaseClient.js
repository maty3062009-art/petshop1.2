// CONEXION A SUPABASE
// Se crea el cliente UNA vez y se comparte con todo el proyecto.
// Usa la clave SECRETA: solo vive en el servidor, nunca en el front.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configura SUPABASE_URL y SUPABASE_KEY en el archivo .env');
}

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch (error) {
  throw new Error('SUPABASE_URL no es una URL valida', { cause: error });
}

if (!['https:', 'http:'].includes(parsedUrl.protocol) ||
    /^(xxxx|tu-proyecto|your-project)$/i.test(parsedUrl.hostname.split('.')[0]) ||
    /^(tu_clave_secreta|your_secret_key)$/i.test(supabaseKey)) {
  throw new Error('Completa SUPABASE_URL y SUPABASE_KEY con las credenciales reales del proyecto');
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = supabase;

// MODEL DE USUARIOS: registro y login con Supabase Auth
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabaseClient');
// Registro: Auth crea el usuario y nosotros guardamos su perfil
async function registrar(email, password, nombre) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) throw error;

  const { error: perfilError } = await supabase
    .from('perfiles')
    .insert({ id: data.user.id, nombre });

  if (perfilError) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      throw new AggregateError(
        [perfilError, cleanupError],
        'No se pudo guardar el perfil ni limpiar el usuario de Auth'
      );
    }
    throw perfilError;
  }

  return data.user;
}

// Login: devuelve el token, o null si los datos no coinciden
async function iniciarSesion(email, password) {
  const temporal = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await temporal.auth.signInWithPassword({ email, password });
  if (error) return null;
  return data.session?.access_token || null;
}

async function obtenerPerfil(usuarioId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('id', usuarioId)
    .single();

  if (error) throw error;
  return data;
}

module.exports = { registrar, iniciarSesion, obtenerPerfil };

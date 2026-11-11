// MIDDLEWARE: ¿quien compra?
// Va entre la ruta y el controller. Si no hay token valido, corta con 401.
// Si todo esta bien, deja el usuario en req.usuario y sigue.
const supabase = require('../config/supabaseClient');

async function verificarUsuario(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).send('Tenes que iniciar sesion');

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).send('Sesion invalida');

    req.usuario = data.user;
    return next();
  } catch (error) {
    console.error('Error al verificar el usuario:', error);
    return res.status(500).send('No se pudo verificar la sesion');
  }
}

async function verificarAdmin(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', req.usuario.id)
      .single();

    if (error) throw error;
    if (data.rol !== 'admin') return res.status(403).send('No tenes permiso para esta accion');
    return next();
  } catch (error) {
    console.error('Error al verificar el rol de administrador:', error);
    return res.status(500).send('No se pudo verificar el permiso');
  }
}

module.exports = verificarUsuario;
module.exports.verificarAdmin = verificarAdmin;

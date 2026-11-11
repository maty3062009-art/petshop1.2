// MODEL DE PEDIDOS: la compra
const supabase = require('../config/supabaseClient');

// Un error que es culpa del cliente: el controller lo responde con 400
function errorCliente(mensaje) {
  const e = new Error(mensaje);
  e.status = 400;
  return e;
}

// Registra una compra completa:
// busca productos, controla stock, calcula el total, guarda pedido e items
// y descuenta el stock. items = [ { producto_id, cantidad }, ... ]
async function crearPedido(usuarioId, items) {
  const { data, error } = await supabase.rpc('crear_pedido', {
    p_usuario_id: usuarioId,
    p_items: items
  });

  if (error) {
    if (error.message.startsWith('CLIENTE: ')) throw errorCliente(error.message.slice('CLIENTE: '.length));
    throw error;
  }
  return data;
}

async function obtenerPedidos(usuarioId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, total, estado, creado, pedido_items(cantidad, precio_unitario, productos(id, nombre))')
    .eq('usuario_id', usuarioId)
    .order('creado', { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = { crearPedido, obtenerPedidos };

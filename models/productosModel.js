// MODEL DE PRODUCTOS: el catalogo
const supabase = require('../config/supabaseClient');

// Las categorias para el filtro del front (ya resuelto)
async function obtenerCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre')
    .order('nombre');
  if (error) throw error;
  return data;
}

// Los productos activos, con el nombre de su categoria.
// Si llega categoriaId o buscar, filtra por esos valores.
async function obtenerProductos(categoriaId, buscar) {
  const columnas = 'id, nombre, descripcion, precio, stock, imagen_url, categoria_id, categorias(nombre)';
  let consulta = supabase
    .from('productos')
    .select(columnas)
    .eq('activo', true)
    .order('nombre');

  if (categoriaId) consulta = consulta.eq('categoria_id', categoriaId);
  if (buscar) consulta = consulta.ilike('nombre', `%${buscar}%`);

  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

async function obtenerProducto(id) {
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, stock, imagen_url, categoria_id, categorias(nombre)')
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function obtenerProductosAdmin() {
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, stock, imagen_url, categoria_id, activo')
    .order('nombre');

  if (error) throw error;
  return data;
}

async function crearProducto(producto) {
  const { data, error } = await supabase
    .from('productos')
    .insert(producto)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function actualizarProducto(id, producto) {
  const { data, error } = await supabase
    .from('productos')
    .update(producto)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function desactivarProducto(id) {
  const { data, error } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = {
  obtenerCategorias,
  obtenerProductos,
  obtenerProducto,
  obtenerProductosAdmin,
  crearProducto,
  actualizarProducto,
  desactivarProducto
};

// CONTROLLER DE PRODUCTOS
const model = require('../models/productosModel');

async function verCategorias(req, res) {
  try {
    const categorias = await model.obtenerCategorias();
    res.status(200).json(categorias);
  } catch (error) {
    console.error('Error al obtener las categorias:', error);
    res.status(500).send('Error al obtener las categorias');
  }
}

// GET /productos  o  GET /productos?categoria=2
async function verProductos(req, res) {
  const categoriaId = req.query.categoria ? Number(req.query.categoria) : null;
  const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim() : '';
  if (categoriaId !== null && (!Number.isInteger(categoriaId) || categoriaId < 1)) {
    return res.status(400).send('La categoria no es valida');
  }
  if (buscar.length > 100) return res.status(400).send('La busqueda es demasiado larga');

  try {
    const productos = await model.obtenerProductos(categoriaId, buscar);
    res.status(200).json(productos);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    console.error('Error al obtener los productos:', error);
    res.status(500).send('Error al obtener los productos');
  }
}

async function verProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).send('El producto no es valido');

  try {
    const producto = await model.obtenerProducto(id);
    if (!producto) return res.status(404).send('Producto no encontrado');
    return res.status(200).json(producto);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    return res.status(500).send('Error al obtener el producto');
  }
}

function validarProducto(req) {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const { nombre, descripcion, precio, stock, imagen_url, categoria_id } = body;
  const categoriaId = categoria_id === '' || categoria_id === undefined ? null : Number(categoria_id);

  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 120) {
    return { error: 'El nombre es obligatorio y no puede superar 120 caracteres' };
  }
  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return { error: 'La descripcion no es valida' };
  }
  if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0) {
    return { error: 'El precio debe ser un numero mayor o igual a cero' };
  }
  if (!Number.isInteger(stock) || stock < 0) return { error: 'El stock debe ser un entero mayor o igual a cero' };
  if (imagen_url !== undefined && imagen_url !== null && typeof imagen_url !== 'string') {
    return { error: 'La URL de imagen no es valida' };
  }
  if (imagen_url?.trim()) {
    try {
      if (new URL(imagen_url).protocol !== 'https:') return { error: 'La imagen debe usar una URL HTTPS' };
    } catch (error) {
      return { error: 'La URL de imagen no es valida' };
    }
  }
  if (categoriaId !== null && (!Number.isInteger(categoriaId) || categoriaId < 1)) {
    return { error: 'La categoria no es valida' };
  }

  return {
    producto: {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      precio,
      stock,
      imagen_url: imagen_url?.trim() || null,
      categoria_id: categoriaId
    }
  };
}

async function verProductosAdmin(req, res) {
  try {
    return res.status(200).json(await model.obtenerProductosAdmin());
  } catch (error) {
    console.error('Error al listar productos para administracion:', error);
    return res.status(500).send('Error al obtener los productos');
  }
}

async function crearProducto(req, res) {
  const validacion = validarProducto(req);
  if (validacion.error) return res.status(400).send(validacion.error);

  try {
    return res.status(201).json(await model.crearProducto(validacion.producto));
  } catch (error) {
    if (error.code === '23503') return res.status(400).send('La categoria no existe');
    console.error('Error al crear el producto:', error);
    return res.status(500).send('Error al crear el producto');
  }
}

async function actualizarProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).send('El producto no es valido');
  const validacion = validarProducto(req);
  if (validacion.error) return res.status(400).send(validacion.error);

  try {
    const producto = await model.actualizarProducto(id, validacion.producto);
    if (!producto) return res.status(404).send('Producto no encontrado');
    return res.status(200).json(producto);
  } catch (error) {
    if (error.code === '23503') return res.status(400).send('La categoria no existe');
    console.error('Error al actualizar el producto:', error);
    return res.status(500).send('Error al actualizar el producto');
  }
}

async function eliminarProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).send('El producto no es valido');

  try {
    const producto = await model.desactivarProducto(id);
    if (!producto) return res.status(404).send('Producto no encontrado');
    return res.status(200).json(producto);
  } catch (error) {
    console.error('Error al desactivar el producto:', error);
    return res.status(500).send('Error al desactivar el producto');
  }
}

module.exports = {
  verCategorias,
  verProductos,
  verProducto,
  verProductosAdmin,
  crearProducto,
  actualizarProducto,
  eliminarProducto
};

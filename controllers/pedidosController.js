// CONTROLLER DE PEDIDOS
const model = require('../models/pedidosModel');

// POST /pedidos  (protegida: el usuario sale del token, nunca del body)
async function crearPedido(req, res) {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).send('El carrito esta vacio');
  }
  try {
    const pedido = await model.crearPedido(req.usuario.id, items);
    res.status(201).json(pedido);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    console.error('Error al crear el pedido:', error);
    res.status(500).send('Error al crear el pedido');
  }
}

async function verMisPedidos(req, res) {
  try {
    const pedidos = await model.obtenerPedidos(req.usuario.id);
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error('Error al obtener los pedidos:', error);
    return res.status(500).send('Error al obtener tus pedidos');
  }
}

module.exports = { crearPedido, verMisPedidos };

// CONTROLLER DE USUARIOS
const model = require('../models/authModel');

async function registro(req, res) {
  const { email, password, nombre } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || typeof nombre !== 'string' ||
      !email.trim() || !nombre.trim() || password.length < 6) {
    return res.status(400).send('Faltan datos o la contraseña es muy corta');
  }
  try {
    const usuario = await model.registrar(email.trim(), password, nombre.trim());
    res.status(201).json({ id: usuario.id, email: usuario.email });
  } catch (error) {
    if (error.status === 501) return res.status(501).send(error.message);
    console.error('Error al registrar usuario:', error);
    const status = error.status && error.status < 500 ? 400 : 500;
    res.status(status).send(status === 400 ? 'No se pudo registrar: ' + error.message : 'Error al registrar el usuario');
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).send('Faltan datos');
  }
  try {
    const token = await model.iniciarSesion(email, password);
    if (!token) return res.status(401).send('Email o contraseña incorrectos');
    res.status(200).json({ token });
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    console.error('Error al iniciar sesion:', error);
    res.status(500).send('Error al iniciar sesion');
  }
}

async function verPerfil(req, res) {
  try {
    const perfil = await model.obtenerPerfil(req.usuario.id);
    return res.status(200).json({ ...perfil, email: req.usuario.email });
  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    return res.status(500).send('Error al obtener el perfil');
  }
}

module.exports = { registro, login, verPerfil };

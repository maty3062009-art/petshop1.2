// =========================================================
// FRONT DE LA TIENDA
// El front NUNCA habla con Supabase: todo se le pide a nuestra API con fetch.
// Catalogo, carrito, usuarios y compras conectados con la API.
// =========================================================

// ---------- ESTADO ----------
const catalogo = {};  // los productos que ya vinieron de la API, por id (para nombres y precios del carrito)
function leerCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem('carrito') || '[]');
    return Array.isArray(guardado)
      ? guardado.filter(i => i && Number.isInteger(i.producto_id) && i.producto_id > 0 && Number.isInteger(i.cantidad) && i.cantidad > 0)
      : [];
  } catch (error) {
    console.error('El carrito guardado no es valido:', error);
    return [];
  }
}
let carrito = leerCarrito();   // [ { producto_id, cantidad } ]
let token = localStorage.getItem('token');                         // lo guardamos al hacer login
let usuarioEmail = localStorage.getItem('email');
let categoriaActual = null;
let busquedaActual = '';
let productoEditando = null;

function escaparHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caracter]);
}


// =========================================================
// CATALOGO
// =========================================================

// Pide los productos a la API y los dibuja.
// Si categoriaId tiene valor, pide solo los de esa categoria: /productos?categoria=2
async function cargarProductos(categoriaId, buscar = busquedaActual) {
  categoriaActual = categoriaId || null;
  busquedaActual = buscar;
  const parametros = new URLSearchParams();
  if (categoriaActual) parametros.set('categoria', categoriaActual);
  if (busquedaActual) parametros.set('buscar', busquedaActual);
  const url = '/productos' + (parametros.size ? '?' + parametros.toString() : '');

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const mensaje = await res.text();
      document.getElementById('productos').innerHTML = `<p class="vacio">${escaparHTML(mensaje)}</p>`;
      return mostrarMensaje(mensaje, 'error');
    }
    const productos = await res.json();
    pintarProductos(productos);
    pintarCategoriaActiva();
  } catch (error) {
    document.getElementById('productos').innerHTML = '<p class="vacio">No se pudo cargar el catalogo.</p>';
    mostrarMensaje('No se pudo conectar con la tienda', 'error');
    console.error('Error al cargar productos:', error);
  }
}

function buscarProductos(texto) {
  return cargarProductos(categoriaActual, texto.trim());
}

// Dibuja las tarjetas (ya resuelto)
function pintarProductos(lista) {
  const grilla = document.getElementById('productos');
  lista.forEach(p => { catalogo[p.id] = p; });   // los recordamos para el carrito
  pintarCarrito();
  if (lista.length === 0) {
    grilla.innerHTML = '<p class="vacio">No hay productos para mostrar.</p>';
    return;
  }
  grilla.innerHTML = '';
  lista.forEach(p => {
    const sinStock = p.stock < 1;
    grilla.innerHTML += `
      <article class="tarjeta">
        <img src="${escaparHTML(p.imagen_url || '')}" alt="${escaparHTML(p.nombre)}">
        <div class="info">
          <span class="categoria">${escaparHTML(p.categorias ? p.categorias.nombre : '')}</span>
          <h3><a href="/producto.html?id=${encodeURIComponent(p.id)}">${escaparHTML(p.nombre)}</a></h3>
          <p class="descripcion">${escaparHTML(p.descripcion || '')}</p>
          <span class="precio">$${Number(p.precio).toLocaleString('es-AR')}</span>
          <span class="stock">${sinStock ? 'Sin stock' : 'Quedan ' + p.stock}</span>
          <button class="btn btn-principal" onclick="agregar(${p.id})" ${sinStock ? 'disabled' : ''}>
            Agregar al carrito
          </button>
        </div>
      </article>`;
  });
}

// Pide las categorias y arma los botones del filtro (ya resuelto)
async function cargarCategorias() {
  try {
    const res = await fetch('/categorias');
    if (!res.ok) throw new Error(await res.text());
    const categorias = await res.json();
    const nav = document.getElementById('categorias');
    nav.innerHTML = '<button data-id="" onclick="cargarProductos()">Todos</button>';
    categorias.forEach(c => {
      nav.innerHTML += `<button data-id="${c.id}" onclick="cargarProductos(${c.id})">${escaparHTML(c.nombre)}</button>`;
    });
    pintarCategoriaActiva();
  } catch (error) {
    mostrarMensaje('No se pudieron cargar las categorias', 'error');
    console.error('Error al cargar categorias:', error);
  }
}

function pintarCategoriaActiva() {
  document.querySelectorAll('#categorias button').forEach(b => {
    const id = b.dataset.id ? Number(b.dataset.id) : null;
    b.classList.toggle('activa', id === categoriaActual);
  });
}


// =========================================================
// CARRITO (vive en el navegador: no toca la base hasta comprar)
// =========================================================

function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
  pintarCarrito();
}

function agregar(id) {
  const item = carrito.find(i => i.producto_id === id);
  if (item) item.cantidad++;
  else carrito.push({ producto_id: id, cantidad: 1 });
  guardarCarrito();
  mostrarMensaje('Producto agregado al carrito', 'ok');
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(i => i.producto_id === id);
  if (!item) return;
  item.cantidad += cambio;
  if (item.cantidad < 1) carrito = carrito.filter(i => i.producto_id !== id);
  guardarCarrito();
}

// Dibuja el carrito. El total es SOLO para mostrar:
// el total de verdad lo calcula el backend con los precios de la base.
function pintarCarrito() {
  const lista = document.getElementById('carrito-lista');
  let total = 0;
  let unidades = 0;
  lista.innerHTML = '';
  carrito.forEach(item => {
    const p = catalogo[item.producto_id];
    const nombre = p ? p.nombre : 'Producto ' + item.producto_id;
    const subtotal = p ? p.precio * item.cantidad : 0;
    total += subtotal;
    unidades += item.cantidad;
    lista.innerHTML += `
      <li>
        <span>${escaparHTML(nombre)}<br><small>$${subtotal.toLocaleString('es-AR')}</small></span>
        <span class="cantidad">
          <button onclick="cambiarCantidad(${item.producto_id}, -1)">−</button>
          ${item.cantidad}
          <button onclick="cambiarCantidad(${item.producto_id}, 1)">+</button>
        </span>
      </li>`;
  });
  if (carrito.length === 0) lista.innerHTML = '<li>Tu carrito está vacío</li>';
  document.getElementById('carrito-total').textContent = '$' + total.toLocaleString('es-AR');
  document.getElementById('contador').textContent = unidades;
}

function alternarCarrito() {
  document.getElementById('carrito').classList.toggle('oculto');
}


// =========================================================
// USUARIOS: registro, login y salida
// =========================================================

// Manda nombre, email y contraseña a POST /registro.
// Si sale bien (201), avisa y muestra el formulario de login.
async function registrar(evento) {
  evento.preventDefault();      // que el formulario no recargue la pagina
  const datos = {
    nombre: document.getElementById('reg-nombre').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value
  };

  try {
    const res = await fetch('/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    if (!res.ok) return mostrarMensaje(await res.text(), 'error');
    document.getElementById('login-email').value = datos.email;
    document.getElementById('form-registro').reset();
    mostrarRegistro(false);
    mostrarMensaje('Cuenta creada. Ahora podes iniciar sesion.', 'ok');
  } catch (error) {
    mostrarMensaje('No se pudo conectar con la tienda', 'error');
    console.error('Error al registrarse:', error);
  }
}

// Manda email y contraseña a POST /login.
// Si sale bien, guarda el token en localStorage y actualiza la barra.
async function iniciarSesion(evento) {
  evento.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) return mostrarMensaje(await res.text(), 'error');
    const datos = await res.json();
    token = datos.token;
    usuarioEmail = email;
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    cerrarModal();
    document.getElementById('form-login').reset();
    await actualizarSesion();
    mostrarMensaje('Sesion iniciada', 'ok');
  } catch (error) {
    mostrarMensaje('No se pudo conectar con la tienda', 'error');
    console.error('Error al iniciar sesion:', error);
  }
}

function cerrarSesion() {
  token = null;
  usuarioEmail = null;
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  actualizarSesion();
  cerrarPanel('panel-admin');
  cerrarPanel('panel-pedidos');
  mostrarMensaje('Cerraste sesión', 'ok');
}

async function actualizarSesion() {
  const logueado = Boolean(token);
  document.getElementById('saludo').textContent = logueado ? usuarioEmail : '';
  document.getElementById('btn-ingresar').classList.toggle('oculto', logueado);
  document.getElementById('btn-salir').classList.toggle('oculto', !logueado);
  document.getElementById('btn-pedidos').classList.toggle('oculto', !logueado);
  document.getElementById('btn-admin').classList.add('oculto');

  if (!logueado) return;
  try {
    const res = await fetch('/perfil', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return cerrarSesion();
    if (!res.ok) throw new Error(await res.text());
    const perfil = await res.json();
    document.getElementById('saludo').textContent = perfil.nombre || perfil.email;
    document.getElementById('btn-admin').classList.toggle('oculto', perfil.rol !== 'admin');
  } catch (error) {
    mostrarMensaje('No se pudo cargar tu perfil', 'error');
    console.error('Error al cargar el perfil:', error);
  }
}


// =========================================================
// COMPRA
// =========================================================

// Manda el carrito a POST /pedidos con el token en el header Authorization.
// 201: compra hecha (vaciar carrito y recargar productos para ver el stock nuevo)
// 401: no hay sesion (abrir el login)
// 400: algo del carrito no sirve (mostrar el mensaje del servidor)
async function comprar() {
  if (carrito.length === 0) return mostrarMensaje('Tu carrito está vacío', 'error');
  if (!token) {
    mostrarMensaje('Inicia sesion para completar la compra', 'error');
    abrirModal();
    return;
  }

  try {
    const res = await fetch('/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ items: carrito })
    });
    if (res.status === 401) {
      cerrarSesion();
      abrirModal();
      return mostrarMensaje('Tu sesion vencio. Inicia sesion nuevamente.', 'error');
    }
    if (!res.ok) return mostrarMensaje(await res.text(), 'error');

    carrito = [];
    guardarCarrito();
    await cargarProductos(categoriaActual);
    mostrarMensaje('Compra realizada correctamente', 'ok');
  } catch (error) {
    mostrarMensaje('No se pudo completar la compra', 'error');
    console.error('Error al comprar:', error);
  }
}

async function verMisPedidos() {
  const panel = document.getElementById('panel-pedidos');
  panel.classList.remove('oculto');
  const lista = document.getElementById('pedidos-lista');
  lista.textContent = 'Cargando pedidos...';

  try {
    const res = await fetch('/mis-pedidos', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      cerrarSesion();
      abrirModal();
      return;
    }
    if (!res.ok) throw new Error(await res.text());
    const pedidos = await res.json();
    if (!pedidos.length) {
      lista.innerHTML = '<p>Todavia no tenes pedidos.</p>';
      return;
    }
    lista.innerHTML = pedidos.map(pedido => `
      <article class="pedido">
        <h3>Pedido #${pedido.id}</h3>
        <p>${escaparHTML(new Date(pedido.creado).toLocaleString('es-AR'))} · ${escaparHTML(pedido.estado)}</p>
        <ul>${pedido.pedido_items.map(item => `<li>${escaparHTML(item.productos?.nombre || 'Producto')} × ${item.cantidad} · $${item.precio_unitario}</li>`).join('')}</ul>
        <strong>Total: $${Number(pedido.total).toLocaleString('es-AR')}</strong>
      </article>`).join('');
  } catch (error) {
    lista.textContent = 'No se pudieron cargar tus pedidos.';
    console.error('Error al cargar pedidos:', error);
  }
}

function cerrarPanel(id) {
  document.getElementById(id).classList.add('oculto');
}

async function alternarAdmin() {
  const panel = document.getElementById('panel-admin');
  panel.classList.toggle('oculto');
  if (panel.classList.contains('oculto')) return;
  await cargarProductosAdmin();
}

async function cargarProductosAdmin() {
  const lista = document.getElementById('admin-productos');
  lista.textContent = 'Cargando productos...';
  try {
    const res = await fetch('/admin/productos', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      cerrarSesion();
      abrirModal();
      return;
    }
    if (!res.ok) throw new Error(await res.text());
    const productos = await res.json();
    lista.innerHTML = productos.map(producto => `
      <article class="admin-item">
        <div><strong>${escaparHTML(producto.nombre)}</strong><small>${producto.activo ? 'Activo' : 'Inactivo'} · Stock: ${producto.stock}</small></div>
        <button class="btn btn-secundario" onclick="editarProducto(${producto.id})">Editar</button>
        ${producto.activo ? `<button class="btn btn-secundario" onclick="desactivarProducto(${producto.id})">Desactivar</button>` : ''}
      </article>`).join('');
  } catch (error) {
    lista.textContent = 'No se pudieron cargar los productos.';
    console.error('Error al cargar el inventario:', error);
  }
}

async function adminFetch(url, opciones = {}) {
  return fetch(url, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opciones.headers
    }
  });
}

async function guardarProducto(evento) {
  evento.preventDefault();
  const producto = {
    nombre: document.getElementById('admin-nombre').value,
    descripcion: document.getElementById('admin-descripcion').value,
    precio: Number(document.getElementById('admin-precio').value),
    stock: Number(document.getElementById('admin-stock').value),
    imagen_url: document.getElementById('admin-imagen').value,
    categoria_id: document.getElementById('admin-categoria').value
  };
  const url = productoEditando ? `/admin/productos/${productoEditando}` : '/admin/productos';

  try {
    const res = await adminFetch(url, {
      method: productoEditando ? 'PUT' : 'POST',
      body: JSON.stringify(producto)
    });
    if (!res.ok) return mostrarMensaje(await res.text(), 'error');
    limpiarFormularioProducto();
    await cargarProductosAdmin();
    await cargarProductos(categoriaActual);
    mostrarMensaje('Producto guardado', 'ok');
  } catch (error) {
    mostrarMensaje('No se pudo guardar el producto', 'error');
    console.error('Error al guardar producto:', error);
  }
}

async function editarProducto(id) {
  try {
    const res = await adminFetch('/admin/productos');
    if (!res.ok) throw new Error(await res.text());
    const producto = (await res.json()).find(item => item.id === id);
    if (!producto) throw new Error('Producto no encontrado');
    productoEditando = id;
    document.getElementById('admin-nombre').value = producto.nombre;
    document.getElementById('admin-descripcion').value = producto.descripcion || '';
    document.getElementById('admin-precio').value = producto.precio;
    document.getElementById('admin-stock').value = producto.stock;
    document.getElementById('admin-imagen').value = producto.imagen_url || '';
    document.getElementById('admin-categoria').value = producto.categoria_id || '';
    document.getElementById('form-producto-titulo').textContent = 'Editar producto';
    document.getElementById('admin-cancelar').classList.remove('oculto');
  } catch (error) {
    mostrarMensaje('No se pudo cargar el producto', 'error');
    console.error('Error al editar producto:', error);
  }
}

async function desactivarProducto(id) {
  if (!confirm('¿Desactivar este producto?')) return;
  try {
    const res = await adminFetch(`/admin/productos/${id}`, { method: 'DELETE' });
    if (!res.ok) return mostrarMensaje(await res.text(), 'error');
    await cargarProductosAdmin();
    await cargarProductos(categoriaActual);
    mostrarMensaje('Producto desactivado', 'ok');
  } catch (error) {
    mostrarMensaje('No se pudo desactivar el producto', 'error');
    console.error('Error al desactivar producto:', error);
  }
}

function limpiarFormularioProducto() {
  productoEditando = null;
  document.getElementById('form-producto').reset();
  document.getElementById('form-producto-titulo').textContent = 'Nuevo producto';
  document.getElementById('admin-cancelar').classList.add('oculto');
}

// =========================================================
// AYUDANTES DE PANTALLA (ya resueltos)
// =========================================================

function mostrarMensaje(texto, tipo) {
  const caja = document.getElementById('mensaje');
  caja.textContent = texto;
  caja.className = 'mensaje ' + tipo;
  clearTimeout(caja.temporizador);
  caja.temporizador = setTimeout(() => caja.classList.add('oculto'), 4000);
}

function abrirModal() {
  document.getElementById('modal').classList.remove('oculto');
}

function cerrarModal() {
  document.getElementById('modal').classList.add('oculto');
}

function mostrarRegistro(mostrar) {
  document.getElementById('form-registro').classList.toggle('oculto', !mostrar);
  document.getElementById('form-login').classList.toggle('oculto', mostrar);
}


// ---------- AL ABRIR LA PAGINA ----------
async function iniciarTienda() {
  pintarCarrito();
  await Promise.all([cargarCategorias(), cargarProductos()]);
  await actualizarSesion();
}

iniciarTienda();

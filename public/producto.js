function escaparHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caracter]);
}

async function cargarDetalle() {
  const id = new URLSearchParams(location.search).get('id');
  const estado = document.getElementById('estado-producto');
  if (!id || !/^\d+$/.test(id)) {
    estado.textContent = 'Producto no encontrado (404).';
    return;
  }

  try {
    const res = await fetch(`/productos/${encodeURIComponent(id)}`);
    if (res.status === 404) {
      estado.textContent = 'Producto no encontrado (404).';
      return;
    }
    if (!res.ok) throw new Error(await res.text());

    const producto = await res.json();
    estado.classList.add('oculto');
    const detalle = document.getElementById('detalle-producto');
    const sinStock = producto.stock < 1;
    detalle.innerHTML = `
      <img src="${escaparHTML(producto.imagen_url || '')}" alt="${escaparHTML(producto.nombre)}">
      <div>
        <span class="categoria">${escaparHTML(producto.categorias?.nombre || '')}</span>
        <h2>${escaparHTML(producto.nombre)}</h2>
        <p>${escaparHTML(producto.descripcion || '')}</p>
        <strong class="precio">$${Number(producto.precio).toLocaleString('es-AR')}</strong>
        <p class="stock">${sinStock ? 'Sin stock' : `Quedan ${producto.stock}`}</p>
        <button id="agregar-detalle" class="btn btn-principal" ${sinStock ? 'disabled' : ''}>Agregar al carrito</button>
      </div>`;
    detalle.classList.remove('oculto');
    if (!sinStock) {
      document.getElementById('agregar-detalle').addEventListener('click', () => {
        let items = [];
        try {
          const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
          if (Array.isArray(carrito)) {
            items = carrito.filter(actual => actual &&
              Number.isInteger(actual.producto_id) && actual.producto_id > 0 &&
              Number.isInteger(actual.cantidad) && actual.cantidad > 0);
          }
        } catch (error) {
          console.error('El carrito guardado no es valido:', error);
        }
        const item = items.find(actual => actual.producto_id === producto.id);
        if (item) item.cantidad += 1;
        else items.push({ producto_id: producto.id, cantidad: 1 });
        localStorage.setItem('carrito', JSON.stringify(items));
        location.href = '/';
      });
    }
  } catch (error) {
    estado.textContent = 'No se pudo cargar el producto.';
    console.error('Error al cargar detalle:', error);
  }
}

cargarDetalle();

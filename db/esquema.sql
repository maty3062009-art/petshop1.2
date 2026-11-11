-- =========================================================
-- BASE DE LA TIENDA
-- Pegalo en el SQL Editor de Supabase y apreta Run.
-- Catalogo de Pet Shop: alimento, juguetes y cuidado para perros y gatos.
-- =========================================================

-- ===== TABLAS =====
create table categorias (
  id     bigint generated always as identity primary key,
  nombre text not null unique
);

create table productos (
  id           bigint generated always as identity primary key,
  nombre       text not null,
  descripcion  text,
  precio       numeric(10,2) not null check (precio >= 0),
  stock        int not null default 0 check (stock >= 0),
  imagen_url   text,
  categoria_id bigint references categorias(id),
  activo       boolean not null default true
);

-- Los usuarios los maneja Supabase Auth (auth.users).
-- Aca guardamos lo que Auth no guarda: el nombre y el rol.
create table perfiles (
  id     uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol    text not null default 'cliente' check (rol in ('cliente', 'admin'))
);

create table pedidos (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id),
  total      numeric(10,2) not null check (total >= 0),
  estado     text not null default 'pendiente'
             check (estado in ('pendiente', 'confirmado', 'cancelado')),
  creado     timestamptz not null default now()
);

create table pedido_items (
  id              bigint generated always as identity primary key,
  pedido_id       bigint not null references pedidos(id) on delete cascade,
  producto_id     bigint not null references productos(id),
  cantidad        int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0)  -- la foto del precio
);

-- ===== SEGURIDAD: cerramos las tablas al publico =====
-- Con la clave publica no se puede leer ni escribir nada.
-- Nuestro backend entra igual porque usa la clave secreta.
alter table categorias   enable row level security;
alter table productos    enable row level security;
alter table perfiles     enable row level security;
alter table pedidos      enable row level security;
alter table pedido_items enable row level security;

-- ===== PRODUCTOS DE PET SHOP =====
insert into categorias (nombre) values
  ('Alimento para perros'),
  ('Alimento para gatos'),
  ('Juguetes y cuidado');

insert into productos (nombre, descripcion, precio, stock, categoria_id, imagen_url) values
  ('Purina Pro Plan Adulto Perro 3 kg', 'Alimento completo para perros adultos de razas medianas.', 28500, 12, 1, null),
  ('Purina Pro Plan Puppy Perro 2 kg', 'Nutrición para cachorros en crecimiento.', 24900, 8, 1, null),
  ('Purina Pro Plan Adulto Gato 2 kg', 'Alimento para gatos adultos, recomendado por veterinarios.', 31900, 6, 2, null),
  ('Purina Gati Carne Gato 1 kg', 'Alimento completo sabor carne y pollo para gatos adultos.', 7800, 15, 2, null),
  ('Pelota mordedora para perro', 'Pelota de goma resistente con textura para jugar.', 6500, 10, 3, null),
  ('Mordillo de cuerda para perro', 'Juguete de cuerda trenzada ideal para tirar y jugar.', 5900, 7, 3, null),
  ('Shampoo para perro 250 ml', 'Shampoo de higiene para el cuidado del pelaje.', 4200, 1, 3, null),
  ('Ratones de tela para gato', 'Set de ratoncitos de tela livianos para estimular el juego.', 3500, 12, 3, null),
  ('Varita con plumas para gato', 'Juguete interactivo con plumas para compartir tiempo de juego.', 4800, 0, 3, null);

-- ===== IMAGENES =====
-- 1. En Supabase Storage, crea un bucket PUBLICO llamado "productos".
-- 2. Sube las nueve fotos de imgs con estos nombres (sin cambiar mayusculas/minusculas):
--    alimento-perro-adulto.jpg, alimento-perro-cachorro.jpg,
--    alimento-gato-adulto.jpg, alimento-gato-carne.jpg,
--    pelota-mordedora.jpg, mordillo-cuerda.jpg, shampoo-perro.jpg,
--    raton-gato.jpg, varita-gato.jpg
--    Usa las copias con esos nombres de public/images.
-- 3. Reemplaza el valor de project_ref por el identificador de tu proyecto Supabase.
--    Se ve en la URL: https://zcregrswjktuxazutepb.supabase.co
-- 4. Ejecuta este archivo despues de subir las fotos. El bloque falla con un aviso
--    claro si no reemplazaste el identificador.
do $$
declare
  project_ref text := 'zcregrswjktuxazutepb';
begin
  if project_ref !~ '^[a-z0-9]{20}$' then
    raise exception 'El identificador project_ref no tiene un formato valido';
  end if;

  update productos as p
  set imagen_url = 'https://' || project_ref ||
    '.supabase.co/storage/v1/object/public/productos/' || imagen.archivo
  from (values
    ('Purina Pro Plan Adulto Perro 3 kg', 'alimento-perro-adulto.jpg'),
    ('Purina Pro Plan Puppy Perro 2 kg', 'alimento-perro-cachorro.jpg'),
    ('Purina Pro Plan Adulto Gato 2 kg', 'alimento-gato-adulto.jpg'),
    ('Purina Gati Carne Gato 1 kg', 'alimento-gato-carne.jpg'),
    ('Pelota mordedora para perro', 'pelota-mordedora.jpg'),
    ('Mordillo de cuerda para perro', 'mordillo-cuerda.jpg'),
    ('Shampoo para perro 250 ml', 'shampoo-perro.jpg'),
    ('Ratones de tela para gato', 'raton-gato.jpg'),
    ('Varita con plumas para gato', 'varita-gato.jpg')
  ) as imagen(nombre, archivo)
  where p.nombre = imagen.nombre;
end
$$;

-- ===== COMPRA ATOMICA =====
-- El bloqueo de filas evita vender stock que ya fue comprado por otra peticion.
create or replace function crear_pedido(p_usuario_id uuid, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_item record;
  v_producto productos%rowtype;
  v_pedido pedidos%rowtype;
  v_total numeric(10,2) := 0;
  v_precio numeric(10,2);
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'CLIENTE: El carrito no es valido';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'CLIENTE: El carrito esta vacio';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    where jsonb_typeof(entry.value) is distinct from 'object'
       or jsonb_typeof(entry.value -> 'producto_id') is distinct from 'number'
       or jsonb_typeof(entry.value -> 'cantidad') is distinct from 'number'
  ) then
    raise exception 'CLIENTE: Los productos o cantidades no son validos';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(producto_id numeric, cantidad numeric)
    where producto_id < 1
       or producto_id <> trunc(producto_id)
       or producto_id > 9223372036854775807
       or cantidad < 1
       or cantidad <> trunc(cantidad)
       or cantidad > 2147483647
  ) then
    raise exception 'CLIENTE: Los productos o cantidades no son validos';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(producto_id bigint, cantidad integer)
    group by producto_id
    having sum(cantidad) > 2147483647
  ) then
    raise exception 'CLIENTE: La cantidad solicitada es demasiado grande';
  end if;

  for v_item in
    select producto_id, sum(cantidad)::integer as cantidad
    from jsonb_to_recordset(p_items) as item(producto_id bigint, cantidad integer)
    group by producto_id
    order by producto_id
  loop
    select * into v_producto
    from productos
    where id = v_item.producto_id and activo = true
    for update;

    if not found then
      raise exception 'CLIENTE: No existe el producto %', v_item.producto_id;
    end if;
    if v_producto.stock < v_item.cantidad then
      raise exception 'CLIENTE: Sin stock de %', v_producto.nombre;
    end if;
    v_total := v_total + v_producto.precio * v_item.cantidad;
  end loop;

  insert into pedidos (usuario_id, total)
  values (p_usuario_id, v_total)
  returning * into v_pedido;

  for v_item in
    select producto_id, sum(cantidad)::integer as cantidad
    from jsonb_to_recordset(p_items) as item(producto_id bigint, cantidad integer)
    group by producto_id
    order by producto_id
  loop
    select precio into v_precio from productos where id = v_item.producto_id;
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    values (v_pedido.id, v_item.producto_id, v_item.cantidad, v_precio);
    update productos set stock = stock - v_item.cantidad where id = v_item.producto_id;
  end loop;

  return to_jsonb(v_pedido);
end;
$$;

revoke all on function crear_pedido(uuid, jsonb) from public, anon, authenticated;
grant execute on function crear_pedido(uuid, jsonb) to service_role;

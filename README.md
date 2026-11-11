# Pet Shop · Todo para tu mascota

Tienda para perros y gatos implementada con **Express, Supabase Auth/Postgres y JavaScript**.
Incluye catálogo, filtro y búsqueda, carrito persistente, registro/login, compra con control
transaccional de stock, historial de pedidos, detalle de producto y administración por rol. La
identidad visual usa el logo y la paleta rosa, chocolate, crema y turquesa.

## Puesta en marcha

1. Crea un proyecto Supabase en South America (São Paulo).
2. En **Storage → New bucket**, crea un bucket público llamado `productos`.
3. Sube al bucket las nueve fotos de `public/images` (copias de las imágenes de `imgs`) con
   los nombres indicados en la sección **IMAGENES** de `db/esquema.sql`.
4. En `db/esquema.sql`, reemplaza `TU_PROJECT_REF` dentro del bloque `DO $$` por el identificador
   de tu proyecto, que aparece en `https://TU_PROJECT_REF.supabase.co`.
5. Ejecuta el archivo completo en el **SQL Editor**. Crea las tablas, categorías, productos,
   asigna las URL públicas de Storage a `productos.imagen_url` y crea la función de compra.
6. Copia `.env.example` como `.env` y completa `SUPABASE_URL` y `SUPABASE_KEY` con la URL del
   proyecto y la clave **secreta** (nunca uses la clave secreta en el navegador ni la subas a Git).
7. Instala y ejecuta:

       npm install
       npm start

8. Abre <http://localhost:3000>.

Si las tablas ya existen en el proyecto, no vuelvas a ejecutar el script completo: carga las tres
categorías y nueve productos de Pet Shop sin duplicar los datos existentes y ejecuta el bloque
completo `create or replace function crear_pedido(...)` del final del archivo, incluidos los
permisos `revoke` y `grant`, para actualizar la función de compra.

## API

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| POST | `/registro` | Crea usuario y perfil | Público |
| POST | `/login` | Devuelve un token de Supabase Auth | Público |
| GET | `/categorias` | Lista categorías | Público |
| GET | `/productos?categoria=2&buscar=mouse` | Catálogo, filtro y búsqueda | Público |
| GET | `/productos/:id` | Detalle de un producto activo | Público |
| GET | `/perfil` | Perfil del usuario autenticado | Token |
| POST | `/pedidos` | Crea pedido y descuenta stock | Token |
| GET | `/mis-pedidos` | Historial del usuario autenticado | Token |
| GET | `/admin/productos` | Lista el inventario | Admin |
| POST | `/admin/productos` | Crea un producto | Admin |
| PUT | `/admin/productos/:id` | Edita un producto | Admin |
| DELETE | `/admin/productos/:id` | Desactiva un producto sin borrar su historial | Admin |

Para las rutas protegidas, envía `Authorization: Bearer <token>`. El servidor obtiene el usuario
del token; nunca acepta el dueño de la compra desde el cuerpo del pedido.

### Promover una cuenta a administradora

Registra la cuenta desde la tienda y, luego, ejecuta en el SQL Editor de Supabase:

    update perfiles
    set rol = 'admin'
    where id = (select id from auth.users where email = 'tu-email@example.com');

Los clientes reciben `403` al intentar usar las rutas de inventario. Los productos se desactivan
en vez de borrarse para conservar los pedidos anteriores.

## Imágenes y datos

`db/esquema.sql` trae tres categorías, nueve productos y productos con stock bajo o sin stock
para probar los estados de disponibilidad. Las fotos se sirven desde el bucket público `productos`
de Supabase Storage.

El logo se encuentra en `public/images/logo.jpg`; el nombre y presentación están en
`public/index.html`. La paleta extraída del logo se ajusta al principio de `public/estilos.css`.

## Deploy en Vercel

1. Sube el proyecto a un repositorio GitHub. Comprueba que `.env` no esté incluido; `.gitignore`
   ya excluye `.env`, `.vercel` y `node_modules`.
2. En Vercel, importa el repositorio y configura `SUPABASE_URL` y `SUPABASE_KEY` en
   **Environment Variables**.
3. Despliega y prueba el catálogo, el registro, el login y una compra en la URL publicada.

El deploy requiere una cuenta de Supabase configurada, las variables de entorno y acceso a
GitHub/Vercel. No incluyas credenciales ni tokens en el README.

## Checklist de entrega

- [x] Catálogo, imágenes de muestra, filtro y búsqueda por categoría/nombre
- [x] Carrito persistente en el navegador
- [x] Registro y login con Supabase Auth
- [x] Compra: total calculado con precios de la base y stock descontado de forma atómica
- [x] Historial de compras y detalle con respuesta 404 si no existe el producto
- [x] Administración de productos protegida por rol
- [x] Crear y cargar la base, subir las fotos al bucket `productos` y configurar las variables de Supabase
- [ ] Deploy en Vercel y verificación en la URL pública
- [ ] Agregar integrantes y URL del deploy una vez publicados

---
Integrantes: Matias Gonzalez - Juana Rodriguez·
Link del deploy: _completar_

Prof. Julia Panei · UTN Neuquén · Diseño Backend 2026
paneijulia@gmail.com
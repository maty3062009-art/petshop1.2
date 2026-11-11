// SERVIDOR
// Enciende Express, pone los middlewares y monta las rutas.
// Funciona igual en tu compu (npm start) y en Vercel.
const express = require('express');
const path = require('path');
const rutas = require('./routes/tiendaRoutes');

const app = express();

app.use(express.json());                               // body en JSON
app.use(express.static(path.join(__dirname, 'public'))); // el front (en Vercel lo sirve Vercel)

app.use('/', rutas);

app.use((req, res) => res.status(404).send('Ruta no encontrada'));

// En tu compu levantamos el servidor. En Vercel no hace falta:
// Vercel toma la app exportada y la ejecuta por su cuenta.
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let currentData = [];

// Servir archivos estáticos del frontend
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  socket.emit('updateData', currentData);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Función para actualizar los datos periódicamente
async function updateData() {
  try {
    const response = await axios.get('https://eleccionesnacionales2024.corteelectoral.gub.uy/JSON/ResumenGeneral_P.json');
    const data = response.data[0]; // Acceder al primer objeto del JSON

    if (!data || !data.EleccionNacional || !data.Plebiscitos) {
      console.error('Datos no disponibles en la estructura esperada');
      return;
    }

    const totalVotosEmitidos = data.TotalEmitidos;

    // Procesar datos de la elección nacional
    const eleccionNacional = data.EleccionNacional.map(item => ({
      partido: item.LemaNombre.trim(),
      totalVotos: item.Total,
      porcentaje: ((item.Total / totalVotosEmitidos) * 100).toFixed(2) + '%',
      icono: item.LemaIcono // Puedes usar este campo para mostrar una imagen si lo deseas
    }));

    // Procesar datos de los plebiscitos
    const plebiscitos = data.Plebiscitos.map(plebiscito => ({
      descripcion: plebiscito.PlebiscitoDsc,
      totalVotos: plebiscito.TotalVotos,
      porcentaje: ((plebiscito.TotalVotos / totalVotosEmitidos) * 100).toFixed(2) + '%'
    }));

    // Extraer información adicional
    const infoAdicional = {
      fechaConsulta: data.FechaConsulta,
      circuitosEscrutados: data.CircuitosEscrutados,
      porcentajeEscrutado: data.CircuitosPorcentaje,
      totalCircuitos: data.CircuitosTotal,
      circuitosConObservaciones: data.CircuitosConObservaciones,
      totalHabilitadosEleccion: data.TotalHabilitados,
      totalHabilitadosPlebiscito: data.TotalHabilitadosArt78
    };

    // Actualizar la estructura de datos para enviar al cliente
    currentData = {
      eleccionNacional,
      plebiscitos,
      infoAdicional
    };

    // Enviar los datos actualizados a todos los clientes conectados
    io.emit('updateData', currentData);
  } catch (error) {
    console.error('Error al obtener datos:', error);
  }
}

// Actualizar datos cada 60 segundos (60000 milisegundos)
setInterval(updateData, 15000);

// Obtener datos inmediatamente al iniciar
updateData();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

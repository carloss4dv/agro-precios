// Script de prueba para el parser de precios
const { parsePrecios } = require('./dist/index');
const fs = require('fs');
const path = require('path');

// Path del archivo a parsear
const filePath = path.join(__dirname, 'descargas', 'precios_medios_2023.xlsx');

try {
  console.log(`Parseando archivo: ${filePath}`);
  
  // Parsear el archivo
  const precios = parsePrecios(filePath);
  
  // Estadísticas sobre los datos
  console.log(`Total de productos: ${precios.length}`);
  
  // Contar productos por sector
  const sectores = {};
  let conFechasValidas = 0;
  let sinFechasValidas = 0;
  
  precios.forEach(producto => {
    // Contar por sector
    sectores[producto.sector] = (sectores[producto.sector] || 0) + 1;
    
    // Verificar fechas
    const fechasValidas = producto.precios.filter(p => p.fecha && !isNaN(p.fecha.getTime())).length;
    const fechasInvalidas = producto.precios.filter(p => !p.fecha || isNaN(p.fecha.getTime())).length;
    
    if (fechasValidas > 0) {
      conFechasValidas++;
    }
    
    if (fechasInvalidas > 0) {
      sinFechasValidas++;
    }
  });
  
  // Mostrar resultados
  console.log('\nProductos por sector:');
  Object.entries(sectores).forEach(([sector, cantidad]) => {
    console.log(`  ${sector}: ${cantidad}`);
  });
  
  console.log(`\nProductos con fechas válidas: ${conFechasValidas}`);
  console.log(`Productos con fechas inválidas: ${sinFechasValidas}`);
  
  // Mostrar algunos ejemplos
  console.log('\nEjemplos de productos:');
  
  // Mostrar un ejemplo de cada sector
  const ejemplos = new Set();
  precios.forEach(producto => {
    if (!ejemplos.has(producto.sector)) {
      ejemplos.add(producto.sector);
      console.log(`\nSector: ${producto.sector}`);
      console.log(`Producto: ${producto.producto}`);
      console.log('Precios:');
      producto.precios.slice(0, 3).forEach(p => {
        console.log(`  ${p.semana}: ${p.fecha ? p.fecha.toLocaleDateString() : 'Invalid Date'} - ${p.valor}`);
      });
    }
  });
  
} catch (error) {
  console.error('Error al parsear el archivo:', error);
} 
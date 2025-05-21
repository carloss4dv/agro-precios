// Script para probar el parseo de archivos de diferentes años
const { parsePrecios } = require('./dist/index');
const fs = require('fs');
const path = require('path');

// Listar todos los archivos en la carpeta de descargas
const descargasDir = path.join(__dirname, 'descargas');
const archivos = fs.readdirSync(descargasDir)
  .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'))
  .sort();

console.log(`Archivos encontrados: ${archivos.length}`);

// Probar cada archivo
archivos.forEach(archivo => {
  try {
    console.log(`\n=== Parseando ${archivo} ===`);
    const filePath = path.join(descargasDir, archivo);
    
    // Parsear el archivo
    const precios = parsePrecios(filePath);
    
    // Mostrar estadísticas
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
    
    // Mostrar conteo por sector
    console.log('\nProductos por sector:');
    Object.entries(sectores).forEach(([sector, cantidad]) => {
      console.log(`  ${sector}: ${cantidad}`);
    });
    
    console.log(`\nProductos con fechas válidas: ${conFechasValidas}`);
    console.log(`Productos con fechas inválidas: ${sinFechasValidas}`);
    
    // Mostrar algunos ejemplos de fechas
    if (precios.length > 0) {
      console.log('\nEjemplo de fechas:');
      const primerProducto = precios[0];
      console.log(`Producto: ${primerProducto.producto}`);
      primerProducto.precios.slice(0, 5).forEach(p => {
        console.log(`  ${p.semana}: ${p.fecha ? p.fecha.toLocaleDateString() : 'Invalid Date'}`);
      });
    }
  
  } catch (error) {
    console.error(`Error al parsear ${archivo}:`, error);
  }
}); 
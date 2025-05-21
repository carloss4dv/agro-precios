// Script específico para verificar el parseo de pipas de girasol
const { parsePrecios, convertirAEurosPorKg } = require('./dist/index');
const fs = require('fs');
const path = require('path');

// Obtener la ruta del archivo más reciente
const descargasDir = path.join(__dirname, 'descargas');
if (!fs.existsSync(descargasDir)) {
  console.error('Carpeta de descargas no encontrada. Ejecuta primero test_descarga_y_parseo.js');
  process.exit(1);
}

const archivos = fs.readdirSync(descargasDir)
  .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'))
  .sort()
  .reverse();

if (archivos.length === 0) {
  console.error('No hay archivos Excel en la carpeta de descargas');
  process.exit(1);
}

const filePath = path.join(descargasDir, archivos[0]);
console.log(`Analizando archivo: ${filePath}`);

// Parsear el archivo
const precios = parsePrecios(filePath);
console.log(`Total de productos: ${precios.length}`);

// Buscar productos de pipas de girasol
const pipasGirasol = precios.filter(p => 
  p.producto.toLowerCase().includes('pipa de girasol') || 
  p.producto.toLowerCase().includes('pipas de girasol')
);

console.log(`\n================================`);
console.log(`ANÁLISIS DE PIPAS DE GIRASOL (${pipasGirasol.length} productos)`);
console.log(`================================`);

if (pipasGirasol.length > 0) {
  // Mostrar cada producto
  pipasGirasol.forEach(producto => {
    console.log(`\n=== PRODUCTO: ${producto.producto} ===`);
    console.log(`Sector: ${producto.sector}`);
    console.log(`Especificación: ${producto.especificacion}`);
    
    console.log('Precios:');
    const preciosAMostrar = producto.precios.slice(0, 5);
    
    preciosAMostrar.forEach(p => {
      const fechaStr = p.fecha && !isNaN(p.fecha.getTime()) 
        ? p.fecha.toLocaleDateString('es-ES') 
        : 'FECHA INVÁLIDA';
      
      console.log(`  ${p.semana}: ${fechaStr} - Valor: ${p.valor !== null ? p.valor : 'N/A'}`);
    });
    
    if (producto.precios.length > 5) {
      console.log(`  ... (${producto.precios.length - 5} semanas más)`);
    }
  });
} else {
  console.log('No se encontraron productos de pipas de girasol');
}

// Mostrar ejemplo de conversión para pipas de girasol
if (pipasGirasol.length > 0) {
  const preciosConvertidos = convertirAEurosPorKg(precios);
  const pipasGirasolConvertidas = preciosConvertidos.filter(p => 
    p.producto.toLowerCase().includes('pipa de girasol') || 
    p.producto.toLowerCase().includes('pipas de girasol')
  );
  
  if (pipasGirasolConvertidas.length > 0) {
    console.log('\n================================');
    console.log('COMPARACIÓN PRECIOS CONVERTIDOS (€/kg)');
    console.log('================================');
    
    const pipasOriginal = pipasGirasol[0];
    const pipasConvertido = pipasGirasolConvertidas[0];
    
    console.log('\nEjemplo de conversión para pipas de girasol:');
    console.log(`Producto: ${pipasOriginal.producto}`);
    console.log('Valores originales (primeras 3 semanas):');
    pipasOriginal.precios.slice(0, 3).forEach(p => {
      console.log(`  ${p.semana}: ${p.valor !== null ? p.valor : 'N/A'}`);
    });
    
    console.log('Valores convertidos a €/kg (primeras 3 semanas):');
    pipasConvertido.precios.slice(0, 3).forEach(p => {
      console.log(`  ${p.semana}: ${p.valor !== null ? p.valor : 'N/A'}`);
    });
  }
} 
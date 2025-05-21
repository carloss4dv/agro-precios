// Script específico para verificar el parseo de vinos y aceites
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

// Convertir a €/kg para comparabilidad
const preciosConvertidos = convertirAEurosPorKg(precios);

// Función para mostrar detalles de un producto
function mostrarDetallesProducto(producto, mostrarTodos = false) {
  console.log(`\n=== PRODUCTO: ${producto.producto} ===`);
  console.log(`Sector: ${producto.sector}`);
  console.log(`Especificación: ${producto.especificacion}`);
  
  console.log('Precios:');
  const preciosAMostrar = mostrarTodos ? producto.precios : producto.precios.slice(0, 5);
  
  preciosAMostrar.forEach(p => {
    const fechaStr = p.fecha && !isNaN(p.fecha.getTime()) 
      ? p.fecha.toLocaleDateString('es-ES') 
      : 'FECHA INVÁLIDA';
    
    console.log(`  ${p.semana}: ${fechaStr} - Valor: ${p.valor !== null ? p.valor : 'N/A'}`);
  });
  
  if (!mostrarTodos && producto.precios.length > 5) {
    console.log(`  ... (${producto.precios.length - 5} semanas más)`);
  }
}

// 1. Análisis de vinos
const vinos = precios.filter(p => 
  p.sector.toLowerCase().includes('vino') || 
  p.producto.toLowerCase().includes('vino')
);

console.log('\n================================');
console.log(`ANÁLISIS DE VINOS (${vinos.length} productos)`);
console.log('================================');

if (vinos.length > 0) {
  vinos.forEach(vino => mostrarDetallesProducto(vino));
  
  // Estadísticas de fechas para vinos
  const fechasValidasVinos = vinos.reduce((total, vino) => 
    total + vino.precios.filter(p => p.fecha && !isNaN(p.fecha.getTime())).length, 0);
  
  const fechasInvalidasVinos = vinos.reduce((total, vino) => 
    total + vino.precios.filter(p => !p.fecha || isNaN(p.fecha.getTime())).length, 0);
  
  console.log(`\nFechas válidas en vinos: ${fechasValidasVinos}`);
  console.log(`Fechas inválidas en vinos: ${fechasInvalidasVinos}`);
} else {
  console.log('No se encontraron productos de vino');
}

// 2. Análisis de aceites
const aceites = precios.filter(p => 
  p.sector.toLowerCase().includes('aceite') || 
  p.producto.toLowerCase().includes('aceite')
);

console.log('\n================================');
console.log(`ANÁLISIS DE ACEITES (${aceites.length} productos)`);
console.log('================================');

if (aceites.length > 0) {
  aceites.forEach(aceite => mostrarDetallesProducto(aceite));
  
  // Estadísticas de fechas para aceites
  const fechasValidasAceites = aceites.reduce((total, aceite) => 
    total + aceite.precios.filter(p => p.fecha && !isNaN(p.fecha.getTime())).length, 0);
  
  const fechasInvalidasAceites = aceites.reduce((total, aceite) => 
    total + aceite.precios.filter(p => !p.fecha || isNaN(p.fecha.getTime())).length, 0);
  
  console.log(`\nFechas válidas en aceites: ${fechasValidasAceites}`);
  console.log(`Fechas inválidas en aceites: ${fechasInvalidasAceites}`);
} else {
  console.log('No se encontraron productos de aceite');
}

// 3. Comparación de precios convertidos a €/kg
console.log('\n================================');
console.log('COMPARACIÓN PRECIOS CONVERTIDOS (€/kg)');
console.log('================================');

// Buscar productos convertidos
const vinosConvertidos = preciosConvertidos.filter(p => 
  p.sector.toLowerCase().includes('vino') || 
  p.producto.toLowerCase().includes('vino')
);

const aceitesConvertidos = preciosConvertidos.filter(p => 
  p.sector.toLowerCase().includes('aceite') || 
  p.producto.toLowerCase().includes('aceite')
);

// Mostrar algunos ejemplos de conversión
if (vinosConvertidos.length > 0) {
  const vinoOriginal = vinos[0];
  const vinoConvertido = vinosConvertidos[0];
  
  console.log('\nEjemplo de conversión para vino:');
  console.log(`Producto: ${vinoOriginal.producto}`);
  console.log('Valores originales (primeras 3 semanas):');
  vinoOriginal.precios.slice(0, 3).forEach(p => {
    console.log(`  ${p.semana}: ${p.valor !== null ? p.valor : 'N/A'}`);
  });
  
  console.log('Valores convertidos a €/kg (primeras 3 semanas):');
  vinoConvertido.precios.slice(0, 3).forEach(p => {
    console.log(`  ${p.semana}: ${p.valor !== null ? p.valor : 'N/A'}`);
  });
}

if (aceitesConvertidos.length > 0) {
  const aceiteOriginal = aceites[0];
  const aceiteConvertido = aceitesConvertidos[0];
  
  console.log('\nEjemplo de conversión para aceite:');
  console.log(`Producto: ${aceiteOriginal.producto}`);
  console.log('Valores originales (primeras 3 semanas):');
  aceiteOriginal.precios.slice(0, 3).forEach(p => {
    console.log(`  ${p.semana}: ${p.valor !== null ? p.valor : 'N/A'}`);
  });
  
  console.log('Valores convertidos a €/kg (primeras 3 semanas):');
  aceiteConvertido.precios.slice(0, 3).forEach(p => {
    console.log(`  ${p.semana}: ${p.valor !== null ? p.valor : 'N/A'}`);
  });
} 
// Script para mostrar TODOS los productos en todos los archivos disponibles
const { parsePrecios } = require('./dist/index');
const fs = require('fs');
const path = require('path');

// Ruta a la carpeta de descargas
const descargasDir = path.join(__dirname, 'descargas');
if (!fs.existsSync(descargasDir)) {
  console.error('Carpeta de descargas no encontrada. Ejecuta primero test_multiple_years.js');
  process.exit(1);
}

// Obtener todos los archivos disponibles
const archivos = fs.readdirSync(descargasDir)
  .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'))
  .sort();

if (archivos.length === 0) {
  console.error('No hay archivos Excel en la carpeta de descargas');
  process.exit(1);
}

// Función para formatear texto en la consola
const formatoTexto = {
  reset: '\x1b[0m',
  brillante: '\x1b[1m',
  subrayado: '\x1b[4m',
  inverso: '\x1b[7m',
  rojo: '\x1b[31m',
  verde: '\x1b[32m',
  amarillo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  cian: '\x1b[36m'
};

// Función para obtener todos los productos únicos entre todos los archivos
async function obtenerTodosLosProductos() {
  const todosLosProductos = [];
  const sectores = new Set();
  
  for (const archivo of archivos) {
    const filePath = path.join(descargasDir, archivo);
    const añoMatch = path.basename(filePath).match(/(\d{4})/);
    const año = añoMatch ? añoMatch[1] : 'desconocido';
    
    console.log(`\nCargando datos de ${path.basename(filePath)} (${año})...`);
    
    try {
      // Parsear datos
      const productos = parsePrecios(filePath);
      console.log(`  Encontrados ${productos.length} productos`);
      
      // Guardar los sectores
      productos.forEach(p => sectores.add(p.sector));
      
      // Agregar el año a cada producto
      const productosConAño = productos.map(p => ({
        ...p,
        año
      }));
      
      todosLosProductos.push(...productosConAño);
    } catch (error) {
      console.error(`  Error al procesar archivo ${filePath}:`, error.message);
    }
  }
  
  return { 
    productos: todosLosProductos,
    sectores: Array.from(sectores).sort()
  };
}

// Función para mostrar todos los productos agrupados por sector
function mostrarProductosPorSector(datos) {
  const { productos, sectores } = datos;
  
  console.log('\n\n');
  console.log(formatoTexto.brillante + formatoTexto.inverso + ' LISTADO COMPLETO DE PRODUCTOS POR SECTOR ' + formatoTexto.reset);
  console.log('='.repeat(80));
  
  // Para cada sector, mostrar los productos
  sectores.forEach(sector => {
    const productosSector = productos.filter(p => p.sector === sector);
    
    if (productosSector.length > 0) {
      // Mostrar encabezado del sector
      console.log('\n');
      console.log(formatoTexto.brillante + formatoTexto.azul + `SECTOR: ${sector}` + formatoTexto.reset);
      console.log('-'.repeat(80));
      
      // Obtener nombres únicos de productos en este sector
      const nombresUnicos = new Set();
      productosSector.forEach(p => nombresUnicos.add(p.producto));
      
      // Para cada nombre único, mostrar el producto y los años en que aparece
      Array.from(nombresUnicos).sort().forEach((nombreProducto, index) => {
        // Encontrar en qué años aparece este producto
        const productosAño = productosSector.filter(p => p.producto === nombreProducto);
        const años = productosAño.map(p => p.año).sort();
        
        console.log(`${index + 1}. ${formatoTexto.brillante}${nombreProducto}${formatoTexto.reset}`);
        
        // Mostrar especificación si existe
        const especificacion = productosAño[0].especificacion; 
        if (especificacion) {
          console.log(`   Especificación: ${especificacion}`);
        }
        
        // Mostrar años
        console.log(`   Presente en años: ${formatoTexto.verde}${años.join(', ')}${formatoTexto.reset}`);
        
        // Mostrar precios disponibles (cantidad)
        const cantidadPrecios = productosAño[0].precios.length;
        console.log(`   Precios disponibles: ${cantidadPrecios} semanas por año`);
        
        // Separador entre productos
        if (index < nombresUnicos.size - 1) {
          console.log('   ' + '-'.repeat(40));
        }
      });
      
      console.log('\nTotal productos en sector ' + formatoTexto.brillante + sector + formatoTexto.reset + ': ' + formatoTexto.brillante + nombresUnicos.size + formatoTexto.reset);
    }
  });
  
  // Mostrar resumen final
  const productosUnicos = new Set();
  productos.forEach(p => productosUnicos.add(p.producto));
  
  console.log('\n\n');
  console.log(formatoTexto.brillante + formatoTexto.inverso + ' RESUMEN FINAL ' + formatoTexto.reset);
  console.log('='.repeat(80));
  console.log(`Total de sectores: ${formatoTexto.brillante}${sectores.length}${formatoTexto.reset}`);
  console.log(`Total de productos únicos: ${formatoTexto.brillante}${productosUnicos.size}${formatoTexto.reset}`);
  console.log(`Total de registros (producto-año): ${formatoTexto.brillante}${productos.length}${formatoTexto.reset}`);
}

// Función para exportar resultados a CSV
function exportarCSV(datos) {
  const { productos, sectores } = datos;
  
  // Crear contenido CSV
  let csvContent = 'Sector,Producto,Especificacion,Años\n';
  
  // Para cada sector
  sectores.forEach(sector => {
    const productosSector = productos.filter(p => p.sector === sector);
    
    if (productosSector.length > 0) {
      // Obtener nombres únicos
      const nombresUnicos = new Set();
      productosSector.forEach(p => nombresUnicos.add(p.producto));
      
      // Para cada producto único
      Array.from(nombresUnicos).sort().forEach(nombreProducto => {
        // Encontrar años
        const productosAño = productosSector.filter(p => p.producto === nombreProducto);
        const años = productosAño.map(p => p.año).sort().join(', ');
        const especificacion = productosAño[0].especificacion || '';
        
        // Escapar posibles comas en los campos
        const sectorCSV = sector.includes(',') ? `"${sector}"` : sector;
        const productoCSV = nombreProducto.includes(',') ? `"${nombreProducto}"` : nombreProducto;
        const especificacionCSV = especificacion.includes(',') ? `"${especificacion}"` : especificacion;
        
        // Agregar línea al CSV
        csvContent += `${sectorCSV},${productoCSV},${especificacionCSV},${años}\n`;
      });
    }
  });
  
  // Guardar el archivo CSV
  const csvPath = path.join(__dirname, 'todos_los_productos.csv');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\nExportado listado completo a CSV: ${csvPath}`);
}

// Ejecutar y mostrar resultados
async function main() {
  console.log(formatoTexto.brillante + formatoTexto.magenta + 'ANALIZANDO TODOS LOS PRODUCTOS DISPONIBLES...' + formatoTexto.reset);
  
  const datos = await obtenerTodosLosProductos();
  mostrarProductosPorSector(datos);
  exportarCSV(datos);
}

main().catch(error => {
  console.error('Error al ejecutar el script:', error);
}); 
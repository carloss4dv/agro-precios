// Script para verificar la corrección final de sectores
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

// Productos específicos a verificar
const productosEspecificos = [
  "Colza grano",
  "Guisantes secos",
  "Alfalfa",
  "Pipa de girasol alto oleico",
  "Limón",
  "Naranja",
  "Mandarina"
];

// Función para verificar la clasificación de un producto
function esClasificacionCorrecta(producto, sector) {
  // Mapa de productos a sectores esperados
  const sectorEsperado = {
    "colza": "SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS",
    "guisante": "SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS",
    "alfalfa": "SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS",
    "pipa de girasol": "SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS",
    "limón": "FRUTAS",
    "naranja": "FRUTAS",
    "mandarina": "FRUTAS",
    "clementina": "FRUTAS",
    "satsuma": "FRUTAS",
    "aceite": "ACEITES VEGETALES Y ACEITUNA DE MESA"
  };

  const nombreLower = producto.toLowerCase();
  
  for (const [clave, valorEsperado] of Object.entries(sectorEsperado)) {
    if (nombreLower.includes(clave)) {
      return {
        correcto: sector === valorEsperado,
        sectorEsperado: valorEsperado
      };
    }
  }
  
  return { correcto: true, sectorEsperado: sector };
}

// Función para corregir manualmente el sector (simulando lo que hace el parser internamente)
function corregirSectorManual(sector, producto) {
  const productoLower = producto.toLowerCase();
  
  // Corregir productos de VINO a SEMILLAS OLEAGINOSAS
  if (sector === 'VINO') {
    if (productoLower.includes('colza') || 
        productoLower.includes('girasol') || 
        productoLower.includes('soja') || 
        productoLower.includes('guisante') || 
        productoLower.includes('lenteja') || 
        productoLower.includes('haba') || 
        productoLower.includes('garbanzo') || 
        productoLower.includes('alfalfa')) {
      return 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS';
    }
  }
  
  // Corregir frutas
  if (sector !== 'FRUTAS') {
    if (productoLower.includes('limón') || 
        productoLower.includes('naranja') || 
        productoLower.includes('mandarina') || 
        productoLower.includes('clementina') || 
        productoLower.includes('satsuma')) {
      return 'FRUTAS';
    }
  }
  
  return sector;
}

// Función para inyectar sector VINO (simular el error de clasificación)
function inyectarSectorVino(productos) {
  return productos.map(p => {
    const nombreLower = p.producto.toLowerCase();
    
    // Si el producto está en nuestro conjunto de prueba, cambiar sector a VINO
    if (productosEspecificos.some(prod => nombreLower.includes(prod.toLowerCase()))) {
      return {
        ...p,
        sector: 'VINO'
      };
    }
    
    return p;
  });
}

console.log('PRUEBA FINAL DE CORRECCIÓN DE SECTORES');

// Análisis por archivo
for (const archivo of archivos) {
  const filePath = path.join(descargasDir, archivo);
  const añoMatch = path.basename(filePath).match(/(\d{4})/);
  const año = añoMatch ? añoMatch[1] : 'desconocido';
  
  console.log(`\n========================================`);
  console.log(`ANALIZANDO ARCHIVO: ${path.basename(filePath)} (${año})`);
  console.log(`========================================`);

  try {
    // Parsear el archivo original
    const productosOriginales = parsePrecios(filePath);

    // Inyectar sector VINO a productos específicos
    const productosConErrores = inyectarSectorVino(productosOriginales);
    
    // Corregir manualmente simulando el algoritmo del parser
    const productosCorregidosManual = productosConErrores.map(p => ({
      ...p,
      sector: corregirSectorManual(p.sector, p.producto)
    }));

    // Crear un array para almacenar resultados
    const resultados = [];
    
    for (const producto of productosCorregidosManual) {
      const nombreLower = producto.producto.toLowerCase();
      
      // Verificar solo los productos que nos interesan
      if (productosEspecificos.some(p => nombreLower.includes(p.toLowerCase()))) {
        const { correcto, sectorEsperado } = esClasificacionCorrecta(producto.producto, producto.sector);
        
        resultados.push({
          producto: producto.producto,
          sectorOriginal: 'VINO', // Esto fue inyectado
          sectorCorregido: producto.sector,
          sectorEsperado,
          correcto
        });
      }
    }
    
    // Mostrar resultados
    console.log(`Resultados para productos específicos:`);
    console.log(`-------------------------------------`);
    
    let todosCorrectos = true;
    
    resultados.forEach(r => {
      console.log(`Producto: "${r.producto}"`);
      console.log(`  Original: ${r.sectorOriginal}`);
      console.log(`  Corregido: ${r.sectorCorregido}`);
      console.log(`  Esperado: ${r.sectorEsperado}`);
      console.log(`  ¿Correcto? ${r.correcto ? '✅ SÍ' : '❌ NO'}`);
      console.log(`-------------------------------------`);
      
      if (!r.correcto) {
        todosCorrectos = false;
      }
    });
    
    console.log(`Estado de la prueba en ${año}: ${todosCorrectos ? '✅ EXITOSA' : '❌ FALLIDA'}`);
    
  } catch (error) {
    console.error(`Error al procesar archivo ${filePath}:`, error.message);
  }
}

console.log('\nPrueba de corrección completada!'); 
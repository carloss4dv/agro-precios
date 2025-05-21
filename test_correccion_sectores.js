// Script para verificar y generar correcciones de sectores para todos los productos
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

// Definir reglas para mapear palabras clave a sectores
const reglasSector = [
  { keywords: ['vino', 'mosto'], sector: 'VINO' },
  { keywords: ['aceite', 'oliva', 'aceituna'], sector: 'ACEITES VEGETALES Y ACEITUNA DE MESA' },
  { keywords: ['arroz'], sector: 'ARROZ' },
  { keywords: ['cordero', 'ovino', 'oveja'], sector: 'OVINO' },
  { keywords: ['cerdo', 'porcino', 'lechón'], sector: 'PORCINO' },
  { keywords: ['bovino', 'vacuno', 'ternera', 'buey', 'vaca'], sector: 'BOVINO' },
  { keywords: ['pollo', 'gallina', 'huevo', 'huevos', 'ave', 'conejo'], sector: 'AVES, HUEVOS, CAZA' },
  { keywords: ['leche', 'lácteo', 'queso', 'yogur', 'mantequilla', 'nata'], sector: 'LÁCTEOS' },
  {
    keywords: [
      'tomate', 'patata', 'cebolla', 'ajo', 'pimiento', 'calabacín', 'judía', 'haba verde',
      'berenjena', 'zanahoria', 'lechuga', 'escarola', 'espinaca', 'champiñón', 'espárrago',
      'alcachofa', 'coliflor', 'brócoli', 'col', 'pepino', 'acelga', 'puerro', 'calabaza'
    ],
    sector: 'HORTALIZAS'
  },
  {
    keywords: [
      'manzana', 'pera', 'plátano', 'naranja', 'mandarina', 'limón', 'melocotón', 'nectarina',
      'uva', 'melón', 'sandía', 'cereza', 'ciruela', 'fresa', 'aguacate', 'kiwi', 'albaricoque',
      'piña', 'caqui', 'granada', 'higo', 'níspero', 'clementina', 'satsuma'
    ],
    sector: 'FRUTAS'
  },
  {
    keywords: [
      'trigo', 'cebada', 'maíz', 'avena', 'centeno', 'sorgo', 'cereal'
    ],
    sector: 'CEREALES'
  },
  {
    keywords: [
      'colza', 'girasol', 'soja', 'guisante', 'lenteja', 'haba', 'garbanzo', 
      'alfalfa', 'altramuz', 'pipa', 'semilla', 'torta', 'proteico'
    ],
    sector: 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS'
  }
];

// Función para mapear un producto a su sector correcto basado en palabras clave
function determinarSectorCorrecto(nombreProducto) {
  const nombreLower = nombreProducto.toLowerCase();
  
  for (const regla of reglasSector) {
    if (regla.keywords.some(keyword => nombreLower.includes(keyword))) {
      return regla.sector;
    }
  }
  
  return null; // No se pudo determinar
}

// Función para identificar posibles errores de clasificación
function identificarErroresClasificacion(productos) {
  const errores = [];
  
  productos.forEach(p => {
    const sectorEsperado = determinarSectorCorrecto(p.producto);
    
    if (sectorEsperado && sectorEsperado !== p.sector) {
      errores.push({
        producto: p.producto,
        sectorActual: p.sector,
        sectorEsperado: sectorEsperado
      });
    }
  });
  
  return errores;
}

// Función para generar código corrector basado en los errores encontrados
function generarCodigoCorrectorSectores(errores) {
  // Agrupar por sector actual y esperado
  const correccionesPorSector = {};
  
  errores.forEach(error => {
    const key = `${error.sectorActual} -> ${error.sectorEsperado}`;
    if (!correccionesPorSector[key]) {
      correccionesPorSector[key] = {
        sectorActual: error.sectorActual,
        sectorEsperado: error.sectorEsperado,
        productos: []
      };
    }
    
    // Agregar producto si no está ya en la lista
    if (!correccionesPorSector[key].productos.includes(error.producto)) {
      correccionesPorSector[key].productos.push(error.producto);
    }
  });
  
  // Generar código
  let codigo = `
// CÓDIGO GENERADO PARA CORRECCIÓN DE SECTORES
// Copiar este código y adaptarlo para usarlo en src/parser/ExcelParser.ts

private static corregirSectorProducto(sector: string, producto: string, especificacion: string): string {
  // Correcciones específicas por producto
  const productoLower = producto.toLowerCase();
`;

  // Agregar primero correcciones para productos específicos por nombre
  const productosUnicos = {};
  errores.forEach(error => {
    if (!productosUnicos[error.producto]) {
      productosUnicos[error.producto] = error.sectorEsperado;
    }
  });
  
  codigo += `
  // Correcciones por nombre exacto de producto
  switch (producto) {
`;

  Object.entries(productosUnicos).forEach(([producto, sector]) => {
    codigo += `    case "${producto}": return "${sector}";\n`;
  });

  codigo += `  }
  
  // Correcciones por palabras clave en el nombre del producto
`;

  // Agregar correcciones por sector de origen -> destino
  Object.values(correccionesPorSector).forEach(correccion => {
    codigo += `
  // Corregir productos de ${correccion.sectorActual} a ${correccion.sectorEsperado}
  if (sector === "${correccion.sectorActual}") {
    const palabrasClave = [
`;

    // Extraer palabras clave relevantes
    const palabrasClave = new Set();
    correccion.productos.forEach(producto => {
      const nombreLower = producto.toLowerCase();
      reglasSector.find(regla => regla.sector === correccion.sectorEsperado)?.keywords.forEach(keyword => {
        if (nombreLower.includes(keyword)) {
          palabrasClave.add(keyword);
        }
      });
    });

    // Agregar cada palabra clave
    Array.from(palabrasClave).forEach(palabra => {
      codigo += `      "${palabra}",\n`;
    });

    codigo += `    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "${correccion.sectorEsperado}";
    }
  }
`;
  });

  codigo += `
  // Si no hay correcciones, devolver el sector original
  return sector;
}`;

  return codigo;
}


console.log('ANÁLISIS DE CLASIFICACIÓN DE SECTORES');

// Recopilar datos y errores de todos los archivos
const todosLosProductos = [];
const todosLosErrores = [];

// Analizar cada archivo
for (const archivo of archivos) {
  const filePath = path.join(descargasDir, archivo);
  const añoMatch = path.basename(filePath).match(/(\d{4})/);
  const año = añoMatch ? añoMatch[1] : 'desconocido';
  
  console.log(`\n========================================`);
  console.log(`ANALIZANDO ARCHIVO: ${path.basename(filePath)} (${año})`);
  console.log(`========================================`);
  
  try {
    // Parsear datos originales
    const productos = parsePrecios(filePath);
    console.log(`Total de productos en el archivo: ${productos.length}`);
    
    // Buscar posibles errores de clasificación
    const errores = identificarErroresClasificacion(productos);
    
    console.log(`Posibles errores de clasificación encontrados: ${errores.length}`);
    
    // Mostrar los primeros 10 errores
    if (errores.length > 0) {
      console.log('\nEjemplos de posibles errores:');
      errores.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. "${error.producto}" - Actual: ${error.sectorActual}, Esperado: ${error.sectorEsperado}`);
      });
    }
    
    // Acumular productos y errores
    todosLosProductos.push(...productos);
    todosLosErrores.push(...errores);
    
  } catch (error) {
    console.error(`Error al procesar archivo ${filePath}:`, error.message);
  }
}

// Generar informe consolidado
console.log(`\n========================================`);
console.log(`INFORME CONSOLIDADO`);
console.log(`========================================`);
console.log(`Total de productos analizados: ${todosLosProductos.length}`);
console.log(`Total de posibles errores de clasificación: ${todosLosErrores.length}`);

// Eliminar duplicados de errores
const erroresUnicos = [];
const productosVistos = new Set();

todosLosErrores.forEach(error => {
  if (!productosVistos.has(error.producto)) {
    productosVistos.add(error.producto);
    erroresUnicos.push(error);
  }
});

console.log(`Productos únicos con posibles errores: ${erroresUnicos.length}`);

// Generar código corrector
const codigoCorrector = generarCodigoCorrectorSectores(erroresUnicos);

// Guardar código generado en un archivo
const rutaCodigoGenerado = path.join(__dirname, 'codigo_corrector_sectores.js');
fs.writeFileSync(rutaCodigoGenerado, codigoCorrector);

console.log(`\nCódigo corrector generado y guardado en: ${rutaCodigoGenerado}`);
console.log('Este código puede adaptarse para aplicar las correcciones en ExcelParser.ts'); 
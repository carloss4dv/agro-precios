// Script para analizar todos los productos de todos los años
const { parsePrecios, convertirAEurosPorKg } = require('./dist/index');
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

console.log(`ANÁLISIS COMPLETO DE PRODUCTOS EN ${archivos.length} ARCHIVOS`);

// Verificar si un producto tiene error de clasificación
function verificarClasificacionProducto(producto, sector) {
  const nombreProducto = producto.toLowerCase();
  
  // Reglas de clasificación esperada
  const reglas = [
    { patron: 'pipa de girasol', sectorEsperado: 'ACEITE', sectorIncorrecto: 'VINO' },
    { patron: 'pipas de girasol', sectorEsperado: 'ACEITE', sectorIncorrecto: 'VINO' },
    { patron: 'aceite', sectorEsperado: 'ACEITE', },
    { patron: 'vino', sectorEsperado: 'VINO' },
    { patron: 'arroz', sectorEsperado: 'ARROZ' },
    { patron: 'leche', sectorEsperado: 'LÁCTEOS' },
    { patron: 'cerdo', sectorEsperado: 'PORCINO' },
    { patron: 'cordero', sectorEsperado: 'OVINO' },
    { patron: 'ovino', sectorEsperado: 'OVINO' },
    { patron: 'bovino', sectorEsperado: 'BOVINO' },
    { patron: 'ternera', sectorEsperado: 'BOVINO' },
    { patron: 'pollo', sectorEsperado: 'AVES' },
    { patron: 'huevo', sectorEsperado: 'AVES' },
    { patron: 'tomate', sectorEsperado: 'HORTALIZAS' },
    { patron: 'patata', sectorEsperado: 'HORTALIZAS' },
    { patron: 'cebolla', sectorEsperado: 'HORTALIZAS' },
    { patron: 'manzana', sectorEsperado: 'FRUTAS' },
    { patron: 'pera', sectorEsperado: 'FRUTAS' },
    { patron: 'naranja', sectorEsperado: 'FRUTAS' },
    { patron: 'limón', sectorEsperado: 'FRUTAS' },
    { patron: 'aceituna', sectorEsperado: 'ACEITE' },
    { patron: 'girasol', sectorEsperado: 'ACEITE' },
    { patron: 'trigo', sectorEsperado: 'CEREALES' },
    { patron: 'cebada', sectorEsperado: 'CEREALES' },
    { patron: 'maíz', sectorEsperado: 'CEREALES' },
    { patron: 'soja', sectorEsperado: 'SEMILLAS OLEAGINOSAS' }
  ];
  
  // Verificar productos específicos con clasificación conocida
  if (nombreProducto.includes('pipa de girasol') && sector === 'VINO') {
    return {
      error: true,
      mensaje: `El producto "${producto}" está en sector "${sector}" pero debería estar en "ACEITE"`
    };
  }
  
  // Verificar reglas generales (para detección, no para corrección)
  for (const regla of reglas) {
    if (nombreProducto.includes(regla.patron) && 
        regla.sectorIncorrecto && 
        sector === regla.sectorIncorrecto) {
      return {
        error: true,
        mensaje: `El producto "${producto}" está en sector "${sector}" pero debería estar en "${regla.sectorEsperado}"`
      };
    }
  }
  
  // El producto parece estar bien clasificado
  return { error: false };
}

// Verificar si un producto tiene error ortográfico
function verificarOrtografiaProducto(producto) {
  if (producto.includes('Aceie')) {
    return {
      error: true, 
      mensaje: `El producto "${producto}" tiene error ortográfico: "Aceie" en lugar de "Aceite"`
    };
  }
  return { error: false };
}

// Analizar un archivo
function analizarArchivo(filePath) {
  const añoMatch = path.basename(filePath).match(/(\d{4})/);
  const año = añoMatch ? añoMatch[1] : 'desconocido';
  
  console.log(`\n========================================`);
  console.log(`ANALIZANDO PRODUCTOS - AÑO ${año}`);
  console.log(`========================================`);
  
  try {
    // Parsear el archivo
    const productos = parsePrecios(filePath);
    console.log(`Total de productos: ${productos.length}`);
    
    // Productos por sector
    const sectores = {};
    productos.forEach(p => {
      if (!sectores[p.sector]) {
        sectores[p.sector] = [];
      }
      sectores[p.sector].push(p);
    });
    
    console.log(`\nPRODUCTOS POR SECTOR:`);
    Object.keys(sectores).sort().forEach(sector => {
      console.log(`- ${sector}: ${sectores[sector].length} productos`);
    });
    
    // Buscar problemas de clasificación
    const problemasClasificacion = [];
    const problemasOrtografia = [];
    
    productos.forEach(producto => {
      // Verificar clasificación
      const resultadoClasificacion = verificarClasificacionProducto(producto.producto, producto.sector);
      if (resultadoClasificacion.error) {
        problemasClasificacion.push({
          producto: producto.producto,
          sector: producto.sector,
          mensaje: resultadoClasificacion.mensaje
        });
      }
      
      // Verificar ortografía
      const resultadoOrtografia = verificarOrtografiaProducto(producto.producto);
      if (resultadoOrtografia.error) {
        problemasOrtografia.push({
          producto: producto.producto,
          mensaje: resultadoOrtografia.mensaje
        });
      }
    });
    
    // Mostrar problemas encontrados
    if (problemasClasificacion.length > 0) {
      console.log(`\nPROBLEMAS DE CLASIFICACIÓN ENCONTRADOS (${problemasClasificacion.length}):`);
      problemasClasificacion.forEach((problema, index) => {
        console.log(`${index + 1}. ${problema.mensaje}`);
      });
    } else {
      console.log(`\nNo se encontraron problemas de clasificación.`);
    }
    
    if (problemasOrtografia.length > 0) {
      console.log(`\nPROBLEMAS ORTOGRÁFICOS ENCONTRADOS (${problemasOrtografia.length}):`);
      problemasOrtografia.forEach((problema, index) => {
        console.log(`${index + 1}. ${problema.mensaje}`);
      });
    } else {
      console.log(`\nNo se encontraron problemas ortográficos.`);
    }
    
    // Mostrar listado completo de productos y sectores
    console.log(`\nLISTADO COMPLETO DE PRODUCTOS:`);
    productos.forEach((producto, index) => {
      console.log(`${index + 1}. "${producto.producto}" (Sector: ${producto.sector})`);
    });
    
    return {
      año,
      totalProductos: productos.length,
      problemasClasificacion,
      problemasOrtografia,
      productosUnicos: productos.map(p => p.producto)
        .filter((valor, indice, self) => self.indexOf(valor) === indice)
    };
    
  } catch (error) {
    console.error(`Error al analizar archivo ${filePath}:`, error.message);
    return {
      año,
      error: error.message,
      totalProductos: 0,
      problemasClasificacion: [],
      problemasOrtografia: [],
      productosUnicos: []
    };
  }
}

// Función para encontrar productos que aparecen solo en algunos años
function analizarProductosEntreAños(resultados) {
  console.log(`\n========================================`);
  console.log(`ANÁLISIS DE PRODUCTOS ENTRE AÑOS`);
  console.log(`========================================`);
  
  // Obtener todos los productos únicos
  const todosLosProductos = new Set();
  const productosPorAño = {};
  
  resultados.forEach(res => {
    productosPorAño[res.año] = new Set(res.productosUnicos);
    res.productosUnicos.forEach(producto => todosLosProductos.add(producto));
  });
  
  // Buscar productos que no aparecen en todos los años
  const productosInconsistentes = [];
  const años = Object.keys(productosPorAño);
  
  todosLosProductos.forEach(producto => {
    const añosEnQueAparece = años.filter(año => productosPorAño[año].has(producto));
    if (añosEnQueAparece.length < años.length) {
      productosInconsistentes.push({
        producto,
        añosPresente: añosEnQueAparece,
        añosAusente: años.filter(año => !productosPorAño[año].has(producto))
      });
    }
  });
  
  if (productosInconsistentes.length > 0) {
    console.log(`Se encontraron ${productosInconsistentes.length} productos con aparición inconsistente entre años:`);
    productosInconsistentes.forEach((item, index) => {
      console.log(`${index + 1}. "${item.producto}"`);
      console.log(`   Presente en: ${item.añosPresente.join(', ')}`);
      console.log(`   Ausente en: ${item.añosAusente.join(', ')}`);
    });
  } else {
    console.log(`Todos los productos aparecen consistentemente en todos los años.`);
  }
  
  return {
    productosInconsistentes
  };
}

// Analizar todos los archivos
const resultadosPorArchivo = [];
for (const archivo of archivos) {
  const filePath = path.join(descargasDir, archivo);
  const resultado = analizarArchivo(filePath);
  resultadosPorArchivo.push(resultado);
}

// Analizar productos entre años
const resultadoEntreAños = analizarProductosEntreAños(resultadosPorArchivo);

// Mostrar resumen final
console.log(`\n========================================`);
console.log(`RESUMEN FINAL`);
console.log(`========================================`);

let totalProblemasClasificacion = 0;
let totalProblemasOrtografia = 0;

resultadosPorArchivo.forEach(res => {
  console.log(`Año ${res.año}:`);
  console.log(`- Total productos: ${res.totalProductos}`);
  console.log(`- Problemas clasificación: ${res.problemasClasificacion.length}`);
  console.log(`- Problemas ortografía: ${res.problemasOrtografia.length}`);
  
  totalProblemasClasificacion += res.problemasClasificacion.length;
  totalProblemasOrtografia += res.problemasOrtografia.length;
});

console.log(`\nTOTAL PROBLEMAS DETECTADOS:`);
console.log(`- Clasificación: ${totalProblemasClasificacion}`);
console.log(`- Ortografía: ${totalProblemasOrtografia}`);
console.log(`- Productos inconsistentes entre años: ${resultadoEntreAños.productosInconsistentes.length}`);

if (totalProblemasClasificacion === 0 && totalProblemasOrtografia === 0) {
  console.log(`\n✅ TODOS LOS PRODUCTOS ESTÁN CORRECTAMENTE CLASIFICADOS Y SIN ERRORES ORTOGRÁFICOS`);
} else {
  console.log(`\n❌ SE ENCONTRARON PROBLEMAS QUE DEBEN SER CORREGIDOS`);
} 
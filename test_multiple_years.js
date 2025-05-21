// Script para verificar el parseo de datos de múltiples años
const { parsePrecios, descargarPrecios } = require('./dist/index');
const fs = require('fs');
const path = require('path');

// Años a verificar (podría ajustarse según disponibilidad)
const AÑOS_A_VERIFICAR = [2023, 2024, 2025];
const descargasDir = path.join(__dirname, 'descargas');

// Asegurar que existe la carpeta de descargas
if (!fs.existsSync(descargasDir)) {
  fs.mkdirSync(descargasDir, { recursive: true });
}

// Función para analizar un año específico
async function analizarAño(año) {
  console.log(`\n=========================================`);
  console.log(`ANÁLISIS DE DATOS DEL AÑO ${año}`);
  console.log(`=========================================`);
  
  let filePath;
  
  try {
    // Verificar si ya tenemos el archivo descargado
    const nombreArchivo = `precios_medios_${año}.xlsx`;
    filePath = path.join(descargasDir, nombreArchivo);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Descargando datos del año ${año}...`);
      filePath = await descargarPrecios(año, descargasDir);
      console.log(`Archivo descargado en: ${filePath}`);
    } else {
      console.log(`Usando archivo existente: ${filePath}`);
    }
    
    // Parsear los datos
    console.log(`Parseando datos del año ${año}...`);
    const precios = parsePrecios(filePath);
    console.log(`Total de productos encontrados: ${precios.length}`);
    
    // Análisis por sectores
    const sectores = {};
    precios.forEach(p => {
      if (!sectores[p.sector]) {
        sectores[p.sector] = [];
      }
      sectores[p.sector].push(p);
    });
    
    console.log(`\nDISTRIBUCIÓN POR SECTORES:`);
    Object.keys(sectores).sort().forEach(sector => {
      console.log(`- ${sector}: ${sectores[sector].length} productos`);
    });
    
    // Verificar pipas de girasol
    const pipasGirasol = precios.filter(p => 
      p.producto.toLowerCase().includes('pipa de girasol') || 
      p.producto.toLowerCase().includes('pipas de girasol')
    );
    
    if (pipasGirasol.length > 0) {
      console.log(`\nPIPAS DE GIRASOL ENCONTRADAS: ${pipasGirasol.length}`);
      pipasGirasol.forEach(p => {
        console.log(`- ${p.producto} (Sector: ${p.sector})`);
      });
    } else {
      console.log('\nNo se encontraron productos de pipas de girasol');
    }
    
    // Verificar errores de "Aceie" vs "Aceite"
    const productosAceite = precios.filter(p => 
      p.producto.toLowerCase().includes('aceite')
    );
    
    const sectorAceite = precios.filter(p => 
      p.sector.toLowerCase().includes('aceite')
    );
    
    console.log(`\nPRODUCTOS CON "ACEITE" EN EL NOMBRE: ${productosAceite.length}`);
    console.log(`PRODUCTOS EN SECTORES DE ACEITE: ${sectorAceite.length}`);
    
    // Verificar la calidad de los datos de fechas
    const fechasValidas = precios.reduce((total, producto) => 
      total + producto.precios.filter(p => p.fecha && !isNaN(p.fecha.getTime())).length, 0
    );
    
    const fechasInvalidas = precios.reduce((total, producto) => 
      total + producto.precios.filter(p => !p.fecha || isNaN(p.fecha.getTime())).length, 0
    );
    
    console.log(`\nCALIDAD DE FECHAS:`);
    console.log(`- Fechas válidas: ${fechasValidas}`);
    console.log(`- Fechas inválidas: ${fechasInvalidas}`);
    
    return true;
  } catch (error) {
    console.error(`Error al analizar el año ${año}:`, error.message);
    return false;
  }
}

// Función principal para analizar todos los años
async function analizarTodosLosAños() {
  console.log('INICIANDO ANÁLISIS DE MÚLTIPLES AÑOS');
  console.log(`Años a verificar: ${AÑOS_A_VERIFICAR.join(', ')}`);
  
  const resultados = {};
  
  for (const año of AÑOS_A_VERIFICAR) {
    resultados[año] = await analizarAño(año);
  }
  
  console.log('\n=========================================');
  console.log('RESUMEN DE VERIFICACIÓN:');
  console.log('=========================================');
  
  let todosExitosos = true;
  for (const año of AÑOS_A_VERIFICAR) {
    const resultado = resultados[año] ? 'ÉXITO' : 'ERROR';
    console.log(`- Año ${año}: ${resultado}`);
    if (!resultados[año]) todosExitosos = false;
  }
  
  console.log(`\nVerificación completa: ${todosExitosos ? 'TODOS LOS AÑOS SE PARSEARON CORRECTAMENTE' : 'SE ENCONTRARON ERRORES'}`);
}

// Ejecutar el análisis
analizarTodosLosAños().catch(error => {
  console.error('Error general en el análisis:', error);
  process.exit(1);
}); 
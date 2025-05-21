// Script para descargar y analizar un archivo de precios
const { descargarPrecios, parsePrecios } = require('./dist/index');
const fs = require('fs');
const path = require('path');

const CARPETA_DESCARGAS = './descargas';
const año = new Date().getFullYear();

// Crear carpeta si no existe
if (!fs.existsSync(CARPETA_DESCARGAS)) {
  fs.mkdirSync(CARPETA_DESCARGAS, { recursive: true });
}

async function descargarYParsear() {
  try {
    console.log(`Descargando archivo de precios del año ${año}...`);
    const archivoDescargado = await descargarPrecios(año, CARPETA_DESCARGAS);
    
    console.log(`Archivo descargado en: ${archivoDescargado}`);
    console.log('Analizando el archivo...');
    
    const precios = parsePrecios(archivoDescargado);
    
    // Estadísticas generales
    console.log(`\n=== ESTADÍSTICAS GENERALES ===`);
    console.log(`Total de productos: ${precios.length}`);
    
    // Contar por sector
    const sectores = {};
    precios.forEach(p => {
      sectores[p.sector] = (sectores[p.sector] || 0) + 1;
    });
    
    console.log('\nProductos por sector:');
    Object.entries(sectores)
      .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad de productos
      .forEach(([sector, cantidad]) => {
        console.log(`  ${sector}: ${cantidad}`);
      });
    
    // Verificar fechas
    let conFechasValidas = 0;
    let sinFechasValidas = 0;
    
    precios.forEach(producto => {
      const fechasValidas = producto.precios.filter(p => p.fecha && !isNaN(p.fecha.getTime())).length;
      const fechasInvalidas = producto.precios.filter(p => !p.fecha || isNaN(p.fecha.getTime())).length;
      
      if (fechasValidas > 0) {
        conFechasValidas++;
      }
      
      if (fechasInvalidas > 0) {
        sinFechasValidas++;
      }
    });
    
    console.log(`\nProductos con fechas válidas: ${conFechasValidas}`);
    console.log(`Productos con fechas inválidas: ${sinFechasValidas}`);
    
    // Mostrar algunos ejemplos
    console.log('\n=== EJEMPLOS POR SECTOR ===');
    const sectoresArray = Object.keys(sectores);
    
    for (const sector of sectoresArray) {
      const productosDeSector = precios.filter(p => p.sector === sector);
      if (productosDeSector.length > 0) {
        console.log(`\n--- SECTOR: ${sector} ---`);
        const muestra = productosDeSector[0];
        console.log(`Producto: ${muestra.producto}`);
        console.log(`Especificación: ${muestra.especificacion || 'N/A'}`);
        
        // Mostrar primeras 3 fechas
        console.log('Fechas:');
        muestra.precios.slice(0, 3).forEach(p => {
          const fechaStr = p.fecha && !isNaN(p.fecha.getTime()) 
            ? p.fecha.toLocaleDateString() 
            : 'FECHA INVÁLIDA';
          console.log(`  ${p.semana}: ${fechaStr} - Valor: ${p.valor !== null ? p.valor : 'N/A'}`);
        });
      }
    }
    
    // Buscar productos sin sector o con sector OTROS
    const productosSinSector = precios.filter(p => !p.sector || p.sector === 'OTROS');
    console.log(`\n=== PRODUCTOS SIN SECTOR O SECTOR OTROS: ${productosSinSector.length} ===`);
    productosSinSector.slice(0, 5).forEach((p, idx) => {
      console.log(`\n${idx + 1}. Producto: ${p.producto}`);
      console.log(`   Sector: ${p.sector || 'SIN SECTOR'}`);
      console.log(`   Especificación: ${p.especificacion || 'N/A'}`);
    });
    
    // Buscar productos específicos por nombre
    console.log('\n=== BÚSQUEDA DE PRODUCTOS ESPECÍFICOS ===');
    const buscarProductos = ['vino', 'aceite', 'arroz', 'patata', 'trigo'];
    
    for (const termino of buscarProductos) {
      const encontrados = precios.filter(p => 
        p.producto.toLowerCase().includes(termino.toLowerCase()) || 
        p.especificacion.toLowerCase().includes(termino.toLowerCase())
      );
      
      console.log(`\nProductos con '${termino}': ${encontrados.length}`);
      
      if (encontrados.length > 0) {
        const muestra = encontrados[0];
        console.log(`  Ejemplo: ${muestra.producto} - Sector: ${muestra.sector}`);
        
        // Verificar fechas
        const fechasValidas = muestra.precios.filter(p => p.fecha && !isNaN(p.fecha.getTime())).length;
        const fechasInvalidas = muestra.precios.filter(p => !p.fecha || isNaN(p.fecha.getTime())).length;
        
        console.log(`  Fechas válidas: ${fechasValidas}`);
        console.log(`  Fechas inválidas: ${fechasInvalidas}`);
      }
    }
    
  } catch (error) {
    console.error('Error en la descarga o parseo:', error);
  }
}

descargarYParsear(); 
import { descargarPrecios, parsePrecios, type Precio } from './index';
import * as path from 'path';
import * as fs from 'fs';

async function verificarOrdenacionReal(año: number) {
  try {
    // Crear carpeta de descargas si no existe
    const carpetaDescargas = path.resolve(__dirname, '../descargas');
    if (!fs.existsSync(carpetaDescargas)) {
      fs.mkdirSync(carpetaDescargas, { recursive: true });
    }
    
    // Descargar archivo de precios del año especificado
    console.log(`Descargando precios del año ${año}...`);
    const rutaArchivo = await descargarPrecios(año, carpetaDescargas);
    console.log(`Archivo descargado: ${rutaArchivo}`);
    
    // Analizar el archivo descargado
    verificarOrdenacionFechas(rutaArchivo);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

function verificarOrdenacionFechas(rutaArchivo: string) {
  // Parsear los datos del archivo
  console.log(`\nAnalizando archivo: ${rutaArchivo}`);
  const precios = parsePrecios(rutaArchivo);
  
  // Información general
  console.log(`Total de productos encontrados: ${precios.length}`);
  
  // Estadísticas
  let totalProductos = 0;
  let productosConFechasOrdenadas = 0;
  let productosSinDuplicados = 0;
  let productosConSecuenciaConsecutiva = 0;
  let productosConSeparacion7Dias = 0;
  
  // Productos con problemas
  const productosConProblemas = [];
  
  // Analizar cada producto
  for (const producto of precios) {
    totalProductos++;
    let tieneFechasOrdenadas = true;
    let tieneSecuenciaConsecutiva = true;
    let tieneSeparacion7Dias = true;
    let tieneDuplicados = false;
    let problemas = [];
    
    // Verificar duplicados de fechas
    const mapFechas = new Map<string, number>();
    producto.precios.forEach(p => {
      const fechaKey = p.fecha instanceof Date ? p.fecha.toISOString().split('T')[0] : 'fecha-invalida';
      mapFechas.set(fechaKey, (mapFechas.get(fechaKey) || 0) + 1);
    });
    
    // Contar duplicados
    for (const [fecha, count] of mapFechas.entries()) {
      if (count > 1) {
        tieneDuplicados = true;
        problemas.push(`Tiene fechas duplicadas (${fecha} aparece ${count} veces)`);
        break;
      }
    }
    
    if (!tieneDuplicados) {
      productosSinDuplicados++;
    }
    
    // Verificar orden cronológico
    for (let i = 1; i < producto.precios.length; i++) {
      const anterior = producto.precios[i-1];
      const actual = producto.precios[i];
      
      if (anterior.fecha.getTime() > actual.fecha.getTime()) {
        tieneFechasOrdenadas = false;
        problemas.push(`Fechas desordenadas: ${anterior.semana} (${anterior.fecha.toISOString().split('T')[0]}) > ${actual.semana} (${actual.fecha.toISOString().split('T')[0]})`);
      }
      
      // Verificar secuencia de semanas
      const semanaAnterior = parseInt(anterior.semana.replace('Semana ', ''));
      const semanaActual = parseInt(actual.semana.replace('Semana ', ''));
      
      // Considerar cambio de año (de Semana 52/53 a Semana 01)
      const esCambioAño = (semanaAnterior === 52 || semanaAnterior === 53) && semanaActual === 1;
      const esConsecutivo = esCambioAño || semanaActual === semanaAnterior + 1;
      
      if (!esConsecutivo) {
        tieneSecuenciaConsecutiva = false;
        problemas.push(`Semanas no consecutivas: De Semana ${semanaAnterior} a Semana ${semanaActual}`);
      }
      
      // Verificar separación de 7 días (con margen de 1 día)
      const diffDias = Math.floor((actual.fecha.getTime() - anterior.fecha.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias < 6 || diffDias > 8) {
        tieneSeparacion7Dias = false;
        problemas.push(`Separación incorrecta: ${diffDias} días entre ${anterior.semana} y ${actual.semana}`);
      }
    }
    
    if (tieneFechasOrdenadas) {
      productosConFechasOrdenadas++;
    }
    
    if (tieneSecuenciaConsecutiva) {
      productosConSecuenciaConsecutiva++;
    }
    
    if (tieneSeparacion7Dias) {
      productosConSeparacion7Dias++;
    }
    
    // Si tiene problemas, guardar para reporte
    if (problemas.length > 0) {
      productosConProblemas.push({
        producto: `${producto.producto} (${producto.sector})`,
        problemas
      });
    }
  }
  
  // Mostrar estadísticas
  console.log("\n===== ESTADÍSTICAS DE ORDENACIÓN =====");
  console.log(`Productos sin fechas duplicadas: ${productosSinDuplicados}/${totalProductos} (${(productosSinDuplicados/totalProductos*100).toFixed(2)}%)`);
  console.log(`Productos con fechas ordenadas cronológicamente: ${productosConFechasOrdenadas}/${totalProductos} (${(productosConFechasOrdenadas/totalProductos*100).toFixed(2)}%)`);
  console.log(`Productos con semanas consecutivas: ${productosConSecuenciaConsecutiva}/${totalProductos} (${(productosConSecuenciaConsecutiva/totalProductos*100).toFixed(2)}%)`);
  console.log(`Productos con separación aproximada de 7 días: ${productosConSeparacion7Dias}/${totalProductos} (${(productosConSeparacion7Dias/totalProductos*100).toFixed(2)}%)`);
  
  // Mostrar productos con problemas (limitado a 10 para no saturar la consola)
  if (productosConProblemas.length > 0) {
    console.log(`\n===== PRODUCTOS CON PROBLEMAS (${productosConProblemas.length}) =====`);
    const maxMostrar = Math.min(productosConProblemas.length, 10);
    for (let i = 0; i < maxMostrar; i++) {
      const p = productosConProblemas[i];
      console.log(`\n${i+1}. ${p.producto}`);
      p.problemas.slice(0, 5).forEach(problema => console.log(`   - ${problema}`));
      if (p.problemas.length > 5) {
        console.log(`   - ... y ${p.problemas.length - 5} problemas más`);
      }
    }
    if (productosConProblemas.length > maxMostrar) {
      console.log(`\n... y ${productosConProblemas.length - maxMostrar} productos más con problemas`);
    }
  }
}

// Ejecutar análisis con el año 2023
verificarOrdenacionReal(2023); 
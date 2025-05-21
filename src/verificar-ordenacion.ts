import { parsePrecios, type Precio } from './index';
import * as path from 'path';

function verificarOrdenacionFechas(rutaArchivo: string) {
  // Parsear los datos del archivo
  console.log(`Analizando archivo: ${rutaArchivo}`);
  const precios = parsePrecios(rutaArchivo);
  
  // Información general
  console.log(`Total de productos encontrados: ${precios.length}`);
  
  // Estadísticas
  let totalProductos = 0;
  let productosConFechasOrdenadas = 0;
  let productosSinDuplicados = 0;
  let productosConSecuenciaConsecutiva = 0;
  let productosConSeparacion7Dias = 0;
  
  // Analizar cada producto
  for (const producto of precios) {
    totalProductos++;
    let tieneFechasOrdenadas = true;
    let tieneSecuenciaConsecutiva = true;
    let tieneSeparacion7Dias = true;
    let tieneDuplicados = false;
    
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
      }
      
      // Verificar secuencia de semanas
      const semanaAnterior = parseInt(anterior.semana.replace('Semana ', ''));
      const semanaActual = parseInt(actual.semana.replace('Semana ', ''));
      
      // Considerar cambio de año (de Semana 52/53 a Semana 01)
      const esCambioAño = (semanaAnterior === 52 || semanaAnterior === 53) && semanaActual === 1;
      const esConsecutivo = esCambioAño || semanaActual === semanaAnterior + 1;
      
      if (!esConsecutivo) {
        tieneSecuenciaConsecutiva = false;
      }
      
      // Verificar separación de 7 días (con margen de 1 día)
      const diffDias = Math.floor((actual.fecha.getTime() - anterior.fecha.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias < 6 || diffDias > 8) {
        tieneSeparacion7Dias = false;
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
  }
  
  // Mostrar estadísticas
  console.log("\n===== ESTADÍSTICAS DE ORDENACIÓN =====");
  console.log(`Productos sin fechas duplicadas: ${productosSinDuplicados}/${totalProductos} (${(productosSinDuplicados/totalProductos*100).toFixed(2)}%)`);
  console.log(`Productos con fechas ordenadas cronológicamente: ${productosConFechasOrdenadas}/${totalProductos} (${(productosConFechasOrdenadas/totalProductos*100).toFixed(2)}%)`);
  console.log(`Productos con semanas consecutivas: ${productosConSecuenciaConsecutiva}/${totalProductos} (${(productosConSecuenciaConsecutiva/totalProductos*100).toFixed(2)}%)`);
  console.log(`Productos con separación aproximada de 7 días: ${productosConSeparacion7Dias}/${totalProductos} (${(productosConSeparacion7Dias/totalProductos*100).toFixed(2)}%)`);
}

// Ejecutar análisis con datos de test
const rutaTest = path.resolve(__dirname, '../test/fixtures/sample-prices.xlsx');
verificarOrdenacionFechas(rutaTest); 
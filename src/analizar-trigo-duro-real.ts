import { descargarPrecios, parsePrecios, type Precio } from './index';
import * as path from 'path';
import * as fs from 'fs';

async function analizarTrigoDuroReal(año: number) {
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
    analizarTrigoEnArchivo(rutaArchivo);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

function analizarTrigoEnArchivo(rutaArchivo: string) {
  console.log(`\nAnalizando archivo: ${rutaArchivo}`);
  const precios = parsePrecios(rutaArchivo);
  
  // Información general
  console.log(`Total de productos encontrados: ${precios.length}`);
  
  // Buscar todos los productos de trigo duro
  const productosTrigoDuro = precios.filter(p => 
    p.producto.toLowerCase().includes('trigo duro') || 
    (p.producto.toLowerCase().includes('trigo') && p.especificacion.toLowerCase().includes('duro'))
  );
  
  // Buscar también trigo general para comparar
  const productosTrigoBlandoMaltero = precios.filter(p =>
    (p.producto.toLowerCase().includes('trigo blando') || 
     p.producto.toLowerCase().includes('trigo para malta') ||
     p.producto.toLowerCase().includes('trigo panificable'))
  );
  
  console.log(`\n===== ANÁLISIS DE TRIGO DURO =====`);
  console.log(`Productos de trigo duro encontrados: ${productosTrigoDuro.length}`);
  console.log(`Productos de otros trigos encontrados: ${productosTrigoBlandoMaltero.length}`);
  
  // Analizar cada producto de trigo duro
  analizarProductos("TRIGO DURO", productosTrigoDuro);
  
  // Analizar otros trigos para comparación
  if (productosTrigoBlandoMaltero.length > 0) {
    console.log(`\n===== ANÁLISIS DE OTROS TRIGOS (PARA COMPARACIÓN) =====`);
    analizarProductos("OTROS TRIGOS", productosTrigoBlandoMaltero);
  }
}

function analizarProductos(titulo: string, productos: Precio[]) {
  productos.forEach((producto, index) => {
    console.log(`\n--- ${titulo} #${index + 1}: ${producto.producto} (${producto.sector}) ---`);
    console.log(`Especificación: "${producto.especificacion}"`);
    
    // Analizar las fechas
    if (producto.precios.length === 0) {
      console.log("⚠️ Sin datos de precios");
      return;
    }
    
    // Buscar fechas duplicadas
    const mapFechas = new Map<string, Array<{semana: string, fecha: Date, valor: number | null}>>();
    producto.precios.forEach(p => {
      const fechaKey = p.fecha instanceof Date ? p.fecha.toISOString().split('T')[0] : 'fecha-invalida';
      if (!mapFechas.has(fechaKey)) {
        mapFechas.set(fechaKey, []);
      }
      mapFechas.get(fechaKey)!.push(p);
    });
    
    // Verificar fechas duplicadas
    let tieneDuplicados = false;
    mapFechas.forEach((precios, fecha) => {
      if (precios.length > 1) {
        tieneDuplicados = true;
        console.log(`🔴 Fecha duplicada: ${fecha} aparece ${precios.length} veces:`);
        precios.forEach(p => {
          console.log(`  - ${p.semana}: ${p.valor !== null ? p.valor : 'null'}`);
        });
      }
    });
    
    if (!tieneDuplicados) {
      console.log("✅ No se encontraron fechas duplicadas");
    }
    
    // Ordenar las fechas cronológicamente
    const preciosOrdenados = [...producto.precios]
      .filter(p => p.fecha instanceof Date && !isNaN(p.fecha.getTime()))
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    
    // Imprimir todas las fechas
    console.log("\nFechas ordenadas:");
    preciosOrdenados.forEach(p => {
      const fechaFormateada = `${p.fecha.getDate().toString().padStart(2, '0')}/${(p.fecha.getMonth() + 1).toString().padStart(2, '0')}/${p.fecha.getFullYear()}`;
      console.log(`- ${p.semana}: ${fechaFormateada} (${p.valor !== null ? p.valor : 'null'})`);
    });
    
    // Verificar días entre semanas consecutivas
    console.log("\nDistancia entre semanas consecutivas:");
    for (let i = 0; i < preciosOrdenados.length - 1; i++) {
      const actual = preciosOrdenados[i];
      const siguiente = preciosOrdenados[i + 1];
      
      // Calcular diferencia en días
      const diffDias = Math.floor((siguiente.fecha.getTime() - actual.fecha.getTime()) / (1000 * 60 * 60 * 24));
      
      // Formatear fechas para mostrar
      const f1 = `${actual.fecha.getDate().toString().padStart(2, '0')}/${(actual.fecha.getMonth() + 1).toString().padStart(2, '0')}/${actual.fecha.getFullYear()}`;
      const f2 = `${siguiente.fecha.getDate().toString().padStart(2, '0')}/${(siguiente.fecha.getMonth() + 1).toString().padStart(2, '0')}/${siguiente.fecha.getFullYear()}`;
      
      // Marcar si hay problema (menos de 6 días o más de 8 días)
      const status = diffDias < 6 ? '🔴' : (diffDias > 8 ? '⚠️' : '✅');
      
      console.log(`${status} De ${actual.semana} (${f1}) a ${siguiente.semana} (${f2}): ${diffDias} días`);
    }
    
    // Comprobar si las semanas son consecutivas
    console.log("\nSecuencia de semanas:");
    let hayProblemaSecuencia = false;
    
    for (let i = 0; i < preciosOrdenados.length - 1; i++) {
      const actual = parseInt(preciosOrdenados[i].semana.replace('Semana ', ''));
      const siguiente = parseInt(preciosOrdenados[i + 1].semana.replace('Semana ', ''));
      
      // Manejar el caso de cambio de año (Semana 52 a Semana 01)
      const esCambioAño = (actual === 52 || actual === 53) && siguiente === 1;
      const esConsecutivo = esCambioAño || siguiente === actual + 1;
      
      const status = esConsecutivo ? '✅' : '🔴';
      if (!esConsecutivo) hayProblemaSecuencia = true;
      
      console.log(`${status} De Semana ${actual.toString().padStart(2, '0')} a Semana ${siguiente.toString().padStart(2, '0')}`);
    }
    
    if (!hayProblemaSecuencia && preciosOrdenados.length > 1) {
      console.log("✅ Todas las semanas son consecutivas");
    }
    
    // Analizar variación de precios
    if (preciosOrdenados.length >= 2) {
      console.log("\nVariación de precios:");
      let hayVariacionSospechosa = false;
      
      for (let i = 0; i < preciosOrdenados.length - 1; i++) {
        const actual = preciosOrdenados[i];
        const siguiente = preciosOrdenados[i + 1];
        
        if (actual.valor !== null && siguiente.valor !== null) {
          const variacionAbsoluta = siguiente.valor - actual.valor;
          const variacionPorcentual = (variacionAbsoluta / actual.valor) * 100;
          
          // Marcar variaciones mayores al 20% como sospechosas
          const esSospechosa = Math.abs(variacionPorcentual) > 20;
          const status = esSospechosa ? '⚠️' : '✅';
          if (esSospechosa) hayVariacionSospechosa = true;
          
          console.log(`${status} De ${actual.semana} (${actual.valor}) a ${siguiente.semana} (${siguiente.valor}): ${variacionAbsoluta.toFixed(2)} (${variacionPorcentual.toFixed(2)}%)`);
        }
      }
      
      if (!hayVariacionSospechosa) {
        console.log("✅ No se encontraron variaciones sospechosas en los precios");
      }
    }
  });
}

// Analizar los últimos 3 años disponibles
(async () => {
  try {
    const añoActual = new Date().getFullYear();
    for (let año = añoActual; año >= añoActual - 2; año--) {
      console.log(`\n\n========== ANÁLISIS AÑO ${año} ==========\n`);
      try {
        await analizarTrigoDuroReal(año);
      } catch(e) {
        console.log(`Error al analizar el año ${año}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (error) {
    console.error('Error general:', error instanceof Error ? error.message : String(error));
  }
})(); 
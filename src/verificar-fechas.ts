import { parsePrecios } from './index';
import * as path from 'path';

function verificarFechas(rutaArchivo: string) {
  // Parsear los datos del archivo
  console.log(`Analizando archivo: ${rutaArchivo}`);
  const precios = parsePrecios(rutaArchivo);
  
  // Información general
  console.log(`Total de productos encontrados: ${precios.length}`);
  
  // Contadores para estadísticas
  let totalProductosConFechasInvalidas = 0;
  let totalProductosConSuperposiciones = 0;
  let totalSuperposicionesEncontradas = 0;
  
  // Verificar fechas por cada producto
  for (let i = 0; i < Math.min(10, precios.length); i++) {
    const producto = precios[i];
    console.log(`\n--- Producto ${i+1}: ${producto.producto} (${producto.sector}) ---`);
    
    // Verificar fechas inválidas
    const fechasInvalidas = producto.precios.filter(p => 
      !(p.fecha instanceof Date) || isNaN(p.fecha.getTime())
    );
    
    if (fechasInvalidas.length > 0) {
      console.log(`🔴 Fechas inválidas encontradas: ${fechasInvalidas.length}`);
      totalProductosConFechasInvalidas++;
    }
    
    // Ordenar las fechas cronológicamente
    const preciosOrdenados = [...producto.precios]
      .filter(p => p.fecha instanceof Date && !isNaN(p.fecha.getTime()))
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    
    // Imprimir todas las fechas
    console.log("Fechas ordenadas:");
    preciosOrdenados.forEach(p => {
      const fechaFormateada = `${p.fecha.getDate().toString().padStart(2, '0')}/${(p.fecha.getMonth() + 1).toString().padStart(2, '0')}/${p.fecha.getFullYear()}`;
      console.log(`- ${p.semana}: ${fechaFormateada} (${p.valor !== null ? p.valor : 'null'})`);
    });
    
    // Verificar superposiciones
    const superposiciones = [];
    for (let i = 0; i < preciosOrdenados.length - 1; i++) {
      const actual = preciosOrdenados[i];
      const siguiente = preciosOrdenados[i + 1];
      
      // Calcular diferencia en días
      const diffDias = Math.floor((siguiente.fecha.getTime() - actual.fecha.getTime()) / (1000 * 60 * 60 * 24));
      
      // Si la diferencia es menor a 6 días, podría ser una superposición
      if (diffDias < 6) {
        superposiciones.push({
          fecha1: actual.fecha,
          semana1: actual.semana,
          fecha2: siguiente.fecha,
          semana2: siguiente.semana,
          diferenciaDias: diffDias
        });
      }
    }
    
    // Imprimir superposiciones encontradas
    if (superposiciones.length > 0) {
      console.log("\n🔴 Superposiciones encontradas:");
      superposiciones.forEach(s => {
        const f1 = `${s.fecha1.getDate().toString().padStart(2, '0')}/${(s.fecha1.getMonth() + 1).toString().padStart(2, '0')}/${s.fecha1.getFullYear()}`;
        const f2 = `${s.fecha2.getDate().toString().padStart(2, '0')}/${(s.fecha2.getMonth() + 1).toString().padStart(2, '0')}/${s.fecha2.getFullYear()}`;
        console.log(`- ${s.semana1} (${f1}) y ${s.semana2} (${f2}) - Diferencia: ${s.diferenciaDias} días`);
      });
      totalProductosConSuperposiciones++;
      totalSuperposicionesEncontradas += superposiciones.length;
    } else {
      console.log("\n✅ No se encontraron superposiciones");
    }
    
    // Verificar secuencia de semanas
    if (preciosOrdenados.length > 0) {
      let semanaAnterior = parseInt(preciosOrdenados[0].semana.replace('Semana ', ''));
      let saltosSemana = [];
      
      for (let i = 1; i < preciosOrdenados.length; i++) {
        const semanaActual = parseInt(preciosOrdenados[i].semana.replace('Semana ', ''));
        if (semanaActual !== semanaAnterior + 1) {
          saltosSemana.push({
            desde: `Semana ${semanaAnterior.toString().padStart(2, '0')}`,
            hasta: `Semana ${semanaActual.toString().padStart(2, '0')}`,
            salto: semanaActual - semanaAnterior
          });
        }
        semanaAnterior = semanaActual;
      }
      
      if (saltosSemana.length > 0) {
        console.log("\n⚠️ Saltos en la secuencia de semanas:");
        saltosSemana.forEach(salto => {
          console.log(`- De ${salto.desde} a ${salto.hasta} (salto de ${salto.salto} semanas)`);
        });
      }
    }
  }
  
  // Mostrar estadísticas globales
  console.log("\n===== ESTADÍSTICAS GLOBALES =====");
  console.log(`Total de productos analizados: ${Math.min(10, precios.length)}`);
  console.log(`Productos con fechas inválidas: ${totalProductosConFechasInvalidas}`);
  console.log(`Productos con superposiciones: ${totalProductosConSuperposiciones}`);
  console.log(`Total de superposiciones encontradas: ${totalSuperposicionesEncontradas}`);
}

// Archivo de ejemplo de test
const rutaTest = path.resolve(__dirname, '../test/fixtures/sample-prices.xlsx');
verificarFechas(rutaTest); 
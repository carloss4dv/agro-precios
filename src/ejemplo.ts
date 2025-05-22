import { descargarPrecios, parsePrecios, convertirAEurosPorKg } from './index';

async function main() {
  try {
    // Estadísticas de problemas por año
    const estadisticas: { [año: number]: { 
      totalProductos: number,
      fechasInvalidas: number, 
      añosIncorrectos: number, 
      fechasDesordenadas: number,
      productosConProblemas: Set<string>
    }} = {};

    for (let i = 2019; i <= 2024; i++) {
      console.log(`\n==========================================`);
      console.log(`PROCESANDO AÑO ${i}`);
      console.log(`==========================================\n`);
      
      // Inicializar estadísticas para este año
      estadisticas[i] = {
        totalProductos: 0,
        fechasInvalidas: 0,
        añosIncorrectos: 0,
        fechasDesordenadas: 0,
        productosConProblemas: new Set<string>()
      };
      
      try {
        const ruta = await descargarPrecios(i);
        const datos = parsePrecios(ruta);
        const convertidos = convertirAEurosPorKg(datos);
        
        estadisticas[i].totalProductos = convertidos.length;

        // Mostrar ejemplos de productos (uno por sector para este año)
        const sectoresVistos = new Set<string>();
        let contadorProductos = 0;

        // Primero listar todos los sectores disponibles
        const sectores = [...new Set(convertidos.map(p => p.sector))].sort();
        console.log(`SECTORES DISPONIBLES (${sectores.length}):`);
        console.log(sectores.join(', '));
        console.log('\n');

        // Mostrar información de productos por sector
        for (const registro of convertidos) {
          // Mostrar solo un producto por sector, máximo 15 productos en total
          if (!sectoresVistos.has(registro.sector) && contadorProductos < 15) {
            sectoresVistos.add(registro.sector);
            contadorProductos++;
            
            console.log(`SECTOR: ${registro.sector}`);
            console.log(`PRODUCTO: ${registro.producto}`);
            console.log(`ESPECIFICACIÓN: ${registro.especificacion}`);
            console.log(`NÚMERO DE PRECIOS: ${registro.precios.length}`);
            
            // Mostrar las primeras y últimas fechas para ver el rango
            if (registro.precios.length > 0) {
              const primeraFecha = registro.precios[0].fecha;
              const ultimaFecha = registro.precios[registro.precios.length - 1].fecha;
              
              console.log(`RANGO DE FECHAS: ${primeraFecha?.toLocaleDateString('es-ES')} - ${ultimaFecha?.toLocaleDateString('es-ES')}`);
              
              // Mostrar los primeros 3 precios como muestra
              console.log('MUESTRA DE PRECIOS:');
              for (let i = 0; i < Math.min(3, registro.precios.length); i++) {
                const precio = registro.precios[i];
                console.log(`  ${precio.semana}: ${precio.fecha?.toLocaleDateString('es-ES')} - ${precio.valor} €/kg`);
              }
              
              // Si hay más de 3 precios, mostrar el último también
              if (registro.precios.length > 3) {
                const ultimoPrecio = registro.precios[registro.precios.length - 1];
                console.log(`  ${ultimoPrecio.semana}: ${ultimoPrecio.fecha?.toLocaleDateString('es-ES')} - ${ultimoPrecio.valor} €/kg`);
              }
            }
            
            console.log('----------------------------------------\n');
          }
          
          // Revisión de fechas por producto (mantenemos el análisis)
          let fechasProblematicas = false;
          let fechaAnterior: Date | null = null;
          
          for (const precio of registro.precios) {
            // Verificar si la fecha es válida
            if (!(precio.fecha instanceof Date) || isNaN(precio.fecha.getTime())) {
              estadisticas[i].fechasInvalidas++;
              fechasProblematicas = true;
              continue;
            }
            
            // Verificar que el año corresponda
            const añoFecha = precio.fecha.getFullYear();
            if (añoFecha !== i && !(añoFecha === i + 1 && precio.fecha.getMonth() === 0)) {
              estadisticas[i].añosIncorrectos++;
              fechasProblematicas = true;
              
              // Mostrar detalles para errores de año
              console.log(`PROBLEMA DE AÑO en ${registro.producto}: Semana ${precio.semana}, Fecha ${precio.fecha.toLocaleDateString('es-ES')}, Esperado: ${i}, Actual: ${añoFecha}`);
            }
            
            // Verificar orden cronológico
            if (fechaAnterior && precio.fecha < fechaAnterior) {
              estadisticas[i].fechasDesordenadas++;
              fechasProblematicas = true;
            }
            
            fechaAnterior = precio.fecha;
          }
          
          if (fechasProblematicas) {
            estadisticas[i].productosConProblemas.add(`${registro.sector} - ${registro.producto}`);
          }
        }
      } catch (error) {
        console.error(`Error procesando año ${i}:`, error instanceof Error ? error.message : error);
      }
    }

    // Mostrar resumen de estadísticas
    console.log("\n===== RESUMEN DE PROBLEMAS DETECTADOS =====");
    for (const año in estadisticas) {
      const stats = estadisticas[Number(año)];
      console.log(`\nAÑO ${año}:`);
      console.log(`- Total de productos analizados: ${stats.totalProductos}`);
      console.log(`- Fechas inválidas encontradas: ${stats.fechasInvalidas}`);
      console.log(`- Problemas de año incorrecto: ${stats.añosIncorrectos}`);
      console.log(`- Problemas de fechas desordenadas: ${stats.fechasDesordenadas}`);
      console.log(`- Productos con algún problema: ${stats.productosConProblemas.size} de ${stats.totalProductos} (${stats.totalProductos > 0 ? Math.round((stats.productosConProblemas.size / stats.totalProductos) * 100) : 0}%)`);
      
      if (stats.productosConProblemas.size > 0 && stats.productosConProblemas.size <= 10) {
        console.log('  Productos afectados:');
        stats.productosConProblemas.forEach(producto => console.log(`  - ${producto}`));
      }
    }

  } catch (error) {
    // Verificación de tipo segura
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error desconocido:', error);
    }
  }
}

main();

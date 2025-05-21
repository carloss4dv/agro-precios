import { parsePrecios } from './index';
import * as fs from 'fs';
import * as path from 'path';

const ANSI_RESET = '\x1b[0m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_RED = '\x1b[31m';

// Función principal
async function main() {
  try {
    console.log('VERIFICANDO ASIGNACIÓN DE SECTORES...\n');
    
    // Año a verificar
    const años = [2023, 2024, 2025];
    const sectoresPorProducto: Map<string, Set<string>> = new Map();
    const productosPorSector: Map<string, string[]> = new Map();
    const infoProductos: Map<string, any> = new Map();
    let totalProductos = 0;
    
    // Procesar archivos para cada año
    for (const año of años) {
      const filePath = path.join(__dirname, '..', 'descargas', `precios_medios_${año}.xlsx`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`${ANSI_YELLOW}Archivo para el año ${año} no encontrado: ${filePath}${ANSI_RESET}`);
        continue;
      }
      
      console.log(`Analizando datos de ${año}...`);
      
      // Parsear el archivo
      const datos = parsePrecios(filePath);
      console.log(`  Encontrados ${datos.length} productos\n`);
      totalProductos += datos.length;
      
      // Registrar cada producto y sus sectores
      for (const item of datos) {
        const key = item.producto;
        
        // Guardar info para depuración
        if (!infoProductos.has(key)) {
          infoProductos.set(key, item);
        }
        
        // Guardar sectores
        if (!sectoresPorProducto.has(key)) {
          sectoresPorProducto.set(key, new Set());
        }
        sectoresPorProducto.get(key)!.add(item.sector);
        
        // Guardar productos por sector
        if (!productosPorSector.has(item.sector)) {
          productosPorSector.set(item.sector, []);
        }
        
        if (!productosPorSector.get(item.sector)!.includes(key)) {
          productosPorSector.get(item.sector)!.push(key);
        }
      }
    }
    
    console.log('\nRESULTADOS DEL ANÁLISIS DE SECTORES:\n');
    
    // Productos con múltiples sectores (inconsistentes)
    const productosInconsistentes = [...sectoresPorProducto.entries()]
      .filter(([_, sectores]) => sectores.size > 1)
      .sort(([a], [b]) => a.localeCompare(b));
    
    if (productosInconsistentes.length > 0) {
      console.log(`${ANSI_RED}PRODUCTOS CON CLASIFICACIÓN INCONSISTENTE:${ANSI_RESET}`);
      console.log(`${'='.repeat(80)}`);
      
      for (const [producto, sectores] of productosInconsistentes) {
        console.log(`${ANSI_YELLOW}${producto}${ANSI_RESET}`);
        console.log(`  Sectores detectados: ${[...sectores].join(', ')}`);
        console.log('-'.repeat(80));
      }
      
      console.log(`\n${ANSI_RED}Total de productos con clasificación inconsistente: ${productosInconsistentes.length}${ANSI_RESET}`);
    } else {
      console.log(`${ANSI_GREEN}¡Todos los productos están asignados consistentemente al mismo sector!${ANSI_RESET}`);
    }
    
    // Mostrar detalle del sector problemático
    const sectorProblematico = 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS';
    console.log(`\n${ANSI_YELLOW}VERIFICACIÓN DE CLASIFICACIÓN DE PRODUCTOS POR SECTOR${ANSI_RESET}`);
    console.log(`${'='.repeat(80)}`);
    
    const productosEnSector = productosPorSector.get(sectorProblematico) || [];
    console.log(`Total de productos en el sector ${sectorProblematico}: ${productosEnSector.length}`);
    
    // Definir reglas para clasificación correcta de productos
    const reglasSectores = new Map<string, string[]>([
      ['SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS', ['colza grano', 'garbanzos', 'lentejas', 'habas secas', 'guisantes secos', 'pipa de girasol', 'torta de girasol', 'torta de soja', 'alfalfa']],
      ['ACEITES VEGETALES Y ACEITUNA DE MESA', ['aceite', 'aceituna']], 
      ['HORTALIZAS', ['tomate', 'lechuga', 'escarola', 'alcachofa', 'patata', 'cebolla', 'pimiento', 'col-repollo', 'col repollo']],
      ['FRUTAS', ['manzana', 'pera', 'naranja', 'mandarina', 'limón', 'melocotón', 'uva', 'sandía']],
      ['AVES, HUEVOS, CAZA', [' pollo', 'huevo', ' conejo']], // Espacio antes para evitar coincidencias parciales
    ]);
    
    // Verificar clasificación por sector y destacar problemas
    console.log('\nAnalisis de sectores y productos:');
    
    let problemasTotales = 0;
    
    // Recorrer cada sector para comprobar sus productos
    for (const [sector, palabrasClave] of reglasSectores) {
      console.log(`\n${ANSI_GREEN}Comprobando sector: ${sector}${ANSI_RESET}`);
      
      // Lista para almacenar productos mal clasificados
      const productosIncorrectos: string[] = [];
      
      // Verificar productos que no están en este sector pero deberían
      for (const [producto, sectores] of sectoresPorProducto.entries()) {
        const productoLower = ' ' + producto.toLowerCase() + ' '; // Añadir espacios para comparación de palabras completas
        const sectorActual = [...sectores][0];
        
        // Si coincide con alguna palabra clave de este sector
        if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
          
          // Excepciones conocidas
          if (sector === 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS' &&
              (productoLower.includes('aceite de') || productoLower.includes('aceite refinado'))) {
            // Los aceites van en ACEITES VEGETALES Y ACEITUNA DE MESA aunque contengan "girasol" o "soja"
            continue;
          }
          
          // Si no está en el sector correcto
          if (sectorActual !== sector) {
            productosIncorrectos.push(`${producto} => ${sectorActual} (debería ser ${sector})`);
          }
        }
      }
      
      // Mostrar resultados para este sector
      if (productosIncorrectos.length > 0) {
        console.log(`${ANSI_RED}Productos mal clasificados:${ANSI_RESET}`);
        productosIncorrectos.forEach(p => console.log(`  - ${p}`));
        problemasTotales += productosIncorrectos.length;
      } else {
        console.log(`  ${ANSI_GREEN}✓ Todos los productos están correctamente clasificados en este sector${ANSI_RESET}`);
      }
    }
    
    // Resumen final
    if (problemasTotales === 0) {
      console.log(`\n${ANSI_GREEN}¡Todos los productos están correctamente clasificados en sus sectores!${ANSI_RESET}`);
    } else {
      console.log(`\n${ANSI_RED}Se encontraron ${problemasTotales} problemas de clasificación que requieren atención.${ANSI_RESET}`);
    }
    
    // Mostrar lista de sectores y productos
    console.log('\nDISTRIBUCIÓN DE SECTORES:');
    console.log(`${'='.repeat(80)}`);
    
    // Mostrar productos por sector
    for (const [sector, productos] of [...productosPorSector.entries()].sort()) {
      console.log(`${ANSI_GREEN}${sector}${ANSI_RESET} (${productos.length} productos)`);
      productos.sort().forEach(p => console.log(`  - ${p}`));
      console.log('-'.repeat(80));
    }
    
    console.log(`\nTotal de productos únicos: ${sectoresPorProducto.size}`);
    console.log(`Total de registros procesados: ${totalProductos}`);
    
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

// Ejecutar
main(); 
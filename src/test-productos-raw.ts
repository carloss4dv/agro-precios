import { parsePrecios } from './index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    console.log('LISTADO COMPLETO DE PRODUCTOS Y SUS SECTORES\n');
    
    // Años a analizar
    const años = [2023, 2024, 2025];
    const productos = new Map<string, string>();
    
    // Procesar archivos para cada año
    for (const año of años) {
      const filePath = path.join(__dirname, '..', 'descargas', `precios_medios_${año}.xlsx`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`Archivo para el año ${año} no encontrado: ${filePath}`);
        continue;
      }
      
      console.log(`Analizando datos de ${año}...`);
      
      // Parsear el archivo
      const datos = parsePrecios(filePath);
      console.log(`  Encontrados ${datos.length} productos\n`);
      
      // Guardar cada producto con su sector
      for (const item of datos) {
        productos.set(item.producto, item.sector);
      }
    }
    
    // Mostrar todos los productos ordenados alfabéticamente
    console.log('\nPRODUCTOS ORDENADOS ALFABÉTICAMENTE:');
    console.log('=' .repeat(80));
    
    const productosOrdenados = [...productos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [producto, sector] of productosOrdenados) {
      console.log(`${producto} => ${sector}`);
    }
    
    console.log('\nPRODUCTOS AGRUPADOS POR SECTOR:');
    console.log('=' .repeat(80));
    
    // Agrupar productos por sector
    const sectores = new Map<string, string[]>();
    
    for (const [producto, sector] of productos.entries()) {
      if (!sectores.has(sector)) {
        sectores.set(sector, []);
      }
      sectores.get(sector)?.push(producto);
    }
    
    // Mostrar productos agrupados por sector
    for (const [sector, listaProductos] of [...sectores.entries()].sort()) {
      console.log(`\n${sector} (${listaProductos.length} productos):`);
      console.log('-' .repeat(80));
      
      listaProductos.sort().forEach(p => {
        console.log(`- ${p}`);
      });
    }
    
    console.log(`\nTotal de productos únicos: ${productos.size}`);
    
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main(); 
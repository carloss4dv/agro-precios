import { parsePrecios } from './index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    // Años a analizar
    const años = [2023, 2024, 2025];
    
    // Procesar archivos para cada año
    for (const año of años) {
      const filePath = path.join(__dirname, '..', 'descargas', `precios_medios_${año}.xlsx`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`Archivo para el año ${año} no encontrado: ${filePath}`);
        continue;
      }
      
      console.log(`\n\n========== DATOS RAW DEL TRIGO DURO - AÑO ${año} ==========\n`);
      
      // Parsear el archivo sin aplicar filtros
      const datos = parsePrecios(filePath);
      
      // Buscar productos de trigo duro
      const productosTrigoDuro = datos.filter(p => 
        p.producto.toLowerCase().includes('trigo duro') || 
        (p.producto.toLowerCase().includes('trigo') && p.especificacion.toLowerCase().includes('duro'))
      );
      
      if (productosTrigoDuro.length === 0) {
        console.log(`No se encontraron datos de trigo duro para el año ${año}`);
        continue;
      }
      
      // Mostrar información de cada producto de trigo duro
      productosTrigoDuro.forEach((producto, index) => {
        console.log(`\n--- PRODUCTO #${index + 1}: ${producto.producto} (${producto.sector}) ---`);
        console.log(`Especificación: "${producto.especificacion}"`);
        console.log(`\nDATOS RAW (sin ordenar ni procesar):`);
        
        // Mostrar datos raw
        producto.precios.forEach(p => {
          // Mostrar fecha original sin formatear
          const fechaStr = p.fecha instanceof Date && !isNaN(p.fecha.getTime()) 
            ? p.fecha.toISOString() 
            : 'Fecha inválida';
            
          console.log(`- ${p.semana}: ${fechaStr} (${p.valor !== null ? p.valor : 'null'})`);
        });
        
        console.log(`\nTotal de entradas: ${producto.precios.length}`);
        
        // Verificar fechas duplicadas manualmente
        const fechasMap = new Map<string, number>();
        const fechasDuplicadas = [];
        
        for (const p of producto.precios) {
          if (p.fecha instanceof Date && !isNaN(p.fecha.getTime())) {
            const fechaKey = p.fecha.toISOString().split('T')[0];
            fechasMap.set(fechaKey, (fechasMap.get(fechaKey) || 0) + 1);
            
            if (fechasMap.get(fechaKey) === 2) {
              fechasDuplicadas.push(fechaKey);
            }
          }
        }
        
        if (fechasDuplicadas.length > 0) {
          console.log(`\n⚠️ FECHAS DUPLICADAS ENCONTRADAS: ${fechasDuplicadas.length}`);
          fechasDuplicadas.forEach(fecha => {
            console.log(`  - ${fecha}`);
          });
        } else {
          console.log(`\n✅ No se encontraron fechas duplicadas`);
        }
      });
      
    }
    
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main(); 
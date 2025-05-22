import { ExcelParser } from './parser/ExcelParser';
import * as path from 'path';
import * as fs from 'fs';

function main() {
  try {
    // Años a analizar
    const años = [2023, 2024, 2025];
    
    for (const año of años) {
      const filePath = path.join(__dirname, '..', 'descargas', `precios_medios_${año}.xlsx`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`Archivo para el año ${año} no encontrado: ${filePath}`);
        continue;
      }
      
      console.log(`\n\n========== PRUEBA DE PARSEO DE FECHAS - AÑO ${año} ==========\n`);
      
      // Leer el archivo Excel
      const workbook = require('xlsx').readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData: any[][] = require('xlsx').utils.sheet_to_json(worksheet, { header: 1 });
      
      // Encontrar filas de encabezados
      let headerWeekRow = -1;
      let headerDateRow = -1;
      
      // Buscar filas de encabezado con semanas
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        
        // Buscar fila con "Semana"
        if (row.some(cell => typeof cell === 'string' && cell.includes('Semana'))) {
          headerWeekRow = i;
          headerDateRow = i + 1; // La fila de fechas suele estar justo debajo
          break;
        }
      }
      
      if (headerWeekRow === -1 || headerDateRow === -1) {
        console.log(`No se encontraron las filas de encabezado para el año ${año}`);
        continue;
      }
      
      // Extraer las semanas y fechas
      const semanas = rawData[headerWeekRow].slice(3);
      const fechasExcel = rawData[headerDateRow].slice(3);
      
      console.log("PRUEBAS DE PARSEO DE FECHAS:\n");
      
      // Probar el parseo de cada fecha
      for (let i = 0; i < Math.min(fechasExcel.length, semanas.length); i++) {
        const semana = semanas[i];
        const fechaExcel = fechasExcel[i];
        
        if (!fechaExcel) continue;
        
        console.log(`\n${semana} | Texto original: "${fechaExcel}"`);
        
        try {
          // Intentar parsear con el método de la clase ExcelParser
          const fechaParseada = ExcelParser.parseDateString(fechaExcel.toString(), año);
          
          if (fechaParseada instanceof Date && !isNaN(fechaParseada.getTime())) {
            console.log(`✅ Fecha parseada: ${fechaParseada.toISOString()} (${fechaParseada.toLocaleDateString()})`);
          } else {
            console.log(`❌ Error al parsear fecha: ${fechaExcel}`);
          }
        } catch (error) {
          console.log(`❌ Error en el parseo: ${(error as Error).message}`);
        }
      }
      
      console.log("\nANÁLISIS DE CASOS ESPECIALES PARA 2023:\n");
      
      if (año === 2023) {
        // Casos problemáticos específicos de 2023
        const casosEspeciales = [
          {semana: "Semana 31", fecha: "31/07-06/08"},
          {semana: "Semana 32", fecha: "07-13/08"},
          {semana: "Semana 33", fecha: "14-20/08"},
          {semana: "Semana 34", fecha: "22-27/08"}, 
          {semana: "Semana 40", fecha: "02-08/10"},
          {semana: "Semana 45", fecha: "06-12/11"},
          {semana: "Semana 47", fecha: "20/11-26/11"},
          {semana: "Semana 48", fecha: "27/11-03/12"},
          {semana: "Semana 49", fecha: "04/12-10/12"}
        ];
        
        for (const caso of casosEspeciales) {
          console.log(`\n${caso.semana} | Texto original: "${caso.fecha}"`);
          
          try {
            const fechaParseada = ExcelParser.parseDateString(caso.fecha, año);
            
            if (fechaParseada instanceof Date && !isNaN(fechaParseada.getTime())) {
              console.log(`✅ Fecha parseada: ${fechaParseada.toISOString()} (${fechaParseada.toLocaleDateString()})`);
            } else {
              console.log(`❌ Error al parsear fecha: ${caso.fecha}`);
            }
          } catch (error) {
            console.log(`❌ Error en el parseo: ${(error as Error).message}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main(); 
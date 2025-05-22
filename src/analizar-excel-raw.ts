import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function main() {
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
      
      console.log(`\n\n========== EXCEL RAW DEL TRIGO DURO - AÑO ${año} ==========\n`);
      
      // Leer el archivo Excel
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Encontrar la fila de encabezados con las semanas
      let headerWeekRow = -1;
      let headerDateRow = -1;
      let dataStartRow = -1;
      
      // Buscar filas de encabezado
      for (let i = 0; i < Math.min(50, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        
        // Buscar fila de semanas
        if (row.some(cell => typeof cell === 'string' && cell.includes('Semana'))) {
          headerWeekRow = i;
        }
        
        // Buscar fila de fechas (suele estar justo debajo de la fila de semanas)
        if (headerWeekRow !== -1 && i === headerWeekRow + 1) {
          headerDateRow = i;
        }
        
        // Buscar fila donde empiezan los datos
        if (headerDateRow !== -1 && i > headerDateRow) {
          // Normalmente hay una fila vacía y luego empieza el primer sector
          if (row.length > 0 && row[0]) {
            dataStartRow = i;
            break;
          }
        }
      }
      
      if (headerWeekRow === -1 || headerDateRow === -1 || dataStartRow === -1) {
        console.log(`No se pudieron identificar las filas de encabezado en el archivo ${año}`);
        continue;
      }
      
      console.log(`Fila de semanas: ${headerWeekRow + 1}`);
      console.log(`Fila de fechas: ${headerDateRow + 1}`);
      console.log(`Fila de inicio de datos: ${dataStartRow + 1}`);
      
      // Extraer las semanas
      const semanas = rawData[headerWeekRow].slice(3).map(s => s?.toString() || '');
      console.log(`\nSemanas encontradas: ${semanas.length}`);
      
      // Extraer las fechas
      const fechasExcel = rawData[headerDateRow].slice(3).map(f => f);
      
      console.log(`\nFechas originales del Excel:`);
      for (let i = 0; i < Math.min(fechasExcel.length, semanas.length); i++) {
        let fechaInfo = fechasExcel[i];
        let tipoFecha = typeof fechaInfo;
        
        // Intentar interpretar fechas en formato Excel
        let fechaFormateada = '';
        if (typeof fechaInfo === 'number') {
          try {
            const excelDate = XLSX.SSF.parse_date_code(fechaInfo);
            if (excelDate && excelDate.d && excelDate.m) {
              fechaFormateada = `${excelDate.d.toString().padStart(2, '0')}/${excelDate.m.toString().padStart(2, '0')}/${excelDate.y || año}`;
            }
          } catch (e) {
            fechaFormateada = 'Error al parsear fecha';
          }
        } else if (fechaInfo) {
          fechaFormateada = fechaInfo.toString();
        }
        
        console.log(`- ${semanas[i] || 'Sin semana'}: ${fechaInfo} (${tipoFecha}) => ${fechaFormateada}`);
      }
      
      // Buscar trigo duro en los datos
      let encontradoTrigoDuro = false;
      for (let i = dataStartRow; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 3) continue;
        
        // Buscar producto de trigo duro (normalmente en la columna C)
        if (row[2] && typeof row[2] === 'string' && 
            row[2].toLowerCase().includes('trigo duro')) {
          
          encontradoTrigoDuro = true;
          console.log(`\nEncontrado Trigo Duro en fila ${i + 1}:`);
          console.log(`Producto: ${row[2]}`);
          console.log(`Especificación: ${row[1] || ''}`);
          
          console.log(`\nPrecios por semana (datos raw):`);
          
          // Mostrar los valores de precio para cada semana
          for (let j = 0; j < Math.min(fechasExcel.length, semanas.length); j++) {
            const valor = row[j + 3];
            console.log(`- ${semanas[j] || 'Sin semana'}: ${valor !== undefined ? valor : 'sin dato'}`);
          }
          
          // Solo analizar el primer trigo duro encontrado
          break;
        }
      }
      
      if (!encontradoTrigoDuro) {
        console.log(`No se encontró trigo duro en el archivo ${año}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main(); 
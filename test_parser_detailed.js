// Script de prueba detallado para entender la estructura del archivo Excel
const XLSX = require('xlsx');
const path = require('path');

// Path del archivo a parsear
const filePath = path.join(__dirname, 'descargas', 'precios_medios_2023.xlsx');

try {
  console.log(`Analizando archivo: ${filePath}`);
  
  // Leer el archivo Excel
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Convertir a JSON con encabezados
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Ver las primeras filas para entender la estructura
  console.log('\n=== ESTRUCTURA DEL ARCHIVO ===');
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    console.log(`Fila ${i}: ${JSON.stringify(rawData[i])}`);
  }
  
  // Examinar específicamente las filas que deberían contener las fechas
  console.log('\n=== FILAS DE FECHAS ===');
  for (let i = 5; i < 8; i++) {
    console.log(`Fila ${i}: ${JSON.stringify(rawData[i])}`);
  }
  
  // Examinar las celdas de fechas más detalladamente
  console.log('\n=== ANÁLISIS DETALLADO DE FECHAS ===');
  const dateRow = rawData[7]; // Suponemos que las fechas están en la fila 7
  
  if (dateRow && dateRow.length > 3) {
    for (let i = 3; i < Math.min(11, dateRow.length); i++) {
      const cell = dateRow[i];
      console.log(`Celda ${i}:`);
      console.log(`  - Valor: ${cell}`);
      console.log(`  - Tipo: ${typeof cell}`);
      
      // Si es un número, podría ser una fecha en formato Excel
      if (typeof cell === 'number') {
        try {
          const excelDate = XLSX.SSF.parse_date_code(cell);
          console.log(`  - Excel Date: ${JSON.stringify(excelDate)}`);
          const jsDate = new Date((excelDate.y || 2023), excelDate.m - 1, excelDate.d);
          console.log(`  - JS Date: ${jsDate.toISOString()}`);
        } catch (e) {
          console.log(`  - Error al parsear como fecha Excel: ${e.message}`);
        }
      }
      
      // Si es una cadena, intentar parsear
      if (typeof cell === 'string') {
        if (cell.includes('-')) {
          console.log(`  - Formato posible: rango (inicio-fin)`);
          const [inicio, fin] = cell.split('-').map(s => s.trim());
          console.log(`  - Inicio: ${inicio}, Fin: ${fin}`);
        } else if (cell.includes('/')) {
          console.log(`  - Formato posible: fecha (dd/mm)`);
          const [dia, mes] = cell.split('/').map(Number);
          console.log(`  - Día: ${dia}, Mes: ${mes}`);
        }
      }
    }
  } else {
    console.log('No se encontraron datos de fechas en la fila 7');
    // Buscar en otras filas
    for (let i = 4; i < 10; i++) {
      if (rawData[i] && rawData[i].length > 3) {
        console.log(`Posible fila de fechas ${i}: ${JSON.stringify(rawData[i].slice(3, 11))}`);
      }
    }
  }
  
} catch (error) {
  console.error('Error al analizar el archivo:', error);
} 
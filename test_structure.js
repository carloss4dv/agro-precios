// Script para analizar detalladamente la estructura del archivo Excel
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Función principal
async function analizarArchivo() {
  try {
    // Obtener archivo Excel más reciente en la carpeta de descargas
    const descargasDir = path.join(__dirname, 'descargas');
    if (!fs.existsSync(descargasDir)) {
      fs.mkdirSync(descargasDir, { recursive: true });
      console.error("Primero necesitas descargar un archivo Excel. Usa test_descarga_y_parseo.js primero.");
      return;
    }
    
    const archivos = fs.readdirSync(descargasDir)
      .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'))
      .sort()
      .reverse(); // Obtener el más reciente primero
    
    if (archivos.length === 0) {
      console.error("No hay archivos Excel en la carpeta de descargas.");
      return;
    }
    
    const filePath = path.join(descargasDir, archivos[0]);
    console.log(`Analizando archivo: ${filePath}`);
    
    // Leer el archivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a formato de matriz para análisis
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`\n=== INFORMACIÓN GENERAL ===`);
    console.log(`Nombre de la hoja: ${sheetName}`);
    console.log(`Filas: ${data.length}`);
    console.log(`Columnas máximas: ${Math.max(...data.map(row => row ? row.length : 0))}`);
    
    // Analizar las primeras filas (metadatos)
    console.log(`\n=== PRIMERAS FILAS (METADATOS) ===`);
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] || [];
      console.log(`Fila ${i}: ${JSON.stringify(row)}`);
      
      // Buscar año
      const rowText = row.join(' ');
      const yearMatch = rowText.match(/20\d{2}/);
      if (yearMatch) {
        console.log(`  ¡Año encontrado!: ${yearMatch[0]}`);
      }
    }
    
    // Detectar fila de encabezados
    console.log(`\n=== BÚSQUEDA DE FILA DE ENCABEZADOS ===`);
    let headerRowIndex = -1;
    for (let i = 3; i < Math.min(20, data.length); i++) {
      const row = data[i] || [];
      
      // Verificar si tiene fechas o semanas
      const hasDates = row.some(cell => {
        if (!cell) return false;
        const str = String(cell).trim();
        return (str.includes('/') || str.includes('-')) && /\d/.test(str);
      });
      
      const hasWeeks = row.some(cell => {
        if (!cell) return false;
        const str = String(cell).toLowerCase().trim();
        return str.includes('semana') || str.includes('precio') || str.includes('fecha');
      });
      
      if (hasDates || hasWeeks) {
        console.log(`Posible fila de encabezados en índice ${i}:`);
        console.log(`  ${JSON.stringify(row)}`);
        console.log(`  Tiene fechas: ${hasDates}`);
        console.log(`  Tiene semanas/precios: ${hasWeeks}`);
        
        if (headerRowIndex === -1) {
          headerRowIndex = i;
        }
      }
    }
    
    if (headerRowIndex !== -1) {
      console.log(`\n¡Fila de encabezados encontrada en índice ${headerRowIndex}!`);
      
      // Analizar columnas de fechas
      const dateRow = data[headerRowIndex] || [];
      console.log(`\n=== ANÁLISIS DE COLUMNAS DE FECHAS ===`);
      for (let i = 3; i < dateRow.length; i++) {
        const cell = dateRow[i];
        if (!cell) continue;
        
        console.log(`Columna ${i}:`);
        console.log(`  Valor: ${cell}`);
        console.log(`  Tipo: ${typeof cell}`);
        
        // Intentar parsear como número Excel
        if (typeof cell === 'number') {
          try {
            const excelDate = XLSX.SSF.parse_date_code(cell);
            console.log(`  Fecha Excel: ${JSON.stringify(excelDate)}`);
          } catch (e) {
            console.log(`  Error al parsear fecha Excel: ${e.message}`);
          }
        }
        
        // Analizar diferentes formatos de texto
        if (typeof cell === 'string') {
          if (cell.includes('/')) {
            console.log(`  Formato tipo: DD/MM`);
          } else if (cell.includes('-')) {
            console.log(`  Formato tipo: con guión`);
          } 
          
          // Detectar nombres de meses
          const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
          
          for (const mes of meses) {
            if (cell.toLowerCase().includes(mes)) {
              console.log(`  Contiene mes: ${mes}`);
            }
          }
        }
      }
      
      // Buscar sectores
      console.log(`\n=== BÚSQUEDA DE SECTORES ===`);
      let sectorCount = 0;
      
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i] || [];
        if (!row.length) continue;
        
        // Buscar en primera columna
        if (row[0] && typeof row[0] === 'string') {
          const text = row[0].toString().trim();
          
          // Criterios para detectar sectores
          if (text === text.toUpperCase() && 
              text.length > 3 && 
              !/\d/.test(text) &&
              !['(', '*', '-'].includes(text.charAt(0))) {
            
            console.log(`Posible sector en fila ${i}: "${text}"`);
            sectorCount++;
            
            // Mostrar filas siguientes para verificar estructura
            console.log(`  Siguientes filas:`);
            for (let j = 1; j <= 3; j++) {
              if (i + j < data.length) {
                console.log(`    ${JSON.stringify((data[i + j] || []).slice(0, 5))}...`);
              }
            }
          }
        }
      }
      
      console.log(`\nTotal de posibles sectores encontrados: ${sectorCount}`);
      
      // Buscar productos
      console.log(`\n=== EJEMPLOS DE FILAS DE PRODUCTOS ===`);
      let productCount = 0;
      
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i] || [];
        if (!row.length) continue;
        
        // Verificar si parece un producto
        let isProduct = false;
        let productCol = -1;
        
        // Buscar en columnas 0-2 algún texto que no esté todo en mayúsculas
        for (let j = 0; j <= 2; j++) {
          if (row[j] && typeof row[j] === 'string') {
            const text = row[j].toString().trim();
            
            if (text.length > 2 && text !== text.toUpperCase()) {
              isProduct = true;
              productCol = j;
              break;
            }
          }
        }
        
        // Verificar si tiene algún valor numérico en columnas de precios (3+)
        const hasValues = row.some((cell, idx) => {
          if (idx < 3) return false;
          if (typeof cell === 'number') return true;
          if (typeof cell === 'string') {
            // Intentar parsear como número
            return !isNaN(parseFloat(cell.replace(',', '.')));
          }
          return false;
        });
        
        if (isProduct && hasValues && productCount < 10) {
          productCount++;
          console.log(`Producto en fila ${i}:`);
          console.log(`  Columna del producto: ${productCol}`);
          console.log(`  Nombre: ${row[productCol]}`);
          
          // Mostrar primeros valores
          console.log(`  Valores:`);
          for (let j = 3; j < Math.min(8, row.length); j++) {
            console.log(`    Col ${j}: ${row[j]}`);
          }
        }
        
        if (productCount >= 10) break;
      }
      
    } else {
      console.log("No se pudo encontrar una fila de encabezados.");
    }
    
  } catch (error) {
    console.error("Error al analizar el archivo:", error);
  }
}

// Ejecutar análisis
analizarArchivo(); 
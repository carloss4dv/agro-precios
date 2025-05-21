// Script para probar el parseo de fechas desde 2019 hasta 2025
const { ExcelParser } = require('./dist/parser/ExcelParser');
const XLSX = require('xlsx');

// Función para probar diferentes formatos de fechas en diferentes años
function probarFechas() {
  console.log('=== PRUEBA DE PARSEO DE FECHAS ===');
  
  // Formato específico para probar cambios de año
  const rangosConCambioAño = [
    "30/12 - 05/01",
    "31/12 - 06/01",
    "25/12 - 01/01",
    "28/12 - 03/01"
  ];
  
  console.log('== PRUEBA ESPECÍFICA: RANGOS CON CAMBIO DE AÑO ==');
  for (const rango of rangosConCambioAño) {
    for (let año = 2019; año <= 2023; año++) {
      const fecha = ExcelParser.parseDateString(rango, año);
      const esValida = !isNaN(fecha.getTime());
      
      console.log(`Rango: "${rango}" para año base ${año}`);
      if (esValida) {
        console.log(`  Resultado: ${fecha.toLocaleDateString('es-ES')}`);
        console.log(`  Día: ${fecha.getDate()}, Mes: ${fecha.getMonth() + 1}, Año: ${fecha.getFullYear()}`);
        // Comprobar si detectó correctamente el cambio de año
        if (fecha.getFullYear() === año + 1 && fecha.getMonth() === 0) {
          console.log(`  ✓ CORRECTO: Se detectó el cambio de año de ${año} a ${año + 1}`);
        } else {
          console.log(`  ✗ ERROR: No se detectó correctamente el cambio de año`);
        }
      } else {
        console.log(`  ✗ ERROR: Fecha inválida`);
      }
      console.log();
    }
  }
  
  // Formatos de fechas comunes en los archivos
  const formatos = [
    '10/01',                   // Formato DD/MM 
    '15/01 - 21/01',           // Formato con rango 
    '5 enero',                 // Formato con nombre del mes
    'enero 12',                // Formato con mes primero
    '12 ene',                  // Formato con abreviatura
    '29/02',                   // 29 de febrero (año bisiesto)
    '30/12/2020',              // Formato con año incluido
    '11-ENE',                  // Formato con guión 
    44562,                     // Número de fecha Excel (15/01/2022)
    44930,                     // Número de fecha Excel (15/01/2023)
    45296                      // Número de fecha Excel (15/01/2024)
  ];
  
  // Probar para cada año desde 2019 a 2025
  for (let year = 2019; year <= 2025; year++) {
    console.log(`\n== PRUEBAS PARA EL AÑO ${year} ==`);
    
    for (const formato of formatos) {
      try {
        // Usar el método de parseo de fechas interno
        const fecha = ExcelParser.parseDateString(formato, year);
        
        // Verificar si la fecha es válida
        const esValida = !isNaN(fecha.getTime());
        
        console.log(`Formato: ${formato}`);
        console.log(`  Fecha parseada: ${esValida ? fecha.toLocaleDateString('es-ES') : 'INVÁLIDA'}`);
        if (esValida) {
          console.log(`  Día: ${fecha.getDate()}, Mes: ${fecha.getMonth() + 1}, Año: ${fecha.getFullYear()}`);
        }
      } catch (error) {
        console.error(`Error al parsear '${formato}' para el año ${year}:`, error);
      }
    }
  }
  
  // Prueba adicional: verificar fechas con números Excel
  console.log('\n== PRUEBA DE NÚMEROS EXCEL PARA CADA AÑO ==');
  for (let year = 2019; year <= 2025; year++) {
    try {
      // Encontrar un número Excel para el 15 de enero de cada año
      const fecha = new Date(year, 0, 15); // 15 de enero
      
      // Convertir a número Excel (días desde 1/1/1900)
      const excelSerialDate = ExcelParser.dateToExcelSerial(fecha);
      
      console.log(`Año: ${year}`);
      console.log(`  Fecha: ${fecha.toLocaleDateString('es-ES')}`);
      console.log(`  Número Excel: ${excelSerialDate}`);
      
      // Verificar que se pueda volver a convertir correctamente
      const fechaParseada = ExcelParser.parseDateString(excelSerialDate, year);
      console.log(`  Fecha reconvertida: ${fechaParseada.toLocaleDateString('es-ES')}`);
      console.log(`  Coincide: ${fecha.getDate() === fechaParseada.getDate() && 
                                fecha.getMonth() === fechaParseada.getMonth() &&
                                fecha.getFullYear() === fechaParseada.getFullYear()}`);
    } catch (error) {
      console.error(`Error al probar conversión Excel para el año ${year}:`, error);
    }
  }
}

// Ejecutar las pruebas
probarFechas(); 
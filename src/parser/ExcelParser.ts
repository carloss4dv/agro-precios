import * as XLSX from 'xlsx';
import { Precio, FiltroFecha} from './types';

export class ExcelParser {
  static parse(filePath: string, filtro?: FiltroFecha): Precio[] {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    return this.processData(rawData, filtro);
  }

  private static processData(rows: any[][], filtro?: FiltroFecha): Precio[] {
    const precios: Precio[] = [];
    const weekDates = this.extractWeekDates(rows);
    let currentSector = '';

    // Primero, identificar los sectores y sus rangos
    const sectores: { [nombre: string]: { inicio: number, fin: number }} = {};
    
    // Buscar las celdas de sectores (están en la columna A y suelen estar en mayúsculas)
    for (let i = 8; i < rows.length; i++) {
      const row = rows[i];
      // Celdas de sector son mayúsculas, centradas y suelen tener un color de fondo
      if (row && row[0] && typeof row[0] === 'string' && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(row[0].toString().trim())) {
        const sectorName = row[0].toString().trim();
        if (!sectores[sectorName]) {
          sectores[sectorName] = { inicio: i, fin: i };
        } else {
          sectores[sectorName].fin = i;
        }
      }
    }

    // Determinamos el rango de cada sector
    let sectorActual = '';
    let ultimoSectorInicio = 0;
    
    Object.entries(sectores).forEach(([sector, rango], idx, array) => {
      // Si no es el último sector, su fin es el inicio del siguiente
      if (idx < array.length - 1) {
        rango.fin = array[idx + 1][1].inicio;
      } else {
        // Si es el último, su fin es el final del archivo
        rango.fin = rows.length;
      }
    });

    // Procesamos los datos ahora con los sectores correctamente identificados
    for (let i = 8; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.length) continue;
      
      // Determinar a qué sector pertenece esta fila
      for (const [sector, rango] of Object.entries(sectores)) {
        if (i >= rango.inicio && i < rango.fin) {
          currentSector = sector;
          break;
        }
      }

      // Procesar filas de productos - ahora sabemos el sector correcto
      if (currentSector && row[2]) {
        const preciosSemanales = weekDates.map((fecha, index) => ({
          semana: `Semana ${String(index + 1).padStart(2, '0')}`,
          fecha,
          valor: this.parseValue(row[3 + index])
        }));

        const preciosFiltrados = filtro 
          ? preciosSemanales.filter(p => 
              p.fecha && !isNaN(p.fecha.getTime()) &&
              p.fecha.getDate() === filtro.dia &&
              p.fecha.getMonth() + 1 === filtro.mes &&
              p.fecha.getFullYear() === filtro.año
            )
          : preciosSemanales;

        if (!filtro || preciosFiltrados.length > 0) {
          precios.push({
            sector: currentSector,
            producto: row[2].toString().trim(),
            especificacion: row[1]?.toString() || '',
            precios: preciosFiltrados
          });
        }
      }
    }
    
    return precios;
  }

  private static extractWeekDates(rows: any[][]): Date[] {
    // Encontrar la fila que contiene las fechas de las semanas
    let dateRowIndex = -1;
    for (let i = 6; i < 9; i++) {
      if (rows[i] && rows[i].length > 3) {
        const thirdCol = rows[i][3];
        if (thirdCol && typeof thirdCol === 'string' && 
            (thirdCol.includes('/') || thirdCol.includes('-'))) {
          dateRowIndex = i;
          break;
        }
      }
    }
    
    if (dateRowIndex === -1) {
      throw new Error('Formato de archivo inválido: No se encontró la fila de fechas');
    }
    
    const dateRow = rows[dateRowIndex];
    
    // Extraer el año del encabezado
    let year = this.extractYearFromRows(rows);
    
    return dateRow.slice(3, dateRow.length).map(dateRange => {
      try {
        if (!dateRange) return new Date(NaN);
        
        return this.parseDateRange(dateRange.toString(), year);
      } catch (e) {
        console.error("Error extrayendo fecha:", e);
        return new Date(NaN);
      }
    });
  }
  
  private static extractYearFromRows(rows: any[][]): number {
    // Buscar el año en las primeras filas
    for (let i = 0; i < 5; i++) {
      if (rows[i] && rows[i].length > 0) {
        // Buscar un número de 4 dígitos que represente un año
        const rowText = JSON.stringify(rows[i]);
        const yearMatch = rowText.match(/20\d{2}/);
        if (yearMatch) {
          return parseInt(yearMatch[0], 10);
        }
      }
    }
    return new Date().getFullYear(); // Default a año actual
  }

  private static parseDateRange(dateStr: string, year: number): Date {
    try {
      dateStr = dateStr.toString().trim();
      
      // Manejar diferentes formatos de fecha
      let endDatePart = '';
      
      // Caso 1: "DD-DD/MM" (ej: "02-08/01")
      if (dateStr.includes('-') && dateStr.includes('/') && dateStr.indexOf('-') < dateStr.indexOf('/')) {
        const parts = dateStr.split('-');
        endDatePart = parts[parts.length - 1];
      } 
      // Caso 2: "DD/MM-DD/MM" (ej: "30/01-05/02")
      else if (dateStr.includes('-') && dateStr.includes('/') && dateStr.indexOf('-') > dateStr.indexOf('/')) {
        const parts = dateStr.split('-');
        endDatePart = parts[parts.length - 1];
      }
      // Caso 3: "DD/MM" (ej: "08/01")
      else if (dateStr.includes('/') && !dateStr.includes('-')) {
        endDatePart = dateStr;
      }
      // Caso 4: Número Excel (ej: 40392)
      else if (!isNaN(Number(dateStr))) {
        try {
          const excelDate = XLSX.SSF.parse_date_code(Number(dateStr));
          if (excelDate && excelDate.d && excelDate.m) {
            return new Date(excelDate.y || year, excelDate.m - 1, excelDate.d);
          }
        } catch {
          return new Date(NaN);
        }
      }
      // Caso 5: Otro formato no soportado
      else {
        return new Date(NaN);
      }
      
      // Extraer día y mes del final del rango
      const dateMatch = endDatePart.match(/(\d{1,2})\/(\d{1,2})/);
      if (dateMatch) {
        const [_, day, month] = dateMatch;
        return new Date(year, parseInt(month, 10) - 1, parseInt(day, 10));
      }
      
      return new Date(NaN);
    } catch (e) {
      console.error("Error al parsear fecha:", e, dateStr);
      return new Date(NaN);
    }
  }

  private static parseValue(value: any): number | null {
    if (value === '-' || value === undefined || value === null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Reemplaza la coma por punto para el formato europeo
      return parseFloat(value.replace(',', '.'));
    }
    return null;
  }
}

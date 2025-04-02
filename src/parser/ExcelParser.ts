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

    // Empezar desde la fila 9 (índice 8) donde están los datos reales
    for (let i = 8; i < rows.length; i++) {
      const row = rows[i];
      
      // Detectar nuevos sectores (filas con texto en mayúsculas)
      if (row[0] && /^[A-Z]+$/.test(row[0].toString())) {
        currentSector = row[0].toString();
        continue;
      }

      // Procesar filas de productos
      if (currentSector && row[2]) {
        const preciosSemanales = weekDates.map((fecha, index) => ({
          semana: `Semana ${String(index + 1).padStart(2, '0')}`,
          fecha,
          valor: this.parseValue(row[3 + index])
        }));

        const preciosFiltrados = filtro 
          ? preciosSemanales.filter(p => 
              p.fecha.getDate() === filtro.dia &&
              p.fecha.getMonth() + 1 === filtro.mes &&
              p.fecha.getFullYear() === filtro.año
            )
          : preciosSemanales;

        if (preciosFiltrados.length > 0) {
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
    // Las fechas están en la fila 8 (índice 7), columnas D-K
    const dateRow = rows[7];
    
    if (!dateRow || dateRow.length < 11) {
      throw new Error('Formato de archivo inválido: No se encontró la fila de fechas');
    }

    return dateRow.slice(3, 11).map(dateRange => {
      const [_, endDate] = (dateRange as string).split(' - ');
      return this.parseDate(endDate);
    });
  }

  private static parseDate(dateStr: string): Date {
      // Validar existencia y formato
      if (!dateStr || !dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
          return new Date(NaN); // Fecha inválida
      }
      
      try {
          const [day, month, year] = dateStr.split('/').map(Number);
          // Validar rangos reales
          if (month < 1 || month > 12 || day < 1 || day > 31) {
              return new Date(NaN);
          }
          return new Date(year, month - 1, day);
      } catch {
          return new Date(NaN);
      }
  }

  private static parseValue(value: any): number | null {
    if (value === '-' || value === undefined || value === null) return null;
    if (typeof value === 'number') return value;
    return parseFloat(value.toString().replace(',', '.'));
  }
}

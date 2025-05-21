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
    // Inicializar arreglo de precios
    const precios: Precio[] = [];
    
    // 1. Detectar estructura del archivo
    const year = this.extractYearFromRows(rows);
    
    // 2. Identificar filas de encabezados (semanas y fechas)
    const headerRowsData = this.findHeaderRows(rows);
    if (!headerRowsData) {
      console.error("No se pudieron detectar las filas de encabezados");
      return [];
    }
    
    const { 
      headerWeekRow,     // Fila con semanas (Semana 01, Semana 02, etc.)
      headerDateRow,     // Fila con fechas (DD/MM-DD/MM)
      dataStartRow       // Fila donde empiezan los datos de productos
    } = headerRowsData;
    
    // 3. Extraer las fechas de las semanas
    const weekDates = this.extractWeekDates(rows[headerDateRow], year);
    
    // 4. Identificar los sectores en el archivo
    const sectoresInfo = this.identificarSectores(rows, dataStartRow);
    
    // 5. Procesar las filas de datos producto por producto
    let currentSector = '';
    
    for (let i = dataStartRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      // Verificar si es un sector
      const sector = this.detectarSector(row);
      if (sector) {
        currentSector = sector;
        continue; // Es un encabezado de sector, no un producto
      }
      
      // Si tenemos un sector y parece una fila de producto
      if (currentSector && this.isProductRow(row)) {
        // Encontrar la columna donde está el nombre del producto (generalmente columna 2 o C)
        const productoInfo = this.encontrarProductoYEspecificacion(row);
        if (productoInfo) {
          const { producto, especificacion } = productoInfo;
          
          // Corregir el sector basado en el producto
          const sectorCorregido = this.corregirSectorProducto(currentSector, producto, especificacion);
          
          // Extraer los precios semanales
          const preciosSemanales = [];
          
          // Los precios comienzan en columna 3 (índice D)
          for (let j = 0; j < weekDates.length; j++) {
            let valor = null;
            // Asegurar que no nos pasamos del final de la fila
            if (j + 3 < row.length) {
              valor = this.parseValue(row[j + 3]);
            }
            
            // Solo agregar entradas con valores no nulos
            if (valor !== null) {
              preciosSemanales.push({
                semana: `Semana ${String(j + 1).padStart(2, '0')}`,
                fecha: weekDates[j],
                valor: valor
              });
            }
          }
          
          // Filtrar por fecha si es necesario
          const preciosFiltrados = filtro
            ? preciosSemanales.filter(p => this.matchesFilter(p.fecha, filtro))
            : preciosSemanales;
          
          // Sólo agregar si hay precios después del filtrado o no hay filtro
          if (!filtro || preciosFiltrados.length > 0) {
            precios.push({
              sector: sectorCorregido,
              producto,
              especificacion,
              precios: preciosFiltrados
            });
          }
        }
      }
    }
    
    return precios;
  }
  
  // Detectar sector en una fila, considerando que puede ocupar varias columnas
  private static detectarSector(row: any[]): string | null {
    // Si la celda A está vacía, verificar si hay celdas de colores de fondo o celdas combinadas
    // que podrían indicar un sector (esto no podemos detectarlo desde el parser básico)
    if (row[0] && typeof row[0] === 'string') {
      const text = row[0].toString().trim();
      
      // Criterios para identificar un sector:
      // - Todo en mayúsculas
      // - No tiene números (excepto si están en paréntesis al final)
      // - Longitud mínima
      // - No comienza con caracteres especiales
      const esSectorPorTexto = text === text.toUpperCase() && 
          text.length > 3 && 
          (!/\d/.test(text.replace(/\(\d+\)$/, '').trim())) &&  // Permitir números solo en paréntesis al final
          !['(', '*', '-'].includes(text.charAt(0));
          
      if (esSectorPorTexto) {
        // Verificar si hay más texto en la segunda columna (para sectores multicolumna)
        if (row[1] && typeof row[1] === 'string' && row[1].toString().trim() === row[1].toString().trim().toUpperCase()) {
          // Combinar las columnas para formar el nombre completo del sector
          let sectorCompleto = text;
          let col = 1;
          
          // Añadir columnas adicionales si están en mayúsculas y parecen parte del sector
          while (col < row.length && 
                 row[col] && 
                 typeof row[col] === 'string' && 
                 row[col].toString().trim() === row[col].toString().trim().toUpperCase() &&
                 row[col].toString().trim().length > 0) {
            sectorCompleto += ' ' + row[col].toString().trim();
            col++;
          }
          
          // Limpiar código entre paréntesis al final
          return this.limpiarNombreSector(sectorCompleto);
        }
        
        // Limpiar código entre paréntesis al final
        return this.limpiarNombreSector(text);
      }
      
      // Detectar sectores que solo tienen un título en mayúsculas
      // Ej: "ARROZ" en la imagen mostrada
      if (text === text.toUpperCase() && 
          text.length > 3 && 
          !/[0-9()]/.test(text) &&
          !/^[()\[\]{}*-]/.test(text)) {
        return text;
      }
    }
    
    // También buscar sectores basados en el color de fondo (si la información está disponible)
    // Esto sería más complejo y requeriría acceso a las propiedades de estilo
    
    return null;
  }
  
  // Función para eliminar códigos entre paréntesis al final del nombre de un sector
  private static limpiarNombreSector(sector: string): string {
    // Eliminar patrón (n) al final del string, donde n es un número
    return sector.replace(/\s*\(\d+\)$/, '').trim();
  }
  
  // Identificar todos los sectores en el archivo
  private static identificarSectores(rows: any[][], startRow: number): { [sector: string]: number[] } {
    const sectores: { [sector: string]: number[] } = {};
    
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const sector = this.detectarSector(row);
      if (sector) {
        if (!sectores[sector]) {
          sectores[sector] = [];
        }
        sectores[sector].push(i);
      }
    }
    
    return sectores;
  }
  
  // Encontrar el nombre del producto y la especificación
  private static encontrarProductoYEspecificacion(row: any[]): { producto: string, especificacion: string } | null {
    // Por defecto, la columna 2 (índice C) suele contener el nombre del producto
    if (row[2] && typeof row[2] === 'string' && row[2].toString().trim().length > 0) {
      // La especificación normalmente está en la columna 1 (índice B)
      const especificacion = row[1] ? row[1].toString().trim() : '';
      const producto = row[2].toString().trim();
      
      // Corregir errores ortográficos en productos
      const productoCorregido = producto.replace(/\bAceie\b/gi, 'Aceite');
      
      return {
        producto: productoCorregido,
        especificacion
      };
    }
    
    // Si no hay nada en columna 2, buscar en las columnas 0 y 1
    for (let i = 0; i <= 1; i++) {
      if (row[i] && typeof row[i] === 'string' && row[i].toString().trim().length > 0) {
        // Si encontramos un texto que parece ser un producto, usarlo
        const texto = row[i].toString().trim();
        // Corregir errores ortográficos en productos
        const textoCorregido = texto.replace(/\bAceie\b/gi, 'Aceite');
        
        if (textoCorregido !== textoCorregido.toUpperCase() && !/^\([0-9]+\)$/.test(textoCorregido)) {
          return {
            producto: textoCorregido,
            especificacion: ''
          };
        }
      }
    }
    
    return null;
  }
  
  // Verificar si una fecha coincide con el filtro
  private static matchesFilter(fecha: Date, filtro: FiltroFecha): boolean {
    if (!fecha || isNaN(fecha.getTime())) return false;
    
    return fecha.getDate() === filtro.dia &&
           fecha.getMonth() + 1 === filtro.mes &&
           fecha.getFullYear() === filtro.año;
  }
  
  // Detectar si una fila contiene un producto
  private static isProductRow(row: any[]): boolean {
    if (!row || row.length < 4) return false;
    
    // Un producto generalmente tiene valores numéricos en columnas de precios (>= 3)
    let hasNumericValues = false;
    for (let i = 3; i < row.length; i++) {
      const cell = row[i];
      if (cell !== undefined && cell !== null && cell !== '') {
        if (typeof cell === 'number') {
          hasNumericValues = true;
          break;
        }
        if (typeof cell === 'string') {
          const normalizedValue = cell.replace(',', '.');
          if (!isNaN(parseFloat(normalizedValue))) {
            hasNumericValues = true;
            break;
          }
        }
      }
    }
    
    // Verificar si tiene texto en alguna de las primeras columnas que podría ser un producto
    let hasProductText = false;
    
    // Primero verificar columna C (índice 2), que es la más común para productos
    if (row[2] && typeof row[2] === 'string' && row[2].toString().trim().length > 0) {
      const text = row[2].toString().trim();
      // No debería ser un encabezado, notas, etc.
      if (text !== text.toUpperCase() || /[a-z]/.test(text)) {
        hasProductText = true;
      }
    }
    
    // Si no encontramos en columna C, buscar en columnas A o B
    if (!hasProductText) {
      for (let i = 0; i <= 1; i++) {
        if (row[i] && typeof row[i] === 'string') {
          const text = row[i].toString().trim();
          // Debe tener texto y no ser solo un número o código entre paréntesis
          if (text.length > 0 && !/^\([0-9]+\)$/.test(text) && text !== text.toUpperCase()) {
            hasProductText = true;
            break;
          }
        }
      }
    }
    
    return hasProductText && hasNumericValues;
  }
  
  // Encontrar las filas de encabezados (semanas y fechas)
  private static findHeaderRows(rows: any[][]): { headerWeekRow: number, headerDateRow: number, dataStartRow: number } | null {
    // Buscar la fila que contiene "SEMANA" en alguna celda
    let headerWeekRow = -1;
    let headerDateRow = -1;
    
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;
      
      // Buscar texto "SEMANA" o "Semana" en la fila
      const hasWeeks = row.some(cell => 
        cell && typeof cell === 'string' && cell.toString().toLowerCase().includes('semana')
      );
      
      if (hasWeeks) {
        headerWeekRow = i;
        // La fila de fechas generalmente está justo después
        for (let j = i + 1; j < Math.min(i + 3, rows.length); j++) {
          const dateRow = rows[j];
          if (!dateRow || dateRow.length < 3) continue;
          
          // La fila de fechas contiene caracteres '/' o '-'
          const hasDates = dateRow.some(cell => 
            cell && typeof cell === 'string' && 
            (cell.toString().includes('/') || cell.toString().includes('-'))
          );
          
          if (hasDates) {
            headerDateRow = j;
            break;
          }
        }
        
        break;
      }
    }
    
    if (headerWeekRow !== -1 && headerDateRow !== -1) {
      // La fila donde comienzan los datos es la siguiente a la fila de fechas
      return {
        headerWeekRow,
        headerDateRow,
        dataStartRow: headerDateRow + 1
      };
    }
    
    return null;
  }
  
  // Extraer fechas de la fila de fechas
  private static extractWeekDates(dateRow: any[], year: number): Date[] {
    if (!dateRow) return [];
    
    // Las fechas generalmente comienzan en la columna 3 (índice D)
    const dates: Date[] = [];
    let lastValidDate: Date | null = null;
    
    for (let i = 3; i < dateRow.length; i++) {
      const cell = dateRow[i];
      
      try {
        // Intentar parsear la fecha
        const date = cell ? this.parseDateString(cell.toString(), year) : new Date(NaN);
        
        // Si es válida, usarla. Si no, usar la última fecha válida + 7 días
        if (date && !isNaN(date.getTime())) {
          dates.push(date);
          lastValidDate = new Date(date); // Crear una copia
        } else if (lastValidDate) {
          // Si tenemos una fecha válida previa, calcular la siguiente
          const nextDate: Date = new Date(lastValidDate);
          nextDate.setDate(nextDate.getDate() + 7); // Agregar 7 días
          dates.push(nextDate);
          lastValidDate = nextDate;
        } else {
          // No tenemos fechas válidas anteriores, usar una estimada basada en la posición
          // Primera semana de enero + (índice - 3) * 7 días
          const estimatedDate = new Date(year, 0, 1 + (i - 3) * 7);
          dates.push(estimatedDate);
          lastValidDate = estimatedDate;
        }
      } catch (e) {
        console.error(`Error al procesar fecha en columna ${i}: ${e}`);
        // En caso de error, mantener continuidad con la última fecha o estimación
        if (lastValidDate) {
          const nextDate: Date = new Date(lastValidDate);
          nextDate.setDate(nextDate.getDate() + 7);
          dates.push(nextDate);
          lastValidDate = nextDate;
        } else {
          const estimatedDate = new Date(year, 0, 1 + (i - 3) * 7);
          dates.push(estimatedDate);
          lastValidDate = estimatedDate;
        }
      }
    }
    
    return dates;
  }
  
  // Extraer el año del archivo
  private static extractYearFromRows(rows: any[][]): number {
    // Buscar el año en las primeras filas
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      if (!rows[i]) continue;
      
      // Combinar toda la fila en un string para buscar
      const rowText = rows[i].join(' ');
      const yearMatch = rowText.match(/20\d{2}/);
      
      if (yearMatch) {
        return parseInt(yearMatch[0], 10);
      }
    }
    
    // Si no se encuentra, usar el año actual
    return new Date().getFullYear();
  }
  
  // Parsear string de fecha en varios formatos
  static parseDateString(dateStr: string, year: number): Date {
    if (!dateStr) return new Date(NaN);
    
    // Para depuración
    const originalStr = dateStr.toString().trim();
    let debugInfo = false;
    
    // Casos especiales conocidos para asegurar corrección manual
    if (originalStr.includes('-') && originalStr.includes('/')) {
      const manualPattern1 = /(\d+)\/(\d+)\s*-\s*(\d+)\/(\d+)/;
      const match = originalStr.match(manualPattern1);
      
      if (match) {
        const startDay = parseInt(match[1], 10);
        const startMonth = parseInt(match[2], 10);
        const endDay = parseInt(match[3], 10);
        const endMonth = parseInt(match[4], 10);
        
        // Si es un cambio de año (diciembre a enero)
        if (startMonth === 12 && endMonth === 1) {
          return new Date(year + 1, 0, endDay);
        }
        
        // Rango normal sin cambio de año
        if (!isNaN(endDay) && !isNaN(endMonth) && 
            endMonth >= 1 && endMonth <= 12 && 
            endDay >= 1 && endDay <= 31) {
          return new Date(year, endMonth - 1, endDay);
        }
      }
    }
    
    dateStr = dateStr.toString().trim();
    
    // Si es un número que representa una fecha Excel, convertirlo
    if (typeof dateStr === 'number' || !isNaN(Number(dateStr))) {
      try {
        const excelDate = XLSX.SSF.parse_date_code(Number(dateStr));
        if (excelDate && excelDate.d && excelDate.m) {
          const y = excelDate.y || year;
          return new Date(y, excelDate.m - 1, excelDate.d);
        }
      } catch (e) {
        console.error(`Error al parsear fecha Excel ${dateStr}: ${e}`);
      }
    }
    
    // Formato con año incluido (ej: DD/MM/YYYY)
    if (dateStr.split('/').length === 3) {
      try {
        const [day, month, specificYear] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
        if (!isNaN(day) && !isNaN(month) && !isNaN(specificYear) && 
            month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          // Usar el año específico en lugar del año general
          return new Date(specificYear, month - 1, day);
        }
      } catch (e) {
        console.error(`Error al parsear fecha con año específico ${dateStr}: ${e}`);
      }
    }
    
    // Formato 1: "DD/MM - DD/MM" (ej: "30/01 - 05/02")
    // Identificar si es un rango de fechas separado por un guión
    if (dateStr.includes('-')) {
      try {
        const parts = dateStr.split('-');
        
        // Si tenemos exactamente dos partes separadas por guión
        if (parts.length === 2) {
          const startPart = parts[0].trim();
          const endPart = parts[1].trim();
          
          // Si ambas partes tienen formato de fecha con barra (DD/MM)
          if (startPart.includes('/') && endPart.includes('/')) {
            // Extraer día y mes de ambas partes
            const startComponents = startPart.split('/');
            const endComponents = endPart.split('/');
            
            if (startComponents.length >= 2 && endComponents.length >= 2) {
              const startDay = parseInt(startComponents[0], 10);
              const startMonth = parseInt(startComponents[1], 10);
              const endDay = parseInt(endComponents[0], 10);
              const endMonth = parseInt(endComponents[1], 10);
              
              // Verificar que los valores sean números válidos y dentro de rangos correctos
              if (!isNaN(startDay) && !isNaN(startMonth) && !isNaN(endDay) && !isNaN(endMonth) &&
                  startMonth >= 1 && startMonth <= 12 && endMonth >= 1 && endMonth <= 12 &&
                  startDay >= 1 && startDay <= 31 && endDay >= 1 && endDay <= 31) {
                
                // Caso especial: determinar cambio de año (diciembre -> enero)
                if (startMonth === 12 && endMonth === 1) {
                  // Usar año siguiente para la fecha final
                  return new Date(year + 1, 0, endDay);
                } else {
                  // Usar la fecha final del rango con el año actual
                  return new Date(year, endMonth - 1, endDay);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(`Error al parsear fecha con rango ${dateStr}: ${e}`);
      }
    }
    
    // Formato 2: "DD/MM" (ej: "05/02")
    if (dateStr.includes('/') && !dateStr.includes('-')) {
      try {
        const [day, month] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
        if (!isNaN(day) && !isNaN(month) && month >= 1 && month <= 12 && day >= 1) {
          // Validar días según el mes, teniendo en cuenta años bisiestos
          const diasPorMes = [31, (this.esBisiesto(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          if (day <= diasPorMes[month - 1]) {
            return new Date(year, month - 1, day);
          } else {
            // Si el día no es válido para el mes (como 29/02 en año no bisiesto)
            // usar el último día del mes
            return new Date(year, month - 1, diasPorMes[month - 1]);
          }
        }
      } catch (e) {
        console.error(`Error al parsear fecha simple ${dateStr}: ${e}`);
      }
    }
    
    // Formato con guión: DD-MMM (ej: "15-ENE")
    if (dateStr.includes('-') && !dateStr.includes('/')) {
      try {
        const parts = dateStr.split('-');
        if (parts.length === 2) {
          const day = parseInt(parts[0].trim(), 10);
          const monthText = parts[1].trim().toLowerCase();
          
          const meses = {
            'ene': 0, 'enero': 0, 'jan': 0, 'january': 0,
            'feb': 1, 'febrero': 1, 'february': 1,
            'mar': 2, 'marzo': 2, 'march': 2,
            'abr': 3, 'abril': 3, 'apr': 3, 'april': 3,
            'may': 4, 'mayo': 4,
            'jun': 5, 'junio': 5, 'june': 5,
            'jul': 6, 'julio': 6, 'july': 6,
            'ago': 7, 'agosto': 7, 'aug': 7, 'august': 7,
            'sep': 8, 'septiembre': 8, 'sept': 8, 'september': 8,
            'oct': 9, 'octubre': 9, 'october': 9,
            'nov': 10, 'noviembre': 10, 'november': 10,
            'dic': 11, 'diciembre': 11, 'dec': 11, 'december': 11
          };
          
          // Buscar cualquier coincidencia con nombres de meses en el texto
          for (const [abbr, monthIndex] of Object.entries(meses)) {
            if (monthText.includes(abbr)) {
              if (!isNaN(day) && day >= 1 && day <= 31) {
                return new Date(year, monthIndex, day);
              }
              break;
            }
          }
        }
      } catch (e) {
        console.error(`Error al parsear fecha con guión ${dateStr}: ${e}`);
      }
    }
    
    // Si llegamos aquí, intentar buscar patrones de fecha en el texto
    try {
      // Búsqueda de patrones como "DD mes" o "mes DD"
      const meses = {
        'ene': 0, 'enero': 0, 'jan': 0, 'january': 0,
        'feb': 1, 'febrero': 1, 'february': 1,
        'mar': 2, 'marzo': 2, 'march': 2,
        'abr': 3, 'abril': 3, 'apr': 3, 'april': 3,
        'may': 4, 'mayo': 4,
        'jun': 5, 'junio': 5, 'june': 5,
        'jul': 6, 'julio': 6, 'july': 6,
        'ago': 7, 'agosto': 7, 'aug': 7, 'august': 7,
        'sep': 8, 'septiembre': 8, 'sept': 8, 'september': 8,
        'oct': 9, 'octubre': 9, 'october': 9,
        'nov': 10, 'noviembre': 10, 'november': 10,
        'dic': 11, 'diciembre': 11, 'dec': 11, 'december': 11
      };
      
      const dateLower = dateStr.toLowerCase();
      
      // Buscar coincidencia con algún mes
      for (const [nombreMes, indiceMes] of Object.entries(meses)) {
        if (dateLower.includes(nombreMes)) {
          // Buscar dígitos cerca del nombre del mes
          const digitsMatch = dateLower.match(/\d+/);
          if (digitsMatch) {
            const day = parseInt(digitsMatch[0], 10);
            if (!isNaN(day) && day >= 1 && day <= 31) {
              return new Date(year, indiceMes, day);
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error(`Error al buscar patrones de fecha en ${dateStr}: ${e}`);
    }
    
    // Si no se pudo parsear, retornar fecha inválida
    return new Date(NaN);
  }
  
  // Método auxiliar para determinar si un año es bisiesto
  private static esBisiesto(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  // Parsear valor numérico
  private static parseValue(value: any): number | null {
    if (!value || value === '-') return null;
    
    if (typeof value === 'number') {
      // Si el valor es 0 o negativo, considerarlo como nulo
      return value <= 0 ? null : value;
    }
    
    if (typeof value === 'string') {
      // Manejar valores con coma decimal (formato europeo)
      const normalizedValue = value.replace(',', '.');
      const parsed = parseFloat(normalizedValue);
      
      // Verificar si es un número válido y mayor que cero
      return isNaN(parsed) || parsed <= 0 ? null : parsed;
    }
    
    return null;
  }

  // Corregir el sector basado en el producto
  private static corregirSectorProducto(sector: string, producto: string, especificacion: string): string {
    // Corregir "ACEIE" a "ACEITE"
    if (sector === 'ACEIE') {
      return 'ACEITE';
    }

    const productoLower = producto.toLowerCase();

    // CORRECCIONES ESPECÍFICAS POR NOMBRE EXACTO DE PRODUCTO
    // Estas correcciones tienen prioridad sobre las reglas generales

    // Aceites que siempre deben ir a ACEITES VEGETALES Y ACEITUNA DE MESA
    if (producto === "Aceite de girasol refinado convencional (€/100kg)" ||
        producto === "Aceite de girasol refinado alto oleico (€/100kg)" ||
        producto === "Aceite refinado de soja (€/100kg)") {
      return "ACEITES VEGETALES Y ACEITUNA DE MESA";
    }

    // REGLAS GENERALES DE CLASIFICACIÓN POR SECTOR

    // Aceites se mantienen en su propio sector
    if (productoLower.includes('aceite') || 
        productoLower.includes('aceituna')) {
      return 'ACEITES VEGETALES Y ACEITUNA DE MESA';
    }

    // Productos específicos para SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS
    if (productoLower.includes('colza grano') || 
        productoLower.includes('garbanzos') || 
        productoLower.includes('lentejas') || 
        productoLower.includes('habas secas') || 
        productoLower.includes('guisantes secos') || 
        productoLower.includes('pipa de girasol') || 
        productoLower.includes('torta de girasol') || 
        productoLower.includes('torta de soja') || 
        productoLower.includes('alfalfa')) {
      return 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS';
    }

    // Correcciones específicas por nombre de producto
    if (productoLower.includes('col-repollo') || productoLower.includes('col repollo')) {
      return 'HORTALIZAS';
    }

    if (productoLower.includes('vino tinto sin dop')) {
      return 'VINO';
    }

    if (productoLower.includes('huevos')) {
      return 'AVES, HUEVOS, CAZA';
    }
    
    // CORRECCIÓN POR SECTOR ACTUAL Y TIPO DE PRODUCTO

    // Corregir productos erróneamente clasificados en VINO
    if (sector === 'VINO') {
      // Productos de semillas oleaginosas frecuentemente clasificados como VINO
      if (productoLower.includes('colza') || 
          productoLower.includes('girasol') || 
          productoLower.includes('soja') || 
          productoLower.includes('guisante') || 
          productoLower.includes('lenteja') || 
          productoLower.includes('haba') || 
          productoLower.includes('garbanzo') || 
          productoLower.includes('alfalfa') || 
          productoLower.includes('torta') || 
          productoLower.includes('semilla') || 
          productoLower.includes('proteico')) {
        return 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS';
      }
    }

    // Corregir frutas y hortalizas en el sector incorrecto
    if (sector !== 'FRUTAS' && sector !== 'HORTALIZAS') {
      // Frutas comunes
      if (productoLower.includes('manzana') || 
          productoLower.includes('pera') || 
          productoLower.includes('plátano') || 
          productoLower.includes('naranja') || 
          productoLower.includes('mandarina') || 
          productoLower.includes('limón') || 
          productoLower.includes('melocotón') || 
          productoLower.includes('nectarina') || 
          productoLower.includes('uva') || 
          productoLower.includes('melón') || 
          productoLower.includes('sandía') || 
          productoLower.includes('cereza') || 
          productoLower.includes('ciruela') || 
          productoLower.includes('fresa') || 
          productoLower.includes('aguacate') || 
          productoLower.includes('clementina') || 
          productoLower.includes('satsuma') ||
          productoLower.includes('caqui') ||
          productoLower.includes('granada') ||
          productoLower.includes('níspero') ||
          productoLower.includes('albaricoque') ||
          productoLower.includes('higo') ||
          productoLower.includes('breva')) {
        return 'FRUTAS';
      }

      // Hortalizas comunes
      if (productoLower.includes('tomate') || 
          productoLower.includes('patata') || 
          productoLower.includes('cebolla') || 
          productoLower.includes('ajo') || 
          productoLower.includes('pimiento') || 
          productoLower.includes('calabacín') || 
          productoLower.includes('judía') || 
          productoLower.includes('berenjena') || 
          productoLower.includes('zanahoria') || 
          productoLower.includes('lechuga') || 
          productoLower.includes('escarola') || 
          productoLower.includes('espinaca') || 
          productoLower.includes('alcachofa') || 
          productoLower.includes('coliflor') || 
          productoLower.includes('brócoli') || 
          productoLower.includes('col') || 
          productoLower.includes('repollo') || 
          productoLower.includes('pepino') ||
          productoLower.includes('puerro') ||
          productoLower.includes('champiñón') ||
          productoLower.includes('espárrago') ||
          productoLower.includes('haba verde') ||
          productoLower.includes('acelga')) {
        return 'HORTALIZAS';
      }
    }

    // Asegurarse que Tomate, Lechuga, Escarola, etc. van a Hortalizas aunque vengan de Frutas
    if (sector === 'FRUTAS') {
      if (productoLower.includes('tomate') || 
          productoLower.includes('lechuga') || 
          productoLower.includes('escarola') || 
          productoLower.includes('espinaca') || 
          productoLower.includes('alcachofa') || 
          productoLower.includes('coliflor') || 
          productoLower.includes('brócoli') || 
          productoLower.includes('col') || 
          productoLower.includes('pepino') ||
          productoLower.includes('pimiento')) {
        return 'HORTALIZAS';
      }
    }

    // Corregir productos de aves y huevos
    if (sector !== 'AVES, HUEVOS, CAZA') {
      if (productoLower.includes('pollo') || 
          productoLower.includes('gallina') || 
          productoLower.includes('huevo') || 
          productoLower.includes('ave') || 
          productoLower.includes('conejo')) {
        return 'AVES, HUEVOS, CAZA';
      }
    }

    // Corregir productos cárnicos
    if (sector !== 'BOVINO' && 
        (productoLower.includes('bovino') || 
         productoLower.includes('vacuno') || 
         productoLower.includes('ternera') ||
         productoLower.includes('animales 8-12 meses') ||
         productoLower.includes('machos 12-24 meses'))) {
      return 'BOVINO';
    }

    if (sector !== 'PORCINO' && 
        (productoLower.includes('cerdo') || 
         productoLower.includes('porcino') || 
         productoLower.includes('lechón'))) {
      return 'PORCINO';
    }

    if (sector !== 'OVINO' && 
        (productoLower.includes('cordero') || 
         productoLower.includes('ovino') || 
         productoLower.includes('oveja'))) {
      return 'OVINO';
    }

    // Asegurarse que los corderos siempre vayan a OVINO independientemente de su sector actual
    if (productoLower.includes('cordero')) {
      return 'OVINO';
    }

    // Corregir productos lácteos
    if (sector !== 'LÁCTEOS') {
      if (productoLower.includes('leche') || 
          productoLower.includes('queso') || 
          productoLower.includes('mantequilla') || 
          productoLower.includes('nata') || 
          productoLower.includes('yogur')) {
        return 'LÁCTEOS';
      }
    }

    // Asegurarse que mantequilla y nata siempre van a LÁCTEOS 
    if (productoLower.includes('mantequilla') || productoLower.includes('nata')) {
      return 'LÁCTEOS';
    }

    // Corregir productos de cereales
    if (sector !== 'CEREALES') {
      if (productoLower.includes('trigo') || 
          productoLower.includes('cebada') || 
          productoLower.includes('maíz') || 
          productoLower.includes('avena') || 
          productoLower.includes('centeno') || 
          productoLower.includes('sorgo')) {
        return 'CEREALES';
      }
    }

    // Corregir productos de arroz
    if (sector !== 'ARROZ' && productoLower.includes('arroz')) {
      return 'ARROZ';
    }

    // Corregir productos de vino
    if (sector !== 'VINO' && 
        (productoLower.includes('vino'))) {
      // Asegurarse que sea específicamente un vino y no un texto que incluya la palabra "vino"
      if (productoLower.startsWith('vino') || 
          productoLower.includes('vino tinto') || 
          productoLower.includes('vino blanco')) {
        return 'VINO';
      }
    }

    // Si llegamos aquí y el sector es vacío o desconocido, intentar determinar por el nombre
    if (!sector || sector.trim() === '') {
      // Semillas y proteicos
      if (productoLower.includes('garbanzos') || 
          productoLower.includes('lentejas') || 
          productoLower.includes('habas secas') || 
          productoLower.includes('pipa de girasol') || 
          productoLower.includes('torta de girasol') || 
          productoLower.includes('torta de soja')) {
        return 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS';
      }

      // Si hay aceite en el nombre, debe ir a aceites
      if (productoLower.includes('aceite')) {
        return 'ACEITES VEGETALES Y ACEITUNA DE MESA';
      }
    }

    return sector || 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS';  // Por defecto, si no hay sector
  }

  // Método para convertir una fecha JavaScript a número serial de Excel
  // Este método es útil para pruebas y está expuesto para fines de testing
  static dateToExcelSerial(date: Date): number {
    // Fecha base de Excel: 1/1/1900
    // Excel incorrectamente asume que 1900 es un año bisiesto, por lo que hay que ajustar
    const baseDate = new Date(1899, 11, 30); // 30 de diciembre de 1899
    const msPerDay = 24 * 60 * 60 * 1000;
    
    // Diferencia en días
    let days = Math.round((date.getTime() - baseDate.getTime()) / msPerDay);
    
    // En Excel, los días se cuentan a partir del 1 (1/1/1900 = 1)
    return days;
  }
}



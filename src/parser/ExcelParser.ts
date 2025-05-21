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
            
            preciosSemanales.push({
              semana: `Semana ${String(j + 1).padStart(2, '0')}`,
              fecha: weekDates[j],
              valor: valor
            });
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
    
    for (let i = 3; i < dateRow.length; i++) {
      const cell = dateRow[i];
      if (!cell) {
        dates.push(new Date(NaN)); // Fecha inválida si la celda está vacía
        continue;
      }
      
      try {
        const date = this.parseDateString(cell.toString(), year);
        dates.push(date);
      } catch (e) {
        console.error(`Error al parsear fecha: ${e}`);
        dates.push(new Date(NaN));
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
  private static parseDateString(dateStr: string, year: number): Date {
    dateStr = dateStr.toString().trim();
    
    // Formato 1: "DD/MM - DD/MM" (ej: "30/01 - 05/02")
    if (dateStr.includes('-') && dateStr.includes('/')) {
      // Usar la segunda fecha (final del rango)
      const parts = dateStr.split('-');
      const endDatePart = parts[parts.length - 1].trim();
      
      if (endDatePart.includes('/')) {
        const [day, month] = endDatePart.split('/').map(s => parseInt(s.trim(), 10));
        return new Date(year, month - 1, day);
      }
    }
    
    // Formato 2: "DD/MM" (ej: "05/02")
    if (dateStr.includes('/') && !dateStr.includes('-')) {
      const [day, month] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
      return new Date(year, month - 1, day);
    }
    
    // Formato 3: número de Excel
    if (!isNaN(Number(dateStr))) {
      const excelDate = XLSX.SSF.parse_date_code(Number(dateStr));
      if (excelDate && excelDate.d && excelDate.m) {
        return new Date(excelDate.y || year, excelDate.m - 1, excelDate.d);
      }
    }
    
    // Si no se pudo parsear, retornar fecha inválida
    return new Date(NaN);
  }
  
  // Parsear valor numérico
  private static parseValue(value: any): number | null {
    if (!value || value === '-') return null;
    
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // Manejar valores con coma decimal (formato europeo)
      const normalizedValue = value.replace(',', '.');
      const parsed = parseFloat(normalizedValue);
      
      return isNaN(parsed) ? null : parsed;
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
}



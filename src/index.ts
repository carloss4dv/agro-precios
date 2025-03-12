// src/index.ts
import { ExcelParser } from './parser/ExcelParser';
import type { Precio, FiltroFecha } from './parser/types';
import { convertirAEurosPorKg } from './parser/utils';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Exportación principal existente
export const parsePrecios = (filePath: string, filtro?: FiltroFecha): Precio[] => {
  return ExcelParser.parse(filePath, filtro);
};

// Nueva función de descarga
export const descargarPrecios = async (año: number, carpetaDestino: string = './descargas'): Promise<string> => {
  try {
    const urlBase = 'https://www.mapa.gob.es/es/estadistica/temas/estadisticas-agrarias/economia/precios-medios-nacionales/';
    
    // 1. Obtener HTML de la página
    const { data } = await axios.get(urlBase);
    const $ = cheerio.load(data);
    
    // 2. Buscar enlaces XLSX en la sección de Concepto
    const enlaces: { [key: string]: string } = {};
    $('h3:contains("Concepto")').next().find('a').each((_, elemento) => {
      const texto = $(elemento).text();
      const href = $(elemento).attr('href');
      if (href && texto.includes('Precios Medios Nacionales')) {
        const añoEnlace = texto.match(/\d{4}/)?.[0];
        if (añoEnlace) enlaces[añoEnlace] = href;
      }
    });

    // 3. Validar año solicitado
    const añoBuscado = año.toString();
    if (!enlaces[añoBuscado]) {
      throw new Error(`No se encontró archivo para el año ${año}`);
    }

    // 4. Crear directorio si no existe
    if (!fs.existsSync(carpetaDestino)) {
      fs.mkdirSync(carpetaDestino, { recursive: true });
    }

    // 5. Descargar archivo
    const urlArchivo = new URL(enlaces[añoBuscado], urlBase).href;
    const nombreArchivo = `precios_medios_${añoBuscado}.xlsx`;
    const rutaCompleta = path.join(carpetaDestino, nombreArchivo);
    
    const respuesta = await axios({
      method: 'GET',
      url: urlArchivo,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(rutaCompleta);
    respuesta.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(rutaCompleta));
      writer.on('error', reject);
    });

  } catch (error) {
    throw new Error(`Error al descargar archivo: ${(error as Error).message}`);
  }
};

// Exportaciones existentes
export type { Precio, FiltroFecha };
export { ExcelParser, convertirAEurosPorKg};

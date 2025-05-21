import { descargarPrecios } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

describe('Descarga de archivos', () => {
  const carpetaDestino = './test-downloads';
  // Usar el año actual para el test principal
  const currentYear = new Date().getFullYear();

  // Limpiar antes y después de las pruebas
  beforeAll(() => {
    if (fs.existsSync(carpetaDestino)) {
      try {
        fs.rmSync(carpetaDestino, { recursive: true });
      } catch (e) {
        console.warn(`No se pudo limpiar la carpeta ${carpetaDestino}: ${e}`);
      }
    }
  });

  afterAll(() => {
    // Limpiar después de las pruebas
    try {
      if (fs.existsSync(carpetaDestino)) {
        fs.rmSync(carpetaDestino, { recursive: true });
      }
    } catch (e) {
      console.warn(`No se pudo limpiar la carpeta ${carpetaDestino}: ${e}`);
    }
  });

  test(`Descargar precios del año actual (${currentYear})`, async () => {
    try {
      const ruta = await descargarPrecios(currentYear, carpetaDestino);
      
      // Verificar que el archivo existe
      expect(fs.existsSync(ruta)).toBe(true);
      
      // Verificar tamaño mínimo (1KB)
      const stats = fs.statSync(ruta);
      expect(stats.size).toBeGreaterThan(1024);
      
      // Verificar extensión
      expect(path.extname(ruta)).toBe('.xlsx');
    } catch (error: unknown) {
      // Si falla porque el archivo del año actual aún no está disponible,
      // marcamos el test como pendiente
      if (error instanceof Error && 
          error.message.includes(`No se encontró archivo para el año ${currentYear}`)) {
        console.warn(`El archivo para el año ${currentYear} aún no está disponible`);
        return;
      }
      throw error;
    }
  });

  test('Manejar error por año futuro', async () => {
    const añoFuturo = currentYear + 10;
    await expect(descargarPrecios(añoFuturo))
      .rejects
      .toThrow(`No se encontró archivo para el año ${añoFuturo}`);
  });
});

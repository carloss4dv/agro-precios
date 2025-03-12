import { descargarPrecios } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

describe('Descarga de archivos', () => {
  const carpetaDestino = './test-downloads';

  afterAll(() => {
    // Limpiar después de las pruebas
    if (fs.existsSync(carpetaDestino)) {
      fs.rmSync(carpetaDestino, { recursive: true });
    }
  });

  test('Descargar precios 2025', async () => {
    const ruta = await descargarPrecios(2025, carpetaDestino);
    
    // Verificar que el archivo existe
    expect(fs.existsSync(ruta)).toBe(true);
    
    // Verificar tamaño mínimo (1KB)
    const stats = fs.statSync(ruta);
    expect(stats.size).toBeGreaterThan(1024);
    
    // Verificar extensión
    expect(path.extname(ruta)).toBe('.xlsx');
  });

  test('Manejar error por año inválido', async () => {
    await expect(descargarPrecios(1999))
      .rejects
      .toThrow('No se encontró archivo para el año 1999');
  });
});

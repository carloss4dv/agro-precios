import { parsePrecios, type Precio, type FiltroFecha, convertirAEurosPorKg } from '../src/index';
import * as path from 'path';

describe('Excel Parser', () => {
  const filePath = path.resolve(__dirname, 'fixtures/sample-prices.xlsx');

  // Test 1: Lectura básica del archivo
  test('Debería leer todos los registros del archivo', () => {
    const result = parsePrecios(filePath);
    expect(result.length).toBeGreaterThan(0); // Verificamos que se leen registros
  });

  // Test 2: Verificación de fechas válidas
  test('Debería parsear correctamente las fechas', () => {
    const result = parsePrecios(filePath);
    
    // Verificar que todas las fechas son objetos Date válidos
    let fechasInvalidas = 0;
    
    result.forEach(producto => {
      producto.precios.forEach(p => {
        if (!(p.fecha instanceof Date) || isNaN(p.fecha.getTime())) {
          fechasInvalidas++;
        }
      });
    });
    
    // No debería haber fechas inválidas
    expect(fechasInvalidas).toBe(0);
  });

  // Test 3: Verificación de la correcta asignación de sectores
  test('Debería asignar correctamente los sectores', () => {
    const result = parsePrecios(filePath);
    
    // Verificamos que existen los sectores principales
    const sectores = new Set(result.map(p => p.sector));
    
    // Comprobar que los productos de aceite de oliva están en su sector correcto
    const aceitesOliva = result.filter(p => 
      p.producto.toLowerCase().includes('aceite de oliva')
    );
    
    // Todos los aceites deben estar en el sector correcto (no en ARROZ u otro)
    aceitesOliva.forEach(aceite => {
      expect(aceite.sector).toMatch(/ACEITES|ACEITUNA/i);
    });
    
    // Comprobar que los cereales están en su sector correcto
    const cereales = result.filter(p => 
      p.producto.toLowerCase().includes('trigo') || 
      p.producto.toLowerCase().includes('cebada') ||
      p.producto.toLowerCase().includes('maíz')
    );
    
    cereales.forEach(cereal => {
      expect(cereal.sector).toBe('CEREALES');
    });
  });

  // Test 4: Filtrado por fecha específica
  test('Debería filtrar precios por fecha cuando existe', () => {
    // Primero obtenemos todos los datos para identificar una fecha válida para filtrar
    const todosPrecios = parsePrecios(filePath);
    
    // Buscar una fecha válida en los datos
    let fechaValida: Date | null = null;
    let precio: Precio | null = null;
    
    // Buscar un producto con fechas válidas para usar en la prueba
    for (const p of todosPrecios) {
      for (const semana of p.precios) {
        if (semana.fecha instanceof Date && !isNaN(semana.fecha.getTime())) {
          fechaValida = semana.fecha;
          precio = p;
          break;
        }
      }
      if (fechaValida) break;
    }
    
    // Si encontramos una fecha válida, hacemos la prueba de filtrado
    if (fechaValida) {
      const filtro: FiltroFecha = { 
        dia: fechaValida.getDate(), 
        mes: fechaValida.getMonth() + 1, // Mes en FiltroFecha es 1-12
        año: fechaValida.getFullYear() 
      };
      
      const result = parsePrecios(filePath, filtro);
      
      // Debería haber al menos un resultado
      expect(result.length).toBeGreaterThan(0);
      
      // Todas las fechas en el resultado deben coincidir con el filtro
      result.forEach(producto => {
        producto.precios.forEach(p => {
          expect(p.fecha.getDate()).toBe(filtro.dia);
          expect(p.fecha.getMonth() + 1).toBe(filtro.mes);
          expect(p.fecha.getFullYear()).toBe(filtro.año);
        });
      });
    } else {
      // Si no hay fechas válidas, omitimos esta prueba
      console.warn('No se encontraron fechas válidas para probar el filtrado');
    }
  });

  // Test 5: Manejo de valores nulos
  test('Debería manejar valores nulos (-)', () => {
    const result = parsePrecios(filePath);
    
    // Verificar que se manejan valores nulos en algún producto
    const tieneValoresNulos = result.some(precio => 
      precio.precios.some(p => p.valor === null)
    );
    
    expect(tieneValoresNulos).toBe(true);
  });

  // Test 6: Estructura de datos correcta
  test('Debería mantener la estructura de Precio', () => {
    const result = parsePrecios(filePath);
    expect(result.length).toBeGreaterThan(0);
    
    const firstItem = result[0];
    
    expect(firstItem).toMatchObject({
      sector: expect.any(String),
      producto: expect.any(String),
      especificacion: expect.any(String),
      precios: expect.arrayContaining([
        {
          semana: expect.stringMatching(/Semana \d{2}/),
          fecha: expect.any(Date),
          valor: expect.anything() // Puede ser número o null
        }
      ])
    });
  });

  // Test 7: Función de conversión a €/kg
  test('Debería convertir precios a euros por kg', () => {
    const result = parsePrecios(filePath);
    const convertidos = convertirAEurosPorKg(result);
    
    // Verificar que se mantuvo la estructura pero se modificaron los valores
    expect(convertidos.length).toBe(result.length);
    
    // Verificar que hay valores que cambiaron (conversion distinta de 1:1)
    let valorConversion = false;
    
    for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < result[i].precios.length; j++) {
        const original = result[i].precios[j].valor;
        const convertido = convertidos[i].precios[j].valor;
        
        if (original !== null && convertido !== null && 
            Math.abs(original - convertido) > 0.0001) {
          valorConversion = true;
          break;
        }
      }
      if (valorConversion) break;
    }
    
    expect(valorConversion).toBe(true);
  });

  // Test 8: Manejo de errores
  test('Debería lanzar error con archivo inválido', () => {
    expect(() => parsePrecios('ruta/inexistente.xlsx')).toThrow();
  });
});

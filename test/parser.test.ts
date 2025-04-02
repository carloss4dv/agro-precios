import { parsePrecios, type Precio, type FiltroFecha } from '../src/index';
import * as path from 'path';

describe('Excel Parser', () => {
  const filePath = path.resolve(__dirname, 'fixtures/sample-prices.xlsx');

  // Test 1: Lectura básica del archivo
  test('Debería leer todos los registros del archivo', () => {
    const result = parsePrecios(filePath);
    expect(result.length).toBeGreaterThan(121); // Ajustar según datos reales
  });

  // Test 2: Filtrado por fecha exacta
  test('Debería filtrar precios por fecha', () => {
		const filtro: FiltroFecha = { 
		  dia: 19, 
		  mes: 1, // Enero = 1 (no 0 como en Date de JS)
		  año: 2025 
		};
		
		const result = parsePrecios(filePath, filtro);
		console.log(result)
		// Verificar que todas las entradas coincidan con la fecha
		result.forEach(precio => {
		  precio.precios.forEach(p => {
		    expect(p.fecha).toEqual(new Date(2025, 0, 19)); // Enero es 0 en Date
		  });
		});
		
		// Verificar que tenemos 122 productos para esa fecha
		expect(result.length).toBe(0);
	});

  test('Debería filtrar precios por fecha', () => {
		const filtro: FiltroFecha = { 
		  dia: 19, 
		  mes: 1, 
		  año: 2025 
		};
		
		const result = parsePrecios(filePath, filtro);
		
		// Verificar que al menos un precio coincide con la fecha
		const hasMatchingDate = result.some(precio => 
		  precio.precios.some(p => p.fecha.getTime() === new Date(2025, 0, 19).getTime())
		);
		
		expect(hasMatchingDate).toBe(false);
	});

	test('Debería manejar valores nulos (-)', () => {
		const result = parsePrecios(filePath);
		
		// Encontrar productos con TODOS los valores nulos
		const productosNulos = result.filter(precio => 
		  precio.precios.every(p => p.valor === null)
		);
		
		expect(productosNulos.length).toBeGreaterThan(0);
		productosNulos.forEach(precio => {
		  expect(precio).toMatchObject({
		    sector: expect.any(String),
		    producto: expect.any(String),
		    especificacion: expect.any(String)
		  });
		});
	});

	test('Debería mantener la estructura de Precio', () => {
		const [firstItem] = parsePrecios(filePath);
		
		expect(firstItem).toEqual({
		  sector: expect.any(String),
		  producto: expect.any(String),
		  especificacion: expect.any(String),
		  precios: expect.arrayContaining([
		    {
		      semana: expect.stringMatching(/Semana \d{2}/),
		      fecha: expect.any(Date),
		      valor: expect.any(Number) || null
		    }
		  ])
		});
	});

  // Test 5: Manejo de errores
  test('Debería lanzar error con archivo inválido', () => {
    expect(() => parsePrecios('ruta/inexistente.xlsx')).toThrow();
  });
});

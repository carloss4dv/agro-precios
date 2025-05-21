// Script específico para analizar problemas con el parseo de vinos
const { parsePrecios } = require('./dist/index');
const fs = require('fs');
const path = require('path');

// Listar todos los archivos en la carpeta de descargas
const descargasDir = path.join(__dirname, 'descargas');

try {
  // Verificar que la carpeta de descargas existe
  if (!fs.existsSync(descargasDir)) {
    console.error(`La carpeta ${descargasDir} no existe. Creando la carpeta...`);
    fs.mkdirSync(descargasDir, { recursive: true });
    console.log(`Coloca archivos Excel en la carpeta 'descargas' y ejecuta este script de nuevo.`);
    process.exit(0);
  }

  const archivos = fs.readdirSync(descargasDir)
    .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'))
    .sort();

  console.log(`Archivos encontrados: ${archivos.length}`);

  if (archivos.length === 0) {
    console.log('No se encontraron archivos Excel en la carpeta de descargas.');
    process.exit(0);
  }

  // Procesar cada archivo buscando específicamente vinos
  archivos.forEach(archivo => {
    try {
      console.log(`\n=== Analizando vinos en ${archivo} ===`);
      const filePath = path.join(descargasDir, archivo);
      
      // Parsear el archivo
      const precios = parsePrecios(filePath);
      
      // Filtrar sólo los vinos
      const vinos = precios.filter(p => 
        p.producto.toLowerCase().includes('vino') || 
        p.sector.toLowerCase().includes('vino')
      );
      
      console.log(`Total de productos: ${precios.length}`);
      console.log(`Total de vinos encontrados: ${vinos.length}`);
      
      if (vinos.length > 0) {
        console.log('\nDetalle de vinos encontrados:');
        vinos.forEach((vino, index) => {
          console.log(`\n--- Vino ${index + 1} ---`);
          console.log(`Sector: ${vino.sector}`);
          console.log(`Producto: ${vino.producto}`);
          console.log(`Especificación: ${vino.especificacion}`);
          
          // Verificar fechas
          const fechasValidas = vino.precios.filter(p => p.fecha && !isNaN(p.fecha.getTime())).length;
          const fechasInvalidas = vino.precios.filter(p => !p.fecha || isNaN(p.fecha.getTime())).length;
          
          console.log(`Fechas válidas: ${fechasValidas}`);
          console.log(`Fechas inválidas: ${fechasInvalidas}`);
          
          // Mostrar las primeras 3 fechas como ejemplo
          console.log('Primeras fechas:');
          vino.precios.slice(0, 3).forEach(p => {
            console.log(`  ${p.semana}: ${p.fecha ? p.fecha.toLocaleDateString() : 'Invalid Date'} - Valor: ${p.valor}`);
          });
        });
      } else {
        console.log('No se encontraron vinos en este archivo.');
        
        // Listar todos los sectores para verificar
        const sectores = [...new Set(precios.map(p => p.sector))];
        console.log('\nSectores encontrados:');
        sectores.forEach(sector => {
          console.log(`- ${sector}`);
        });
      }
    
    } catch (error) {
      console.error(`Error al analizar ${archivo}:`, error);
    }
  });

} catch (error) {
  console.error('Error general:', error);
} 
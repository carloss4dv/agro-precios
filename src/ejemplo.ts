import { descargarPrecios, parsePrecios,convertirAEurosPorKg } from './index';

async function main() {
  try {
    const ruta = await descargarPrecios(2025);
    const datos = parsePrecios(ruta);
    console.log(`Descargados ${datos.length} registros`);
    console.log('Primer registro:', datos[0]);
    const convertidos = convertirAEurosPorKg(datos)
    console.log('Primer registro:', convertidos[0])
  } catch (error) {
    // Verificación de tipo segura
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error desconocido:', error);
    }
  }
}

main();

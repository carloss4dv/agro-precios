import { descargarPrecios, parsePrecios,convertirAEurosPorKg } from './index';

async function main() {
  try {

    for (let i = 2019; i <= 2024; i++) {
      const ruta = await descargarPrecios(i);
      const datos = parsePrecios(ruta);
      const convertidos = convertirAEurosPorKg(datos)

      for (const registro of convertidos) {
        console.log(registro) 
      }
    }


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

import { Precio, FiltroFecha} from './types';

export function convertirAEurosPorKg(precios: Precio[]): Precio[] {
  return precios.map(producto => {
    const conversionRate = obtenerTasaConversion(producto.producto);
    return {
      ...producto,
      precios: producto.precios.map(semana => ({
        ...semana,
        valor: semana.valor !== null ? 
          Number((semana.valor * conversionRate).toFixed(4)) : 
          null
      }))
    };
  });
}

// Tasas de conversión
const obtenerTasaConversion = (producto: string): number => {
  try {
    // Normalizar el texto para manejar caracteres especiales
    const normalizado = producto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Buscar patrones comunes de unidades
    if (/\(€\/t\)|\(Ôé¼\/t\)/.test(producto)) return 0.001; // euros por tonelada
    if (/\(€\/100\s?kg\)|\(Ôé¼\/100\s?kg\)/.test(producto)) return 0.01; // euros por 100kg
    if (/\(€\/hectolitro\)|\(Ôé¼\/hectolitro\)/.test(producto)) return 0.01; // euros por hectolitro
    if (/\(€\/100\s?ud\)|\(Ôé¼\/100\s?ud\)/.test(producto)) return 0.01; // euros por 100 unidades
    if (/\(€\/docena\)|\(Ôé¼\/docena\)/.test(producto)) return 1/12; // euros por docena

    // Casos especiales
    if (producto.includes('Canal')) return 0.55 / 100; // 100kg Canal → kg comestible
    if (producto.includes('Vivo')) return 0.60 / 100;  // 100kg Vivo → kg comestible
    
    // Productos por unidad
    if (producto.includes('unidad')) {
      // Extraer peso de la unidad si está disponible, por defecto asumimos 20kg
      const pesoMatch = producto.match(/(\d+)\s?kg/);
      const peso = pesoMatch ? parseInt(pesoMatch[1], 10) : 20;
      return 1 / peso;
    }
    
    // Si no se puede determinar, retornar 1 (sin conversión)
    console.warn(`No se pudo determinar la tasa de conversión para: ${producto}`);
    return 1;
  } catch (e) {
    console.error(`Error al determinar la tasa de conversión para: ${producto}`, e);
    return 1; // valor por defecto si hay error
  }
};

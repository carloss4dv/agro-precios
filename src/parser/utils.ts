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
  const [_, unidad] = producto.match(/\((.*?)\)/) || [];
  
  switch(true) {
    case unidad === '€/t': return 0.001;
    case unidad === '€/100kg': return 0.01;
    case unidad === '€/hectolitro': return 0.01; // Considerar densidad específica
    case unidad === '€/100 ud': return 0.01;
    case unidad === '€/docena': return 1/12;
    case producto.includes('Canal'): return 0.55 / 100; // 100kg Canal → kg comestible
    case producto.includes('Vivo'): return 0.60 / 100;  // 100kg Vivo → kg comestible
    case producto.includes('unidad'): return 1 / 20;    // Lechón 20kg
    default: return 1;
  }
};

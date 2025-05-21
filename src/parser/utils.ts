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
    const textoLimpio = normalizado.toLowerCase();
    
    // Conversiones específicas para productos de vino
    if (textoLimpio.includes('vino')) {
      if (textoLimpio.includes('litro') || textoLimpio.includes('l)') || textoLimpio.includes('(l')) {
        return 1;  // Ya está en €/L
      }
      // Hectolitro a litro (multiplicar por 0.01)
      if (textoLimpio.includes('hl') || textoLimpio.includes('hectolitro')) {
        return 0.01;
      }
    }
    
    // Patrones generales de unidades
    if (textoLimpio.includes('(€/kg)') || textoLimpio.includes('euros/kg') || textoLimpio.includes('€/kg') || textoLimpio.includes('eur/kg')) {
      return 1;  // Ya está en €/kg
    } else if (textoLimpio.includes('(€/t)') || textoLimpio.includes('€/t') || textoLimpio.includes('euros/t') || textoLimpio.includes('eur/t') || textoLimpio.includes('€/tm') || textoLimpio.includes('€/tonelada')) {
      return 0.001;  // De €/tonelada a €/kg
    } else if (textoLimpio.includes('€/100kg') || textoLimpio.includes('€/100 kg') || textoLimpio.includes('euros/100kg')) {
      return 0.01;  // De €/100kg a €/kg
    } else if (textoLimpio.includes('€/docena') || textoLimpio.includes('docena')) {
      // Asumimos 0.6kg por docena de huevos
      return 1/0.6;  // De €/docena a €/kg
    } else if (textoLimpio.includes('€/l') || textoLimpio.includes('€/litro') || textoLimpio.includes('euros/litro') || textoLimpio.includes('euros/l')) {
      // Para líquidos asumimos densidad similar al agua
      return 1;  // De €/litro a €/kg (aproximadamente)
    } else if (textoLimpio.includes('€/ud') || textoLimpio.includes('€/unidad') || textoLimpio.includes('unidad')) {
      // Para unidades, necesitamos estimar el peso medio
      if (textoLimpio.includes('lechuga') || textoLimpio.includes('col')) {
        return 1/0.5;  // Aproximadamente 0.5kg por lechuga
      } else if (textoLimpio.includes('sandia')) {
        return 1/5;  // Aproximadamente 5kg por sandía
      } else if (textoLimpio.includes('melon')) {
        return 1/2;  // Aproximadamente 2kg por melón
      } else if (textoLimpio.includes('piña')) {
        return 1/1.5;  // Aproximadamente 1.5kg por piña
      } else {
        return 1/0.3;  // Valor genérico para otros productos por unidad
      }
    }
    
    // Para sectores específicos
    if (textoLimpio.includes('aceite')) {
      return 1;  // De €/litro a €/kg (aproximado)
    } else if (textoLimpio.includes('vino')) {
      return 1;  // De €/litro a €/kg (aproximado)
    } else if (textoLimpio.includes('carne')) {
      return 1;  // Asumimos que ya está en €/kg
    }
    
    // Valor predeterminado si no se identifica la unidad
    return 1;
  } catch (error) {
    console.error(`Error al obtener tasa de conversión para: ${producto}`, error);
    return 1;  // Valor por defecto
  }
};

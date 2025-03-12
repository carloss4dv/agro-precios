export interface Precio {
  sector: string;
  producto: string;
  especificacion: string;
  precios: {
    semana: string;
    fecha: Date;
    valor: number | null;
  }[];
}

export interface FiltroFecha {
  dia: number;
  mes: number;
  año: number;
}


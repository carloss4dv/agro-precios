# AGRO PRECIOS

Paquete Node.js/TypeScript para procesar datos agrícolas del MAPA.

---

## Características Principales

- **📂 Parseo de archivos XLSX con estructura oficial**
- **📅 Filtrado por fechas específicas**
- **🔄 Conversión automática a €/kg**
- **🌐 Descarga directa de fuentes oficiales**

---

## Instalación

Ejecuta en tu terminal:

```bash
npm install agro-precios
```

## Uso Basico

```typescript
import { parsePrecios, descargarPrecios } from 'agro-precios';

// 1. Parsear archivo local
const datos = parsePrecios('ruta/archivo.xlsx');

// 2. Descargar y procesar
async function obtenerDatos() {
  const ruta = await descargarPrecios(2025);
  const datosConvertidos = parsePrecios(ruta);
  console.log(datosConvertidos);
}
```

## Conversión a Euros/KG 
```typescript
import { convertirAEurosPorKg } from 'agro-precios';

const datosEnKg = convertirAEurosPorKg(datos);
console.log(datosEnKg[0].precios[0].valor); // Ej: 0.2358 €/kg
```

## Ejemplo de estructura de datos

```json
{
  "sector": "CEREALES",
  "producto": "Trigo blando panificable (€/t)",
  "especificacion": "(1)",
  "precios": [
    {
      "semana": "Semana 01",
      "fecha": "2025-01-05T00:00:00.000Z",
      "valor": 235.84
    }
  ]
}
```

## Opciones avanzadas

```typescript
// Filtrado por fecha
const filtro = { dia: 15, mes: 3, año: 2025 };
const datosFiltrados = parsePrecios('archivo.xlsx', filtro);

// Configurar carpeta de descargas
descargarPrecios(2024, './mis-descargas');
```

## Ejemplo

En el directorio src de encuentra el script **ejemplo.ts**

```bash
npx ts-node src/ejemplo.ts
```

## Configuracion recomendada

 -**Node.js v18+**
 -**TypeScript v5+**
 -**Archivos fuente en UTF-8**
 
## Licencia

Este proyecto se distribuye bajo la [Licencia MIT](https://opensource.org/licenses/MIT).  
Esto significa que puedes usar, modificar y distribuir el software libremente, siempre y cuando se incluya la atribución correspondiente y una copia de la licencia en cualquier redistribución.  
© 2024
 
 
## Contacto 

[💼](https://www.linkedin.com/in/carlos-de-vera-sanz-01a504265)


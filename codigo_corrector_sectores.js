
// CÓDIGO GENERADO PARA CORRECCIÓN DE SECTORES
// Copiar este código y adaptarlo para usarlo en src/parser/ExcelParser.ts

private static corregirSectorProducto(sector: string, producto: string, especificacion: string): string {
  // Correcciones específicas por producto
  const productoLower = producto.toLowerCase();

  // Correcciones por nombre exacto de producto
  switch (producto) {
    case "Colza grano (€/t)": return "HORTALIZAS";
    case "Limón (€/100kg)": return "FRUTAS";
    case "Clementina (€/100kg)": return "FRUTAS";
    case "Mandarina (€/100kg)": return "FRUTAS";
    case "Satsuma (€/100kg)": return "FRUTAS";
    case "Naranja. Grupo Navel (€/100kg)": return "AVES, HUEVOS, CAZA";
    case "Naranja Lanelate (€/100kg)": return "FRUTAS";
    case "Naranja Navel (€/100kg)": return "AVES, HUEVOS, CAZA";
    case "Naranja Navelate (€/100kg)": return "AVES, HUEVOS, CAZA";
    case "Naranja Navelina (€/100kg)": return "AVES, HUEVOS, CAZA";
    case "Naranja. Grupo blancas (€/100kg)": return "FRUTAS";
    case "Naranja Salustiana (€/100kg)": return "FRUTAS";
    case "Naranja Valencia Late (€/100kg)": return "FRUTAS";
    case "Manzana Golden  (€/100kg)": return "FRUTAS";
    case "Manzana Fuji  (€/100kg)": return "FRUTAS";
    case "Manzana Gala  (€/100kg)": return "FRUTAS";
    case "Manzana Granny Smith  (€/100kg)": return "FRUTAS";
    case "Lechuga romana (€/100 ud)": return "HORTALIZAS";
    case "Escarola (€/100 ud)": return "HORTALIZAS";
    case "Espinaca (€/100kg)": return "HORTALIZAS";
    case "Tomate redondo liso (€/100kg)": return "HORTALIZAS";
    case "Tomate cereza (€/100kg)": return "HORTALIZAS";
    case "Tomate racimo (€/100kg)": return "HORTALIZAS";
    case "Alcachofa  (€/100kg)": return "HORTALIZAS";
    case "Coliflor (€/100kg)": return "HORTALIZAS";
    case "Col-repollo hoja lisa (€/100kg)": return "AVES, HUEVOS, CAZA";
    case "Brócoli (€/100kg)": return "HORTALIZAS";
    case "Pepino (€/100kg)": return "HORTALIZAS";
    case "Pimiento verde tipo italiano (€/100kg)": return "HORTALIZAS";
    case "Fresa (€/100kg)": return "FRUTAS";
    case "Bovino vivo (€/100kg Vivo)": return "VINO";
    case "Naranja (€/100kg)": return "FRUTAS";
  }
  
  // Correcciones por palabras clave en el nombre del producto

  // Corregir productos de SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS a HORTALIZAS
  if (sector === "SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS") {
    const palabrasClave = [
      "col",
    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "HORTALIZAS";
    }
  }

  // Corregir productos de SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS a FRUTAS
  if (sector === "SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS") {
    const palabrasClave = [
      "limón",
      "clementina",
      "mandarina",
      "satsuma",
      "naranja",
      "manzana",
    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "FRUTAS";
    }
  }

  // Corregir productos de SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS a AVES, HUEVOS, CAZA
  if (sector === "SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS") {
    const palabrasClave = [
      "ave",
    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "AVES, HUEVOS, CAZA";
    }
  }

  // Corregir productos de FRUTAS a HORTALIZAS
  if (sector === "FRUTAS") {
    const palabrasClave = [
      "lechuga",
      "escarola",
      "espinaca",
      "tomate",
      "alcachofa",
      "coliflor",
      "col",
      "brócoli",
      "pepino",
      "pimiento",
    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "HORTALIZAS";
    }
  }

  // Corregir productos de FRUTAS a AVES, HUEVOS, CAZA
  if (sector === "FRUTAS") {
    const palabrasClave = [
      "pollo",
    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "AVES, HUEVOS, CAZA";
    }
  }

  // Corregir productos de HORTALIZAS a FRUTAS
  if (sector === "HORTALIZAS") {
    const palabrasClave = [
      "fresa",
    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "FRUTAS";
    }
  }

  // Corregir productos de BOVINO a VINO
  if (sector === "BOVINO") {
    const palabrasClave = [
      "vino",
    ];
    
    if (palabrasClave.some(palabra => productoLower.includes(palabra))) {
      return "VINO";
    }
  }

  // Si no hay correcciones, devolver el sector original
  return sector;
}
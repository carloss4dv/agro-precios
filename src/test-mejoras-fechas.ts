import { ExcelParser } from './parser/ExcelParser';

function main() {
  try {
    const año = 2023; // Usamos 2023 ya que es donde vimos la mayoría de los problemas
    
    console.log("PRUEBA DE MEJORAS EN PARSEO DE FECHAS\n");
    console.log("Casos de formato DD-DD/MM (común en 2023):");
    
    const casosFormato1 = [
      "02-08/01",
      "09-15/01",
      "16-22/01",
      "23-29/01",
      "06-12/02",
      "13-19/02",
      "20-26/02",
      "03-09/04",
      "10-16/04",
      "17-23/04",
      "24-30/04",
      "01-07/05",
      "08-14/05",
      "15-21/05",
      "22-28/05",
      "05-11/06",
      "12-18/06",
      "19-25/06",
      "03-09/07",
      "10-16/07",
      "17-23/07",
      "24-30/07",
      "07-13/08",
      "14-20/08",
      "22-27/08",
      "02-08/10",
      "06-12/11"
    ];
    
    casosFormato1.forEach(caso => {
      try {
        const fechaParseada = ExcelParser.parseDateString(caso, año);
        
        if (fechaParseada instanceof Date && !isNaN(fechaParseada.getTime())) {
          console.log(`✅ "${caso}" => ${fechaParseada.toLocaleDateString()}`);
        } else {
          console.log(`❌ "${caso}" => No se pudo parsear`);
        }
      } catch (error) {
        console.log(`❌ Error al parsear "${caso}": ${(error as Error).message}`);
      }
    });
    
    console.log("\nCasos de fechas seriales de Excel:");
    
    const casosSeriales = [
      { valor: "40392", expected: "02/10/2023" }, // Semana 40
      { valor: "40883", expected: "06/11/2023" }  // Semana 45
    ];
    
    casosSeriales.forEach(caso => {
      try {
        const fechaParseada = ExcelParser.parseDateString(caso.valor, año);
        
        if (fechaParseada instanceof Date && !isNaN(fechaParseada.getTime())) {
          const fechaStr = fechaParseada.toLocaleDateString();
          const correcto = fechaStr === caso.expected;
          
          console.log(`${correcto ? '✅' : '❌'} "${caso.valor}" => ${fechaStr} ${correcto ? '' : `(esperado: ${caso.expected})`}`);
        } else {
          console.log(`❌ "${caso.valor}" => No se pudo parsear`);
        }
      } catch (error) {
        console.log(`❌ Error al parsear "${caso.valor}": ${(error as Error).message}`);
      }
    });
    
    console.log("\nCasos de formato DD/MM-DD/MM:");
    
    const casosFormato2 = [
      "30/01-05/02",
      "27/02-05/03",
      "27/03-02/04",
      "29/05-04/06",
      "26/06-02/07",
      "31/07-06/08",
      "28/08-03/09",
      "25/09-01/10",
      "30/10-05/11",
      "27/11-03/12",
      "04/12-10/12",
      "11/12-17/12",
      "18/12-24/12",
      "25/12 - 31/12"
    ];
    
    casosFormato2.forEach(caso => {
      try {
        const fechaParseada = ExcelParser.parseDateString(caso, año);
        
        if (fechaParseada instanceof Date && !isNaN(fechaParseada.getTime())) {
          console.log(`✅ "${caso}" => ${fechaParseada.toLocaleDateString()}`);
        } else {
          console.log(`❌ "${caso}" => No se pudo parsear`);
        }
      } catch (error) {
        console.log(`❌ Error al parsear "${caso}": ${(error as Error).message}`);
      }
    });
  } catch (error) {
    console.error('Error general:', (error as Error).message);
    process.exit(1);
  }
}

main(); 
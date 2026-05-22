import ExcelJS from 'exceljs';
import { calculateAPU, type APUBreakdown } from '@/lib/calc-apu';
import type { Project } from '@/types/database';

export interface B2Input {
  item_n: number;
  proyecto: string;
  actividad: string;
  cantidad: number;
  unidad: string;
  moneda: string;
  breakdown: APUBreakdown;
}

export async function generateB2(project: Project, items: B2Input[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sibbë / Obras';

  for (const item of items) {
    const sheetName = `B2-Item-${item.item_n}`.slice(0, 31);
    const ws = wb.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'portrait' },
    });

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 38;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 12;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;

    let row = 1;
    ws.mergeCells(`A${row}:F${row}`);
    ws.getCell(`A${row}`).value = 'FORMULARIO B-2';
    ws.getCell(`A${row}`).font = { bold: true, size: 14 };
    ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
    row++;
    ws.mergeCells(`A${row}:F${row}`);
    ws.getCell(`A${row}`).value = 'ANÁLISIS DE PRECIOS UNITARIOS';
    ws.getCell(`A${row}`).font = { bold: true, size: 12 };
    ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
    row += 2;

    // Datos generales
    const general = [
      ['Proyecto', item.proyecto],
      ['Actividad', item.actividad],
      ['Cantidad', item.cantidad.toString()],
      ['Unidad', item.unidad],
      ['Moneda', item.moneda],
    ];
    for (const [k, v] of general) {
      ws.getCell(`A${row}`).value = k;
      ws.getCell(`A${row}`).font = { bold: true };
      ws.mergeCells(`B${row}:F${row}`);
      ws.getCell(`B${row}`).value = v;
      ws.getCell(`B${row}`).alignment = { horizontal: 'left' };
      row++;
    }
    row++;

    const calc = calculateAPU(item.breakdown, project);

    // 1. MATERIALES
    row = writeSection(ws, row, '1. MATERIALES', item.breakdown.materials, calc.total_materials);

    // 2. MANO DE OBRA
    row = writeSection(ws, row, '2. MANO DE OBRA', item.breakdown.labor, calc.subtotal_labor, [
      [`CARGAS SOCIALES = (${project.cargas_sociales_pct}% DEL SUBTOTAL DE MANO DE OBRA)`, calc.cargas_sociales],
      [`IMPUESTOS IVA MANO DE OBRA = (${project.iva_mano_pct}% DE SUBTOTAL + CARGAS SOCIALES)`, calc.iva_mano],
      ['TOTAL MANO DE OBRA', calc.total_labor],
    ]);

    // 3. EQUIPO
    row = writeSection(ws, row, '3. EQUIPO, MAQUINARIA Y HERRAMIENTAS', item.breakdown.equipment, calc.subtotal_equipment, [
      [`HERRAMIENTAS = (${project.herramientas_pct}% DEL TOTAL DE MANO DE OBRA)`, calc.herramientas],
      ['TOTAL EQUIPO, MAQUINARIA Y HERRAMIENTAS', calc.total_equipment],
    ]);

    // 4. GG
    row = writeRecargo(ws, row, '4. GASTOS GENERALES Y ADMINISTRATIVOS', `GASTOS GENERALES = ${project.gg_pct}% DE 1+2+3`, calc.gg);

    // 5. UTILIDAD
    row = writeRecargo(ws, row, '5. UTILIDAD', `UTILIDAD = ${project.utilidad_pct}% DE 1+2+3+4`, calc.utilidad);

    // 6. IT
    row = writeRecargo(ws, row, '6. IMPUESTOS', `IMPUESTOS IT = ${project.it_pct}% DE 1+2+3+4+5`, calc.it);

    // Totales finales
    ws.mergeCells(`A${row}:E${row}`);
    ws.getCell(`A${row}`).value = 'TOTAL PRECIO UNITARIO (1+2+3+4+5+6)';
    ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
    ws.getCell(`F${row}`).value = calc.total;
    ws.getCell(`F${row}`).numFmt = '#,##0.00';
    ws.getCell(`F${row}`).font = { bold: true };
    row++;
    ws.mergeCells(`A${row}:E${row}`);
    ws.getCell(`A${row}`).value = 'TOTAL PRECIO UNITARIO ADOPTADO (Con dos decimales)';
    ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
    ws.getCell(`F${row}`).value = calc.total_adoptado;
    ws.getCell(`F${row}`).numFmt = '#,##0.00';
    ws.getCell(`F${row}`).font = { bold: true };
    ws.getCell(`F${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4B5' } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function writeSection(ws: ExcelJS.Worksheet, startRow: number, title: string, lines: { description: string; unit: string; quantity: number; unit_price: number }[], subtotal: number, extra?: [string, number][]) {
  let row = startRow;
  ws.mergeCells(`A${row}:F${row}`);
  ws.getCell(`A${row}`).value = title;
  ws.getCell(`A${row}`).font = { bold: true };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  row++;

  // Headers
  ws.getRow(row).values = ['N°', 'DESCRIPCIÓN', 'UNIDAD', 'CANTIDAD', 'PRECIO PRODUCTIVO', 'COSTO TOTAL'];
  ws.getRow(row).font = { bold: true, size: 9 };
  ws.getRow(row).eachCell((c) => {
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });
  row++;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const r = ws.getRow(row);
    r.values = [i + 1, l.description, l.unit, l.quantity, l.unit_price, l.quantity * l.unit_price];
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).numFmt = '#,##0.0000';
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(6).numFmt = '#,##0.00';
    r.eachCell((c) => {
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    row++;
  }

  ws.mergeCells(`A${row}:E${row}`);
  ws.getCell(`A${row}`).value = title.includes('MATERIALES') ? 'TOTAL MATERIALES' : 'SUBTOTAL';
  ws.getCell(`A${row}`).font = { bold: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
  ws.getCell(`F${row}`).value = subtotal;
  ws.getCell(`F${row}`).numFmt = '#,##0.00';
  ws.getCell(`F${row}`).font = { bold: true };
  row++;

  if (extra) {
    for (const [label, val] of extra) {
      ws.mergeCells(`A${row}:E${row}`);
      ws.getCell(`A${row}`).value = label;
      ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
      ws.getCell(`F${row}`).value = val;
      ws.getCell(`F${row}`).numFmt = '#,##0.00';
      if (label.startsWith('TOTAL')) {
        ws.getCell(`A${row}`).font = { bold: true };
        ws.getCell(`F${row}`).font = { bold: true };
      }
      row++;
    }
  }
  return row + 1;
}

function writeRecargo(ws: ExcelJS.Worksheet, startRow: number, title: string, formula: string, value: number) {
  let row = startRow;
  ws.mergeCells(`A${row}:F${row}`);
  ws.getCell(`A${row}`).value = title;
  ws.getCell(`A${row}`).font = { bold: true };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  row++;
  ws.mergeCells(`A${row}:E${row}`);
  ws.getCell(`A${row}`).value = formula;
  ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
  ws.getCell(`F${row}`).value = value;
  ws.getCell(`F${row}`).numFmt = '#,##0.00';
  ws.getCell(`F${row}`).font = { bold: true };
  row += 2;
  return row;
}

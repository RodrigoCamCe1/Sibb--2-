import ExcelJS from 'exceljs';
import { numberToWordsBOB } from '@/lib/utils';
import type { Project, Item } from '@/types/database';

export interface B1Row {
  item_n: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export async function generateB1(project: Project, rows: B1Row[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sibbë / Obras';
  wb.created = new Date();

  const ws = wb.addWorksheet('Formulario B-1', {
    pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });

  // Encabezados
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = 'FORMULARIO B-1';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:G2');
  ws.getCell('A2').value = 'PRESUPUESTO POR ÍTEMS Y GENERAL DE LA OBRA';
  ws.getCell('A2').font = { bold: true, size: 12 };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells('A3:G3');
  ws.getCell('A3').value = '(En bolivianos)';
  ws.getCell('A3').alignment = { horizontal: 'center' };
  ws.getCell('A3').font = { italic: true };

  ws.mergeCells('A4:G4');
  ws.getCell('A4').value = `Proyecto: ${project.name} — ${project.city}`;
  ws.getCell('A4').alignment = { horizontal: 'center' };
  ws.getCell('A4').font = { italic: true, size: 10 };

  // Sub-encabezado dividido
  ws.mergeCells('A6:D6');
  ws.getCell('A6').value = 'Volúmenes de Obra requeridos por la entidad convocante';
  ws.getCell('A6').alignment = { horizontal: 'center', wrapText: true };
  ws.getCell('A6').font = { bold: true, size: 9 };
  ws.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  ws.mergeCells('E6:G6');
  ws.getCell('E6').value = 'Presupuesto (Costo propuesto por el proponente)';
  ws.getCell('E6').alignment = { horizontal: 'center', wrapText: true };
  ws.getCell('E6').font = { bold: true, size: 9 };
  ws.getCell('E6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  // Header columnas
  const headerRow = ws.getRow(7);
  headerRow.values = ['Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Precio Unitario (Numeral)', 'Precio Unitario (Literal)', 'Precio Total (Numeral)'];
  headerRow.font = { bold: true, size: 10 };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.eachCell((c) => {
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });
  headerRow.height = 30;

  // Anchos
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 50;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 38;
  ws.getColumn(7).width = 18;

  // Filas
  let totalAcum = 0;
  rows.forEach((r, idx) => {
    const rowNum = 8 + idx;
    const total = r.quantity * r.unit_price;
    totalAcum += total;
    const row = ws.getRow(rowNum);
    row.values = [r.item_n, r.description, r.unit, r.quantity, r.unit_price, numberToWordsBOB(r.unit_price), total];
    row.alignment = { vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(5).alignment = { horizontal: 'right' };
    row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(7).numFmt = '#,##0.00';
    row.eachCell((c) => {
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  // Fila total numeral
  const totalRowNum = 8 + rows.length;
  ws.mergeCells(`A${totalRowNum}:F${totalRowNum}`);
  ws.getCell(`A${totalRowNum}`).value = 'PRECIO TOTAL (Numeral)';
  ws.getCell(`A${totalRowNum}`).alignment = { horizontal: 'right' };
  ws.getCell(`A${totalRowNum}`).font = { bold: true };
  ws.getCell(`G${totalRowNum}`).value = totalAcum;
  ws.getCell(`G${totalRowNum}`).numFmt = '#,##0.00';
  ws.getCell(`G${totalRowNum}`).font = { bold: true };
  ws.getCell(`G${totalRowNum}`).alignment = { horizontal: 'right' };

  // Fila total literal
  const literalRowNum = totalRowNum + 1;
  ws.mergeCells(`A${literalRowNum}:F${literalRowNum}`);
  ws.getCell(`A${literalRowNum}`).value = 'PRECIO TOTAL (Literal)';
  ws.getCell(`A${literalRowNum}`).alignment = { horizontal: 'right' };
  ws.getCell(`A${literalRowNum}`).font = { bold: true };
  ws.getCell(`G${literalRowNum}`).value = numberToWordsBOB(totalAcum);
  ws.getCell(`G${literalRowNum}`).font = { bold: true, italic: true };

  // Borders en totals
  for (const r of [totalRowNum, literalRowNum]) {
    for (let c = 1; c <= 7; c++) {
      ws.getCell(r, c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

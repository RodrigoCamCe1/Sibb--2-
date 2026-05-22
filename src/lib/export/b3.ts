import ExcelJS from 'exceljs';
import type { InsumoTipo } from '@/types/database';

export interface B3Insumo {
  tipo: InsumoTipo;
  description: string;
  unit: string;
  precio_unitario: number;
}

export async function generateB3(insumos: B3Insumo[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('B-3 Precios Elementales');

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 50;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 18;

  let row = 1;
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'FORMULARIO B-3';
  ws.getCell(`A${row}`).font = { bold: true, size: 14 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row++;
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'PRECIOS UNITARIOS ELEMENTALES';
  ws.getCell(`A${row}`).font = { bold: true, size: 12 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row += 2;

  const groups: { tipo: InsumoTipo; title: string }[] = [
    { tipo: 'material', title: '1. MATERIALES' },
    { tipo: 'labor', title: '2. MANO DE OBRA' },
    { tipo: 'equipment', title: '3. MAQUINARIA Y EQUIPO' },
  ];

  for (const g of groups) {
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(`A${row}`).value = g.title;
    ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    row++;

    ws.getRow(row).values = ['N°', 'DESCRIPCIÓN', 'UNIDAD', 'PRECIO UNITARIO'];
    ws.getRow(row).font = { bold: true, size: 9 };
    ws.getRow(row).eachCell((c) => {
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });
    row++;

    const filtered = insumos.filter((i) => i.tipo === g.tipo);
    filtered.forEach((i, idx) => {
      const r = ws.getRow(row);
      r.values = [idx + 1, i.description, i.unit, i.precio_unitario];
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(4).numFmt = '#,##0.00';
      r.eachCell((c) => {
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      row++;
    });
    if (filtered.length === 0) {
      ws.mergeCells(`A${row}:D${row}`);
      ws.getCell(`A${row}`).value = '(Sin insumos)';
      ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
      ws.getCell(`A${row}`).font = { italic: true, color: { argb: 'FF94A3B8' } };
      row++;
    }
    row++;
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

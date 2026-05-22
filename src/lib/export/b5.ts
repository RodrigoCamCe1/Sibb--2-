import ExcelJS from 'exceljs';

export interface B5Entry {
  n: number;
  description: string;
  mes_o_semana: string;
  total_pct: number;
}

export async function generateB5(entries: B5Entry[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('B-5 Cronograma Desembolsos');

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 14;

  let row = 1;
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'FORMULARIO B-5';
  ws.getCell(`A${row}`).font = { bold: true, size: 14 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row++;
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'CRONOGRAMA DE DESEMBOLSOS';
  ws.getCell(`A${row}`).font = { bold: true, size: 12 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row += 2;

  ws.getRow(row).values = ['N°', 'DESCRIPCIÓN', 'MES / SEMANA', 'TOTAL (%)'];
  ws.getRow(row).font = { bold: true };
  ws.getRow(row).eachCell((c) => {
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });
  row++;

  let total = 0;
  for (const e of entries) {
    total += e.total_pct;
    const r = ws.getRow(row);
    r.values = [e.n, e.description, e.mes_o_semana, e.total_pct];
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).numFmt = '0.00"%"';
    r.eachCell((c) => {
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    row++;
  }

  ws.mergeCells(`A${row}:C${row}`);
  ws.getCell(`A${row}`).value = 'TOTAL';
  ws.getCell(`A${row}`).font = { bold: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
  ws.getCell(`D${row}`).value = total;
  ws.getCell(`D${row}`).numFmt = '0.00"%"';
  ws.getCell(`D${row}`).font = { bold: true };
  for (let c = 1; c <= 4; c++) {
    ws.getCell(row, c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

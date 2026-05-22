import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumber, numberToWordsBOB } from '@/lib/utils';
import type { Project } from '@/types/database';

export interface PDFRow {
  item_n: number;
  code?: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export interface PDFInput {
  project: Project;
  rows: PDFRow[];
  empresa?: { name?: string; nit?: string; direccion?: string };
}

export async function generatePresupuestoPDF(input: PDFInput): Promise<Blob> {
  const { project, rows, empresa } = input;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  let y = 15;

  // ---- Membrete superior ----
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(empresa?.name ?? 'Constructora (editable en perfil)', marginX, y);
  if (empresa?.nit) doc.text(`NIT: ${empresa.nit}`, pageWidth - marginX, y, { align: 'right' });
  y += 4;
  if (empresa?.direccion) {
    doc.text(empresa.direccion, marginX, y);
    y += 4;
  }
  doc.setDrawColor(200);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // ---- Título ----
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESUPUESTO DE OBRA', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(project.name, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  const subtitleParts = [project.city, project.modalidad === 'LP' ? 'Licitación Pública' : 'ANPE'];
  if (project.owner_client) subtitleParts.push(project.owner_client);
  doc.text(subtitleParts.join('  •  '), pageWidth / 2, y, { align: 'center' });
  y += 7;

  // ---- Bloque datos proyecto ----
  doc.setFontSize(8);
  doc.setTextColor(100);
  const infoLines: [string, string][] = [
    ['CUCE', project.cuce ?? '—'],
    ['Moneda', project.currency],
    ['Fecha emisión', new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })],
  ];
  if (project.area_m2) infoLines.push(['Área', `${formatNumber(project.area_m2)} m²`]);
  const colWidth = (pageWidth - marginX * 2) / infoLines.length;
  infoLines.forEach(([label, value], idx) => {
    const x = marginX + colWidth * idx;
    doc.setTextColor(150);
    doc.text(label.toUpperCase(), x, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(value, x, y + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
  });
  y += 12;

  // ---- Tabla presupuesto ----
  const tableRows = rows.map((r) => {
    const total = r.quantity * r.unit_price;
    return [
      r.item_n.toString(),
      r.code ?? '',
      r.description,
      r.unit,
      formatNumber(r.quantity, 2),
      formatNumber(r.unit_price, 2),
      formatNumber(total, 2),
    ];
  });

  const totalGeneral = rows.reduce((acc, r) => acc + r.quantity * r.unit_price, 0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Cód.', 'Descripción', 'Unidad', 'Cantidad', 'P. Unit.', 'Total Bs']],
    body: tableRows,
    foot: [
      ['', '', { content: 'PRECIO TOTAL (Numeral)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, '', formatNumber(totalGeneral, 2)],
      ['', '', { content: 'PRECIO TOTAL (Literal)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, '', { content: numberToWordsBOB(totalGeneral), styles: { fontStyle: 'italic', fontSize: 7 } }],
    ],
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    styles: { lineColor: [226, 232, 240], lineWidth: 0.1 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 14 },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => {
      // Pie de página
      const str = `Página ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(str, pageWidth - marginX, pageHeight - 8, { align: 'right' });
      doc.text(`Generado con Sibbë / Obras • ${new Date().toLocaleDateString('es-BO')}`, marginX, pageHeight - 8);
    },
  });

  // ---- Sección firma ----
  const lastTableY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  let signY = lastTableY + 25;

  // Si no entra en página, nueva
  if (signY > pageHeight - 40) {
    doc.addPage();
    signY = 40;
  }

  const sigBoxWidth = 60;
  const sig1X = marginX + 10;
  const sig2X = pageWidth - marginX - sigBoxWidth - 10;

  doc.setDrawColor(150);
  doc.line(sig1X, signY, sig1X + sigBoxWidth, signY);
  doc.line(sig2X, signY, sig2X + sigBoxWidth, signY);

  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text('Proponente / Representante Legal', sig1X + sigBoxWidth / 2, signY + 5, { align: 'center' });
  doc.text('Supervisor / Fiscal de Obra', sig2X + sigBoxWidth / 2, signY + 5, { align: 'center' });

  return doc.output('blob');
}

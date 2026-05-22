import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { Item, Project } from '@/types/database';

const BOILERPLATE_MATERIALES = 'El Contratista proporcionará todos los materiales, herramientas y equipo necesarios para la ejecución de estos trabajos, así como para el cuidado y mantenimiento de los mismos durante el período de ejecución de la obra. En forma general todos los materiales que el Contratista pretenda emplear en la realización de los mismos, deberán ser aprobados previamente por el Supervisor de Obra.';
const BOILERPLATE_PAGO = 'El pago del ítem se hará de acuerdo a la unidad y precio de la propuesta aceptada. Este costo incluye la compensación total por todos los materiales, mano de obra, herramientas, equipo empleado y demás incidencias determinadas por ley. El pago se realizará por el volumen de obra realmente ejecutado en sitio.';

export async function generateTechSpec(project: Project, items: Item[]): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: 'ESPECIFICACIONES TÉCNICAS',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Proyecto: ${project.name}`, italics: true })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `${project.city}${project.owner_client ? ` — ${project.owner_client}` : ''}`, italics: true, size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
  );

  items.forEach((item, idx) => {
    const n = idx + 1;
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `ITEM ${n}: ${item.description.toUpperCase()}`, bold: true, size: 24 })],
        spacing: { before: 320, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `UNIDAD: ${item.unit.toUpperCase()}`, bold: true })],
        spacing: { after: 160 },
      }),
    );

    addSection(children, '1. DESCRIPCIÓN', item.tech_descripcion || '');
    addSection(children, '2. MATERIALES, HERRAMIENTAS Y EQUIPOS', item.tech_mat_herram_equipo || BOILERPLATE_MATERIALES);
    addSection(children, '3. FORMA DE EJECUCIÓN', item.tech_forma_ejecucion || '');
    addSection(children, '4. MEDICIÓN', item.tech_medicion || `Este ítem será medido en ${item.unit.toUpperCase()}, autorizados por el Supervisor de Obra.`);
    addSection(children, '5. FORMA DE PAGO', item.tech_forma_pago || BOILERPLATE_PAGO);
  });

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBlob(doc);
  return buffer;
}

function addSection(children: Paragraph[], title: string, content: string) {
  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true })],
      spacing: { before: 120, after: 60 },
    }),
  );
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    children.push(new Paragraph({ text: '—', spacing: { after: 80 } }));
    return;
  }
  for (const line of lines) {
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
    children.push(
      new Paragraph({
        text: isBullet ? line.trim().substring(1).trim() : line.trim(),
        bullet: isBullet ? { level: 0 } : undefined,
        spacing: { after: 60 },
      }),
    );
  }
}

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateB1, type B1Row } from './b1';
import { generateB2, type B2Input } from './b2';
import { generateB3, type B3Insumo } from './b3';
import { generateB5, type B5Entry } from './b5';
import { generateTechSpec } from './tech-spec';
import { generatePresupuestoPDF } from './pdf';
import type { Project, Item } from '@/types/database';

export interface BundleInput {
  project: Project;
  items: Item[];
  b1Rows: B1Row[];
  b2Inputs: B2Input[];
  b3Insumos: B3Insumo[];
  b5Entries: B5Entry[];
  includeB4: boolean;
  empresa?: { name?: string; nit?: string; direccion?: string };
}

export async function generateSicoesBundle(input: BundleInput, options?: { selected?: Set<string> }) {
  const zip = new JSZip();
  const isLP = input.project.modalidad === 'LP';
  const selected = options?.selected;

  const slug = input.project.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 50);

  if (!selected || selected.has('B1')) {
    const b1 = await generateB1(input.project, input.b1Rows);
    zip.file('01-B1-Presupuesto.xlsx', await b1.arrayBuffer());
  }

  if (isLP) {
    if (!selected || selected.has('B2')) {
      const b2 = await generateB2(input.project, input.b2Inputs);
      zip.file('02-B2-APU.xlsx', await b2.arrayBuffer());
    }
    if (!selected || selected.has('B3')) {
      const b3 = await generateB3(input.b3Insumos);
      zip.file('03-B3-CatalogoInsumos.xlsx', await b3.arrayBuffer());
    }
    if (input.includeB4 && (!selected || selected.has('B4'))) {
      // TODO B-4
    }
    if (!selected || selected.has('B5')) {
      const b5 = await generateB5(input.b5Entries);
      zip.file('05-B5-Cronograma.xlsx', await b5.arrayBuffer());
    }
  }

  if (!selected || selected.has('TECH')) {
    const tech = await generateTechSpec(input.project, input.items);
    zip.file('06-EspecificacionesTecnicas.docx', await tech.arrayBuffer());
  }

  if (!selected || selected.has('PDF')) {
    const pdf = await generatePresupuestoPDF({
      project: input.project,
      rows: input.b1Rows.map((r) => ({
        item_n: r.item_n,
        description: r.description,
        unit: r.unit,
        quantity: r.quantity,
        unit_price: r.unit_price,
      })),
      empresa: input.empresa,
    });
    zip.file('07-Presupuesto.pdf', await pdf.arrayBuffer());
  }

  zip.file('README.txt',
    `Paquete SICOES - ${input.project.name}\n` +
    `Modalidad: ${isLP ? 'Licitación Pública' : 'ANPE'}\n` +
    `Generado: ${new Date().toLocaleString('es-BO')}\n` +
    `Generado con Sibbë / Obras (https://github.com/RodrigoCamCe1/Sibb--2-)\n`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `SICOES-${slug}.zip`);
}

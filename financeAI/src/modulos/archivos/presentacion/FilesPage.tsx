import { FileCsv, UploadSimple } from '@phosphor-icons/react';
import { PageHeader } from '../../tablero/presentacion/DashboardPage';
import type { PageProps } from '../../../compartido/tipos/workspace';

export function FilesPage(_: PageProps) {
  return (
    <section className="page-stack">
      <PageHeader title="Archivos CSV" subtitle="Carga lotes de transacciones para procesarlos mediante el backend." />
      <article className="upload-panel">
        <FileCsv size={58} />
        <h2>Importacion por lotes</h2>
        <p>Arrastra un archivo CSV o selecciona uno para simular la carga de datos financieros.</p>
        <button className="primary-button"><UploadSimple size={18} /> Seleccionar CSV</button>
      </article>
    </section>
  );
}

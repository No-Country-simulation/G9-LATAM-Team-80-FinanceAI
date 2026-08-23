import { FileCsv, UploadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { PageHeader } from '../../tablero/presentacion/DashboardPage';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { parsearCsv } from '../../../compartido/utilidades/csv';
import { contarPendientes, prepararImportacion } from '../../../compartido/utilidades/importarMovimientos';

export function FilesPage({ workspace }: PageProps) {
  const [estado, setEstado] = useState(''); const [error, setError] = useState('');
  async function importar(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]; if (!archivo) return;
    try {
      const { filas, categoriasDescartadas, problemas } = parsearCsv(await archivo.text());
      // Todo o nada: con una sola fila dudosa no se importa ninguna.
      if (problemas.length > 0) {
        throw new Error(
          `${problemas.length} ${problemas.length === 1 ? 'fila necesita' : 'filas necesitan'} revisión: ` +
          problemas.slice(0, 4).map((problema) => `fila ${problema.fila} (${problema.motivo.toLowerCase()})`).join(', ') +
          (problemas.length > 4 ? '…' : '')
        );
      }
      const pendientes = contarPendientes(filas);
      // Todo o nada: se clasifica en un solo lote y se guarda recien con el conjunto completo.
      const movimientos = await prepararImportacion(filas, workspace.clasificarDescripciones);
      await workspace.importarTransacciones(movimientos);
      const ignoradas = categoriasDescartadas > 0
        ? ` Se ignoró la categoría de ${categoriasDescartadas} ${categoriasDescartadas === 1 ? 'fila' : 'filas'} de ingreso o ahorro.`
        : '';
      setEstado(pendientes > 0
        ? `${archivo.name}: ${movimientos.length} filas guardadas. FinanceAI clasificó ${pendientes} ${pendientes === 1 ? 'gasto' : 'gastos'}.${ignoradas}`
        : `${archivo.name}: ${movimientos.length} filas guardadas en la base de datos.${ignoradas}`);
      setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'No fue posible importar.'); setEstado(''); }
  }
  return <section className="page-stack">
    <PageHeader title="Archivos CSV" subtitle="Importa lotes y guárdalos directamente en tu cuenta." />
    <article className="upload-panel"><FileCsv size={58} /><h2>Importación por lotes</h2>
      <p>Formato: descripcion,tipo,fecha,monto. La fecha debe usar AAAA-MM-DD.</p>
      <p>FinanceAI clasificará automáticamente tus gastos. Los ingresos y los ahorros no llevan categoría.</p>
      <label className="primary-button"><UploadSimple size={18} /> Seleccionar CSV<input hidden type="file" accept=".csv,text/csv" onChange={importar} /></label>
      {estado && <div className="success-note">{estado}</div>}{error && <p className="form-error">{error}</p>}
    </article>
  </section>;
}

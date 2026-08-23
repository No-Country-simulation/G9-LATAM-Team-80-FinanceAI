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
      const { filas, categoriasDescartadas } = parsearCsv(await archivo.text());
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
      <p>Formato: descripcion,categoria,tipo,fecha,monto. La fecha debe usar AAAA-MM-DD.</p>
      <p>FinanceAI clasifica automáticamente los gastos que no tengan categoría. Los ingresos y los ahorros no llevan categoría: deja esa columna vacía.</p>
      <label className="primary-button"><UploadSimple size={18} /> Seleccionar CSV<input hidden type="file" accept=".csv,text/csv" onChange={importar} /></label>
      {estado && <div className="success-note">{estado}</div>}{error && <p className="form-error">{error}</p>}
    </article>
  </section>;
}

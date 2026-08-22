import { FileCsv, UploadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { PageHeader } from '../../tablero/presentacion/DashboardPage';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { parsearCsv } from '../../transacciones/presentacion/TransactionsPage';

export function FilesPage({ workspace }: PageProps) {
  const [estado, setEstado] = useState(''); const [error, setError] = useState('');
  async function importar(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]; if (!archivo) return;
    try {
      const movimientos = parsearCsv(await archivo.text()); await workspace.importarTransacciones(movimientos);
      setEstado(`${archivo.name}: ${movimientos.length} filas guardadas en la base de datos.`); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'No fue posible importar.'); setEstado(''); }
  }
  return <section className="page-stack">
    <PageHeader title="Archivos CSV" subtitle="Importa lotes y guardalos directamente en tu cuenta." />
    <article className="upload-panel"><FileCsv size={58} /><h2>Importacion por lotes</h2>
      <p>Formato: descripcion,categoria,tipo,fecha,monto. La fecha debe usar AAAA-MM-DD.</p>
      <label className="primary-button"><UploadSimple size={18} /> Seleccionar CSV<input hidden type="file" accept=".csv,text/csv" onChange={importar} /></label>
      {estado && <div className="success-note">{estado}</div>}{error && <p className="form-error">{error}</p>}
    </article>
  </section>;
}

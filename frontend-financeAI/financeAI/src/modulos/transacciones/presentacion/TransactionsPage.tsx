import { ArrowLeft, FileCsv, PencilSimple, Plus, Trash, UploadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { formatCurrency } from '../../../compartido/utilidades/formato';
import { validarTransaccion } from '../../../compartido/validaciones/transacciones';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Badge, PageHeader } from '../../tablero/presentacion/DashboardPage';

export function TransactionsPage({ workspace }: PageProps) {
  const [vista, setVista] = useState<'listado' | 'nueva' | 'importar'>('listado');
  const [descripcion, setDescripcion] = useState(''); const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<CategoriaFinanciera>('alimentacion');
  const [tipo, setTipo] = useState<TipoTransaccion>('gasto'); const [error, setError] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null); const [guardando, setGuardando] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); const parsedAmount = Number(monto); const validation = validarTransaccion(descripcion, parsedAmount);
    if (validation) { setError(validation); return; }
    setGuardando(true); setError('');
    try {
      if (editandoId) await workspace.actualizarTransaccion(editandoId, {
        descripcion, categoria, tipo, fecha: new Date().toISOString().slice(0, 10), monto: parsedAmount
      });
      else await workspace.agregarTransaccion({ descripcion, monto: parsedAmount, categoria, tipo });
      limpiar(); setVista('listado');
    } catch (error) { setError(error instanceof Error ? error.message : 'No fue posible guardar.'); }
    finally { setGuardando(false); }
  }

  function limpiar() { setDescripcion(''); setMonto(''); setCategoria('alimentacion'); setTipo('gasto'); setEditandoId(null); }
  function editar(item: Transaccion) {
    setDescripcion(item.descripcion); setMonto(String(Math.abs(item.monto))); setCategoria(item.categoria); setTipo(item.tipo);
    setEditandoId(item.id); setVista('nueva');
  }

  if (vista === 'nueva') return <section className="page-stack">
    <PageHeader title={editandoId ? 'Editar transaccion' : 'Nueva transaccion'} subtitle="Guarda el movimiento en tu cuenta."
      action={<button className="outline-button" onClick={() => { limpiar(); setVista('listado'); }}><ArrowLeft size={18} /> Volver</button>} />
    <TransactionForm {...{ descripcion, monto, categoria, tipo, error, guardando, setDescripcion, setMonto, setCategoria, setTipo, submit }} />
  </section>;
  if (vista === 'importar') return <ImportTransactionsView workspace={workspace} onBack={() => setVista('listado')} />;

  return <section className="page-stack">
    <PageHeader title="Transacciones" subtitle="Movimientos guardados en MySQL."
      action={<button className="primary-button" onClick={() => setVista('nueva')}><Plus size={18} /> Nueva transaccion</button>} />
    <div className="form-actions"><button className="outline-button" type="button" onClick={() => setVista('importar')}><UploadSimple size={18} /> Importar CSV</button></div>
    {workspace.cargandoDatos && <p className="muted-copy">Cargando movimientos...</p>}
    <article className="app-card"><table className="data-table roomy">
      <thead><tr><th>Descripcion</th><th>Categoria</th><th>Tipo</th><th>Fecha</th><th>Monto</th><th>Acciones</th></tr></thead>
      <tbody>{workspace.transacciones.map((item) => <tr key={item.id}>
        <td>{item.descripcion}</td><td><Badge>{etiquetasCategoria[workspace.obtenerCategoria(item)]}</Badge></td>
        <td>{item.tipo}</td><td>{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE')}</td>
        <td className={item.monto < 0 ? 'negative' : 'positive'}>{formatCurrency(item.monto)}</td>
        <td className="table-actions"><button aria-label="Editar" onClick={() => editar(item)}><PencilSimple size={19} /></button>
          <button aria-label="Eliminar" onClick={() => workspace.eliminarTransaccion(item.id)}><Trash size={19} /></button></td>
      </tr>)}</tbody>
    </table></article>
  </section>;
}

type FormProps = {
  descripcion: string; monto: string; categoria: CategoriaFinanciera; tipo: TipoTransaccion; error: string; guardando: boolean;
  setDescripcion: (v: string) => void; setMonto: (v: string) => void; setCategoria: (v: CategoriaFinanciera) => void;
  setTipo: (v: TipoTransaccion) => void; submit: (e: React.FormEvent) => void;
};
function TransactionForm(props: FormProps) {
  return <form className="subview-card form-panel" onSubmit={props.submit}>
    <label>Descripcion<input value={props.descripcion} onChange={(e) => props.setDescripcion(e.target.value)} required /></label>
    <label>Monto<input value={props.monto} onChange={(e) => props.setMonto(e.target.value)} type="number" min="0.01" step="0.01" required /></label>
    <label>Categoria<select value={props.categoria} onChange={(e) => props.setCategoria(e.target.value as CategoriaFinanciera)}>
      {Object.entries(etiquetasCategoria).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label>Tipo<select value={props.tipo} onChange={(e) => props.setTipo(e.target.value as TipoTransaccion)}>
      <option value="gasto">Gasto</option><option value="ingreso">Ingreso</option><option value="ahorro">Ahorro</option></select></label>
    {props.error && <p className="form-error">{props.error}</p>}
    <button className="primary-button" type="submit" disabled={props.guardando}><Plus size={18} /> {props.guardando ? 'Guardando...' : 'Guardar transaccion'}</button>
  </form>;
}

function ImportTransactionsView({ workspace, onBack }: { workspace: PageProps['workspace']; onBack: () => void }) {
  const [mensaje, setMensaje] = useState(''); const [error, setError] = useState('');
  async function seleccionar(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]; if (!archivo) return;
    try {
      const filas = parsearCsv(await archivo.text()); await workspace.importarTransacciones(filas);
      setMensaje(`${filas.length} transacciones importadas correctamente.`); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'CSV no valido.'); setMensaje(''); }
  }
  return <section className="page-stack">
    <PageHeader title="Importar transacciones CSV" subtitle="Columnas requeridas: descripcion,categoria,tipo,fecha,monto."
      action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>} />
    <article className="subview-card upload-subview"><FileCsv size={58} /><h2>Selecciona un archivo CSV</h2>
      <label className="primary-button"><UploadSimple size={18} /> Elegir archivo<input hidden type="file" accept=".csv,text/csv" onChange={seleccionar} /></label>
      {mensaje && <div className="success-note">{mensaje}</div>}{error && <p className="form-error">{error}</p>}
    </article>
  </section>;
}

export function parsearCsv(texto: string): Omit<Transaccion, 'id'>[] {
  const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((linea) => linea.trim());
  if (lineas.length < 2) throw new Error('El archivo no contiene transacciones.');
  const cabecera = lineas[0].split(',').map((valor) => valor.trim().toLowerCase());
  const requeridas = ['descripcion', 'categoria', 'tipo', 'fecha', 'monto'];
  if (requeridas.some((campo) => !cabecera.includes(campo))) throw new Error(`Faltan columnas. Usa: ${requeridas.join(',')}`);
  return lineas.slice(1).map((linea, indice) => {
    const celdas = linea.split(',').map((valor) => valor.trim().replace(/^"|"$/g, ''));
    const valor = (campo: string) => celdas[cabecera.indexOf(campo)];
    const categoria = valor('categoria') as CategoriaFinanciera; const tipo = valor('tipo') as TipoTransaccion;
    if (!(categoria in etiquetasCategoria) || !['ingreso', 'gasto', 'ahorro'].includes(tipo) || !/^\d{4}-\d{2}-\d{2}$/.test(valor('fecha')) || Number(valor('monto')) <= 0)
      throw new Error(`La fila ${indice + 2} contiene datos no validos.`);
    return { descripcion: valor('descripcion'), categoria, tipo, fecha: valor('fecha'), monto: Number(valor('monto')) };
  });
}

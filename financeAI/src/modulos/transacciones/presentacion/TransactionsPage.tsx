import { ArrowLeft, CheckCircle, FileCsv, PencilSimple, Plus, Trash, UploadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { formatCurrency } from '../../../compartido/utilidades/formato';
import { validarTransaccion } from '../../../compartido/validaciones/transacciones';
import type { CategoriaFinanciera, TipoTransaccion } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Badge, PageHeader } from '../../tablero/presentacion/DashboardPage';

export function TransactionsPage({ workspace }: PageProps) {
  const [vista, setVista] = useState<'listado' | 'nueva' | 'importar'>('listado');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<CategoriaFinanciera>('alimentacion');
  const [tipo, setTipo] = useState<TipoTransaccion>('gasto');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(monto);
    const validation = validarTransaccion(descripcion, parsedAmount);

    if (validation) {
      setError(validation);
      return;
    }

    workspace.agregarTransaccion({ descripcion, monto: parsedAmount, categoria, tipo });
    setDescripcion('');
    setMonto('');
    setError('');
    setVista('listado');
  }

  if (vista === 'nueva') {
    return (
      <CreateTransactionView
        descripcion={descripcion}
        monto={monto}
        categoria={categoria}
        tipo={tipo}
        error={error}
        setDescripcion={setDescripcion}
        setMonto={setMonto}
        setCategoria={setCategoria}
        setTipo={setTipo}
        onSubmit={submit}
        onBack={() => setVista('listado')}
      />
    );
  }

  if (vista === 'importar') {
    return <ImportTransactionsView onBack={() => setVista('listado')} />;
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Transacciones"
        subtitle="Visualiza y administra todas tus transacciones."
        action={<button className="primary-button" onClick={() => setVista('nueva')}><Plus size={18} /> Nueva transaccion</button>}
      />
      <form className="toolbar-form" onSubmit={submit}>
        <input value={descripcion} onChange={(event) => setDescripcion(event.target.value)} placeholder="Descripcion" />
        <input value={monto} onChange={(event) => setMonto(event.target.value)} placeholder="Monto" type="number" />
        <select value={categoria} onChange={(event) => setCategoria(event.target.value as CategoriaFinanciera)}>
          {Object.entries(etiquetasCategoria).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoTransaccion)}>
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
          <option value="ahorro">Ahorro</option>
        </select>
        <button className="primary-button" type="submit"><Plus size={18} /> Agregar</button>
        <button className="outline-button" type="button" onClick={() => setVista('importar')}><UploadSimple size={18} /> Importar CSV</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <article className="app-card">
        <table className="data-table roomy">
          <thead>
            <tr>
              <th>Descripcion</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {workspace.transacciones.map((transaccion) => (
              <tr key={transaccion.id}>
                <td>{transaccion.descripcion}</td>
                <td><Badge>{etiquetasCategoria[transaccion.categoria]}</Badge></td>
                <td>{transaccion.tipo}</td>
                <td>{transaccion.fecha}</td>
                <td className={transaccion.monto < 0 ? 'negative' : 'positive'}>{formatCurrency(transaccion.monto)}</td>
                <td className="table-actions">
                  <button aria-label="Editar"><PencilSimple size={19} /></button>
                  <button aria-label="Eliminar" onClick={() => workspace.eliminarTransaccion(transaccion.id)}><Trash size={19} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

type CreateTransactionViewProps = {
  descripcion: string;
  monto: string;
  categoria: CategoriaFinanciera;
  tipo: TipoTransaccion;
  error: string;
  setDescripcion: (value: string) => void;
  setMonto: (value: string) => void;
  setCategoria: (value: CategoriaFinanciera) => void;
  setTipo: (value: TipoTransaccion) => void;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
};

function CreateTransactionView({
  descripcion,
  monto,
  categoria,
  tipo,
  error,
  setDescripcion,
  setMonto,
  setCategoria,
  setTipo,
  onSubmit,
  onBack
}: CreateTransactionViewProps) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Nueva transaccion"
        subtitle="Registra un movimiento para recalcular tu salud financiera."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <form className="subview-card form-panel" onSubmit={onSubmit}>
        <label>Descripcion<input value={descripcion} onChange={(event) => setDescripcion(event.target.value)} placeholder="Ej. Supermercado Wong" /></label>
        <label>Monto<input value={monto} onChange={(event) => setMonto(event.target.value)} placeholder="120.50" type="number" /></label>
        <label>Categoria<select value={categoria} onChange={(event) => setCategoria(event.target.value as CategoriaFinanciera)}>
          {Object.entries(etiquetasCategoria).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        <label>Tipo<select value={tipo} onChange={(event) => setTipo(event.target.value as TipoTransaccion)}>
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
          <option value="ahorro">Ahorro</option>
        </select></label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button className="outline-button" type="button" onClick={onBack}>Cancelar</button>
          <button className="primary-button" type="submit"><Plus size={18} /> Guardar transaccion</button>
        </div>
      </form>
    </section>
  );
}

function ImportTransactionsView({ onBack }: { onBack: () => void }) {
  const previewRows = [
    ['Supermercado Metro', 'Alimentacion', '- $ 184.90'],
    ['Taxi aeropuerto', 'Transporte', '- $ 68.00'],
    ['Abono nomina', 'Ingreso', '+ $ 4,850.00']
  ];

  return (
    <section className="page-stack">
      <PageHeader
        title="Importar transacciones CSV"
        subtitle="Carga movimientos por lotes antes de enviarlos al backend."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <article className="subview-card upload-subview">
        <FileCsv size={58} />
        <h2>Vista previa de importacion</h2>
        <p>Simulacion de lectura CSV con validacion de columnas: descripcion, categoria, tipo, fecha y monto.</p>
        <table className="data-table">
          <tbody>
            {previewRows.map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>)}
          </tbody>
        </table>
        <div className="success-note"><CheckCircle size={20} weight="fill" /> 3 filas validas listas para importar.</div>
      </article>
    </section>
  );
}

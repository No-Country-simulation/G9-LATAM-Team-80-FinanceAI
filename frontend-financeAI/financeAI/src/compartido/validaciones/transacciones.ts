export function validarTransaccion(descripcion: string, monto: number) {
  if (!descripcion.trim()) {
    return 'La descripción es obligatoria.';
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    return 'El monto debe ser mayor a cero.';
  }

  return '';
}

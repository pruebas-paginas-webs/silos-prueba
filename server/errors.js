export class HttpError extends Error { constructor(status, code, message) { super(message); this.status=status; this.code=code; } }
export const invalid = message => new HttpError(422, 'VALIDACION', message);
export const conflict = () => new HttpError(409, 'CONFLICTO', 'Este producto cambió en otra ventana. Actualizá la vista antes de guardar.');

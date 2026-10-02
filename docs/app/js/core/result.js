// Forma común de respuesta de toda acción: {ok:true, datos} o {ok:false, errores:{campo: texto, _form: texto}}.
export const fallo = (errores, extra = {}) => ({ ok: false, errores, ...extra });
export const exito = (datos = null, extra = {}) => ({ ok: true, datos, ...extra });
export const hayErrores = (errores) => Object.keys(errores).length > 0;

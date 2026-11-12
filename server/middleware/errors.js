export function errorHandler(error,req,res,next) {
  const databaseErrors={ '23505':[409,'Ya existe un registro con esos datos.'], '23503':[409,'La relación no existe o el registro tiene dependencias.'], '23514':[422,'Los datos incumplen una regla del esquema.'], '23502':[422,'Falta un campo obligatorio.'], '22P02':[422,'Tipo de dato inválido.'], '22003':[422,'Número fuera de rango.'], '22001':[422,'Texto demasiado largo.'], '22007':[422,'Fecha inválida.'], '40P01':[409,'Conflicto concurrente; vuelve a intentar.'], '40001':[409,'Conflicto concurrente; vuelve a intentar.'] };
  const known=databaseErrors[error.code];
  const unavailable=['ECONNREFUSED','ENOTFOUND','28P01','3D000','42P01','3F000'].includes(error.code) || /timeout|Connection terminated/.test(error.message);
  const status=error.type==='entity.parse.failed' ? 400 : known?.[0] || (unavailable ? 503 : (error.status>=400 && error.status<600 ? error.status : 500));
  const message=error.type==='entity.parse.failed' ? 'El cuerpo debe ser JSON válido.' : known?.[1] || (unavailable ? 'Base de datos no disponible o esquema sin configurar. Revisa la conexión del servidor.' : status<500 ? error.message : 'No se pudo completar la operación.');
  if (status>=500) console.error(JSON.stringify({requestId:req.requestId,code:error.code,message:error.message}));
  res.status(status).json({status:'error',error:{message,requestId:req.requestId}});
}

/**
 * KINSU — Google Apps Script API
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Abre tu Google Sheet de Kinsu
 * 2. Extensiones → Apps Script
 * 3. Borra todo el código existente
 * 4. Pega TODO este archivo
 * 5. Guarda (Ctrl+S)
 * 6. Click en "Implementar" → "Nueva implementación"
 * 7. Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 * 8. Click "Implementar" → Copia la URL que aparece
 * 9. Pega esa URL en kinsu-config.js (instrucciones abajo)
 */

// ═══════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

const SHEETS = {
  kinsurers:    'Kinsurers',
  prospectos:   'Prospectos',
  transacciones:'Transacciones',
  formacion:    'Formación',
};


// ═══════════════════════════════════════════════════
// SISTEMA DE NIVELES
// ═══════════════════════════════════════════════════
const NIVELES = [
  { id:0, nombre:'Kinsurer Nuevo',      min:0,  max:0,  comision:'Sin comisión',    pct:0  },
  { id:1, nombre:'Kinsurer Certificado',min:1,  max:4,  comision:'$200 MXN fijos',  pct:0  },
  { id:2, nombre:'Kinsurer Pro',        min:5,  max:14, comision:'15% de comisión', pct:15 },
  { id:3, nombre:'Kinsurer Elite',      min:15, max:29, comision:'20% de comisión', pct:20 },
  { id:4, nombre:'Kinsurer Embajador',  min:30, max:999,comision:'25% + bono red',  pct:25 },
];

function calcularNivel(polizas) {
  const nivel = NIVELES.slice().reverse().find(n => polizas >= n.min) || NIVELES[0];
  const siguiente = NIVELES[nivel.id + 1] || null;
  const faltanParaSiguiente = siguiente ? siguiente.min - polizas : 0;
  const progresoEnNivel = siguiente
    ? Math.round(((polizas - nivel.min) / (siguiente.min - nivel.min)) * 100)
    : 100;

  return {
    actual: nivel,
    siguiente,
    polizas,
    faltanParaSiguiente,
    progresoEnNivel: Math.min(100, Math.max(0, progresoEnNivel)),
  };
}

// ═══════════════════════════════════════════════════
// ROUTER PRINCIPAL — maneja GET y POST
// ═══════════════════════════════════════════════════
function doGet(e) {
  const action = e.parameter.action || '';
  const id     = e.parameter.id     || '';

  let result;
  try {
    switch (action) {
      case 'login':           result = loginKinsurer(e.parameter.email || '', e.parameter.pwd || ''); break;
      case 'debugKinsurers':  result = debugKinsurers(); break;
      case 'getDashboard':    result = getDashboard(id);          break;
      case 'getProspectos':   result = getProspectos(id);         break;
      case 'getProspecto':    result = getProspecto(id);          break;
      case 'getGanancias':    result = getGanancias(id);          break;
      case 'getPerfil':       result = getPerfil(id);             break;
      case 'getFormacion':    result = getFormacion(id);          break;
      default: result = { error: 'Acción no reconocida: ' + action };
    }
  } catch(err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try {
    // Acepta JSON directo o wrapped en parámetro "data"
    const raw = e.postData ? e.postData.contents : '{}';
    body = JSON.parse(raw);
    // Si viene como { data: "JSON_STRING" } (desde text/plain workaround)
    if (typeof body.data === 'string') body = JSON.parse(body.data);
  }
  catch(err) { body = {}; }

  const action = body.action || '';
  let result;

  try {
    switch (action) {
      case 'createProspecto':   result = createProspecto(body.data);      break;
      case 'updateEstatus':     result = updateEstatus(body.data);        break;
      case 'createTransaccion': result = createTransaccion(body.data);    break;
      case 'updateFormacion':   result = updateFormacion(body.data);      break;
      case 'updatePerfil':      result = updatePerfil(body.data);         break;
      default: result = { error: 'Acción no reconocida: ' + action };
    }
  } catch(err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════
// HELPERS — leer y escribir sheets
// ═══════════════════════════════════════════════════
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetToJSON(sheetName, startRow = 3) {
  const sheet   = getSheet(sheetName);
  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data    = sheet.getRange(startRow, 1, Math.max(sheet.getLastRow() - startRow + 1, 1), sheet.getLastColumn()).getValues();

  return data
    .filter(row => row[0] !== '')
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

function findRow(sheetName, colIndex, value, startRow = 3) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getRange(startRow, colIndex, sheet.getLastRow(), 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(value).trim()) {
      return startRow + i;
    }
  }
  return -1;
}

function appendRow(sheetName, values) {
  const sheet  = getSheet(sheetName);
  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, values.length).setValues([values]);
  return newRow;
}



// ═══════════════════════════════════════════════════
// DEBUG — ver exactamente qué hay en el sheet
// ═══════════════════════════════════════════════════
function debugKinsurers() {
  const sheet    = getSheet(SHEETS.kinsurers);
  const lastRow  = sheet.getLastRow();
  const lastCol  = sheet.getLastColumn();
  
  // Leer las primeras 6 filas raw para ver estructura
  const rawData  = sheet.getRange(1, 1, Math.min(6, lastRow), lastCol).getValues();
  
  // Leer headers (fila 2)
  const headers  = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  
  // Intentar leer datos normalmente
  const parsed   = sheetToJSON(SHEETS.kinsurers);

  return {
    totalRows:    lastRow,
    totalCols:    lastCol,
    headers:      headers,
    rawRows:      rawData,
    parsedCount:  parsed.length,
    parsed:       parsed.map(k => ({
      id:    k['ID_Kinsurer'],
      email: k['Email'],
      nivel: k['Nivel'],
      hasPwd: !!k['Contraseña']
    }))
  };
}

// ═══════════════════════════════════════════════════
// LOGIN — validar email + contraseña
// ═══════════════════════════════════════════════════
function loginKinsurer(email, password) {
  const all = sheetToJSON(SHEETS.kinsurers);

  // Limpiar email del sheet — puede venir como [email](mailto:email)
  function cleanEmail(raw) {
    const str = String(raw || '').trim();
    // Extraer email de formato markdown [text](mailto:email)
    const mdMatch = str.match(/\[.*?\]\(mailto:(.*?)\)/);
    if (mdMatch) return mdMatch[1].trim().toLowerCase();
    // Extraer email de formato <email>
    const angleMatch = str.match(/<(.+?)>/);
    if (angleMatch) return angleMatch[1].trim().toLowerCase();
    return str.toLowerCase();
  }

  const searchEmail = email.trim().toLowerCase();
  const kinsurer = all.find(k => cleanEmail(k['Email']) === searchEmail);

  if (!kinsurer) return { error: 'Email no encontrado' };

  const storedPwd = String(kinsurer['Contraseña'] || '').trim();
  if (storedPwd !== password.trim()) return { error: 'Contraseña incorrecta' };

  // No devolver la contraseña al front
  const { 'Contraseña': _, ...safeKinsurer } = kinsurer;
  return { success: true, kinsurer: safeKinsurer };
}

// ═══════════════════════════════════════════════════
// GET — DASHBOARD
// ═══════════════════════════════════════════════════
function getDashboard(kinsurerID) {
  // Una sola apertura del spreadsheet para las 3 hojas
  const allKins    = sheetToJSON(SHEETS.kinsurers);
  const allProsp   = sheetToJSON(SHEETS.prospectos);
  const allTransac = sheetToJSON(SHEETS.transacciones);
  const kinsurer   = allKins.find(k => k['ID_Kinsurer'] === kinsurerID) || {};
  const prospectos = allProsp.filter(p => p['ID_Kinsurer'] === kinsurerID);
  const transacc   = allTransac.filter(t => t['ID_Kinsurer'] === kinsurerID);

  // Ganancias: TODOS los estatus
  const totalGanancias = transacc
    .reduce((sum, t) => sum + parseMXN(t['Monto Comisión']), 0);

  // Métricas — todos los estatus del sheet
  const enviados     = prospectos.filter(p => p['Estatus'] === 'Enviado').length;
  const cotizacion   = prospectos.filter(p => p['Estatus'] === 'En Cotización').length;
  const emision      = prospectos.filter(p => p['Estatus'] === 'En Emisión').length;
  const cobranza     = prospectos.filter(p => p['Estatus'] === 'En Cobranza').length;
  const completados  = prospectos.filter(p => p['Estatus'] === 'Completado').length;
  const cancelados   = prospectos.filter(p => p['Estatus'] === 'Cancelado').length;

  // Pólizas emitidas — directo del sheet Kinsurers (columna editable)
  const polizasRaw = kinsurer['Pólizas Emitidas'] || kinsurer['Polizas Emitidas'] ||
                     kinsurer['Pólizas emitidas'] || kinsurer['polizas_emitidas'] || 0;
  const polizas    = parseInt(String(polizasRaw).replace(/[^0-9]/g,'')) || 0;
  const nivel   = calcularNivel(polizas);

  // Prospectos recientes ordenados por fecha
  const recientes = prospectos
    .slice()
    .sort((a, b) => new Date(b['Fecha Registro']) - new Date(a['Fecha Registro']))
    .slice(0, 3);

  return {
    kinsurer,
    ganancias_total:         formatMXN(totalGanancias),
    ganancias_raw:           totalGanancias,
    prospectos_total:        prospectos.length,
    prospectos_enviados:     enviados,
    prospectos_cotizacion:   cotizacion,
    prospectos_emision:      emision,
    prospectos_cobranza:     cobranza,
    prospectos_completados:  completados,
    prospectos_cancelados:   cancelados,
    nivel:                   nivel,
    prospectos_recientes:    recientes,
  };
}

// ═══════════════════════════════════════════════════
// GET — PROSPECTOS
// ═══════════════════════════════════════════════════
function getProspectos(kinsurerID) {
  const all = sheetToJSON(SHEETS.prospectos);
  const filtered = kinsurerID ? all.filter(p => p['ID_Kinsurer'] === kinsurerID) : all;
  // Ordenar por fecha de registro más reciente primero
  return filtered.slice().sort((a, b) => {
    const da = new Date(a['Fecha Registro'] || '2000-01-01');
    const db = new Date(b['Fecha Registro'] || '2000-01-01');
    return db - da;
  });
}

function getProspecto(folio) {
  const all = sheetToJSON(SHEETS.prospectos);
  return all.find(p => p['Folio'] === folio) || { error: 'Prospecto no encontrado' };
}

// ═══════════════════════════════════════════════════
// GET — GANANCIAS
// ═══════════════════════════════════════════════════
function getGanancias(kinsurerID) {
  const transacc = getTransacciones(kinsurerID);

  // Total: TODOS los estatus (Pagado + Pendiente + Por cobrar)
  const total = transacc.reduce((s, t) => s + parseMXN(t['Monto Comision']), 0);
  const avg   = transacc.length ? total / transacc.length : 0;

  // Ordenar por fecha mas reciente
  const sorted = transacc.slice().sort((a, b) => {
    return new Date(b['Fecha Transaccion']) - new Date(a['Fecha Transaccion']);
  });

  return {
    total:         formatMXN(total),
    total_raw:     total,
    promedio:      formatMXN(avg),
    transacciones: sorted,
    count:         transacc.length,
  };
}

function getTransacciones(kinsurerID) {
  const all = sheetToJSON(SHEETS.transacciones);
  if (!kinsurerID) return all;
  return all.filter(t => t['ID_Kinsurer'] === kinsurerID);
}

// ═══════════════════════════════════════════════════
// GET — PERFIL
// ═══════════════════════════════════════════════════
function getPerfil(kinsurerID) {
  const k = getKinsurerByID(kinsurerID);
  if (k.error) return k;

  // Normalizar campos con o sin acento para garantizar compatibilidad
  return {
    'ID_Kinsurer':    k['ID_Kinsurer']    || '',
    'Nombre Completo':k['Nombre Completo']|| '',
    'Email':          k['Email']          || '',
    'Tel':            k['Teléfono'] || k['Telefono'] || k['telefono'] || k['tel'] || '',
    'CLABE Bancaria': k['CLABE Bancaria'] || '',
    'Banco':          k['Banco']          || '',
    'Nivel':          k['Nivel']          || '',
    'Comisión Actual':k['Comisión Actual']|| k['Comision Actual'] || '',
    'Pólizas Emitidas':k['Pólizas Emitidas']|| k['Polizas Emitidas'] || 0,
    'Estatus':        k['Estatus']        || '',
    'Fecha Registro': k['Fecha Registro'] || '',
  };
}

function getKinsurerByID(id) {
  const all = sheetToJSON(SHEETS.kinsurers);
  return all.find(k => k['ID_Kinsurer'] === id) || { error: 'Kinsurer no encontrado' };
}

// ═══════════════════════════════════════════════════
// GET — FORMACIÓN
// ═══════════════════════════════════════════════════
function getFormacion(kinsurerID) {
  const all = sheetToJSON(SHEETS.formacion);
  return all.find(f => f['ID_Kinsurer'] === kinsurerID) || { error: 'Formación no encontrada' };
}

// ═══════════════════════════════════════════════════
// POST — CREAR PROSPECTO
// ═══════════════════════════════════════════════════
function createProspecto(data) {
  const sheet    = getSheet(SHEETS.prospectos);
  const lastRow  = sheet.getLastRow();
  const id       = lastRow - 1; // ID incremental

  const PREFIJOS = { salud:'S', auto:'A', viaje:'V' };
  const prefix   = PREFIJOS[data.tipo?.toLowerCase()] || 'X';
  const folio    = prefix + new Date().getFullYear() + String(id + 1).padStart(6, '0');

  const now = new Date().toISOString().split('T')[0];

  const values = [
    id + 1, folio, data.kinsurerID || 'KIN-0001',
    data.nombre, data.telefono, data.email,
    data.tipo, 'Enviado',
    data.tipo === 'salud' ? '$1,000 MXN' : data.tipo === 'auto' ? '$500 MXN' : '$300 MXN',
    data.ciudad || '', now, now, data.notas || ''
  ];

  appendRow(SHEETS.prospectos, values);
  return { success: true, folio, id: id + 1 };
}

// ═══════════════════════════════════════════════════
// POST — ACTUALIZAR ESTATUS PROSPECTO
// ═══════════════════════════════════════════════════
function updateEstatus(data) {
  // Columna 8 = Estatus, Columna 12 = Fecha Última Actualización
  const rowNum = findRow(SHEETS.prospectos, 2, data.folio); // col 2 = Folio
  if (rowNum === -1) return { error: 'Folio no encontrado' };

  const sheet = getSheet(SHEETS.prospectos);
  sheet.getRange(rowNum, 8).setValue(data.estatus);
  sheet.getRange(rowNum, 12).setValue(new Date().toISOString().split('T')[0]);

  return { success: true, folio: data.folio, nuevo_estatus: data.estatus };
}

// ═══════════════════════════════════════════════════
// POST — CREAR TRANSACCIÓN
// ═══════════════════════════════════════════════════
function createTransaccion(data) {
  const sheet   = getSheet(SHEETS.transacciones);
  const id      = 'TXN-' + String(sheet.getLastRow() - 1).padStart(4, '0');
  const now     = new Date().toISOString().split('T')[0];

  const kinsurer = getKinsurerByID(data.kinsurerID);
  const clabe    = kinsurer['CLABE Bancaria'] || '';

  const values = [
    id, data.kinsurerID, data.prospectoID, data.folio,
    data.tipo, data.monto, 'Pendiente', now, clabe, 'KS-' + Date.now().toString().slice(-6)
  ];

  appendRow(SHEETS.transacciones, values);
  return { success: true, txn_id: id };
}

// ═══════════════════════════════════════════════════
// POST — ACTUALIZAR FORMACIÓN
// ═══════════════════════════════════════════════════
function updateFormacion(data) {
  const rowNum = findRow(SHEETS.formacion, 1, data.kinsurerID);
  if (rowNum === -1) return { error: 'Kinsurer no encontrado en Formación' };

  const sheet = getSheet(SHEETS.formacion);
  // Columnas: 3=Nivel, 4=MisionesCompletadas, 5=QuizScore, 7=FechaCertificacion

  if (data.nivel)              sheet.getRange(rowNum, 3).setValue(data.nivel);
  if (data.misionesCompletadas !== undefined) sheet.getRange(rowNum, 4).setValue(data.misionesCompletadas);
  if (data.quizScore)          sheet.getRange(rowNum, 5).setValue(data.quizScore);
  if (data.fechaCertificacion) sheet.getRange(rowNum, 7).setValue(data.fechaCertificacion);
  if (data.progreso)           sheet.getRange(rowNum, 9).setValue(data.progreso);

  return { success: true, kinsurerID: data.kinsurerID };
}

// ═══════════════════════════════════════════════════
// POST — ACTUALIZAR PERFIL
// ═══════════════════════════════════════════════════
function updatePerfil(data) {
  const rowNum = findRow(SHEETS.kinsurers, 1, data.kinsurerID);
  if (rowNum === -1) return { error: 'Kinsurer no encontrado' };

  const sheet = getSheet(SHEETS.kinsurers);
  if (data.clabe)   sheet.getRange(rowNum, 5).setValue(data.clabe);
  if (data.banco)   sheet.getRange(rowNum, 6).setValue(data.banco);
  if (data.nivel)   sheet.getRange(rowNum, 7).setValue(data.nivel);
  if (data.estatus) sheet.getRange(rowNum, 10).setValue(data.estatus);

  return { success: true };
}

// ═══════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════
function parseMXN(str) {
  if (typeof str === 'number') return str;
  return parseFloat(String(str).replace(/[$,\sMXN]/g, '')) || 0;
}

function formatMXN(num) {
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' MXN';
}

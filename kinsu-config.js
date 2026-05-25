/**
 * KINSU — Configuración de conexión con Google Sheets (Versión Máxima V1.7 - Producción)
 * * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Abre este archivo en tu repositorio de GitHub Pages.
 * 2. Selecciona todo el contenido anterior y bórralo.
 * 3. Pega todo este bloque de código limpio.
 * 4. Asegúrate de mantener tu URL de Apps Script en la constante APPS_SCRIPT_URL.
 * 5. Guarda los cambios haciendo clic en "Commit changes".
 */

const KINSU_CONFIG = {
  // URL centralizada de tu aplicación web de Google Apps Script
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyEQcXcLxCbNXWTBiDTL0K-cd4KjPK0WcC-HyDDAHKa_p6d9M3jyUdsre7AfVBbb3h5_g/exec',

  // ID del Kinsurer demo de respaldo por si falla la sesión local
  DEFAULT_KINSURER_ID: 'KIN-0001',
};

// ═══════════════════════════════════════════════════
// API CLIENT — Motor de Conexión de Alta Fidelidad
// ═══════════════════════════════════════════════════
const KinsuAPI = {

  // Recupera de forma dinámica el identificador del usuario logueado en el navegador
  getKinsurerID() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.kinsurerID || KINSU_CONFIG.DEFAULT_KINSURER_ID;
  },

  // ── AUTENTICACIÓN Y SEGURIDAD ────────────────────────

  async checkEmail(email) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=checkEmail&email=${encodeURIComponent(email)}`;
    return this._get(url);
  },

  async sendOTP(email, nombre) {
    return this._post({ 
      action: 'sendOTP', 
      email: email, 
      nombre: nombre 
    });
  },

  async verifyOTP(email, otp) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=verifyOTP&email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
    return this._get(url);
  },

  async createKinsurer(data) {
    return this._post({ 
      action: 'createKinsurer', 
      data: data 
    });
  },

  async login(email, password) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&pwd=${encodeURIComponent(password)}`;
    return this._get(url);
  },

  // ── CONSULTAS GENERALES (GET) ─────────────────────────

  async getDashboard() {
    const id  = this.getKinsurerID();
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getDashboard&id=${id}`;
    return this._get(url);
  },

  async getProspectos() {
    const id  = this.getKinsurerID();
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getProspectos&id=${id}`;
    return this._get(url);
  },

  async getProspecto(folio) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getProspecto&id=${folio}`;
    return this._get(url);
  },

  async getGanancias() {
    const id  = this.getKinsurerID();
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getGanancias&id=${id}`;
    return this._get(url);
  },

  async getPerfil() {
    const id  = this.getKinsurerID();
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getPerfil&id=${id}`;
    return this._get(url);
  },

  async getFormacion() {
    const id  = this.getKinsurerID();
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getFormacion&id=${id}`;
    return this._get(url);
  },

  // ── ACTUALIZACIONES Y REGISTROS (POST) ────────────────

  async createProspecto(data) {
    return this._post({
      action: 'createProspecto',
      data: { ...data, kinsurerID: this.getKinsurerID() }
    });
  },

  async updateProspectoEstatus(folio, estatus) {
    return this._post({
      action: 'updateEstatus',
      data: { folio, estatus }
    });
  },

  // 🔥 PERSISTENCIA INTERACTIVA EN BD (Sincronización del Plan de 15 Días)
  async updateProspectoNotes(folio, nuevasNotas) {
    return this._post({
      action: 'updateProspectoNotes',
      data: { 
        folio: folio, 
        notas: nuevasNotas 
      }
    });
  },

  async createTransaccion(data) {
    return this._post({
      action: 'createTransaccion',
      data: { ...data, kinsurerID: this.getKinsurerID() }
    });
  },

  async updateFormacion(data) {
    return this._post({
      action: 'updateFormacion',
      data: { ...data, kinsurerID: this.getKinsurerID() }
    });
  },

  async updatePerfil(data) {
    return this._post({
      action: 'updatePerfil',
      data: { ...data, kinsurerID: this.getKinsurerID() }
    });
  },

  // ── ENRUTADORES AUXILIARES HTTP REUTILIZABLES ─────────

  async _get(url) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.warn('[KinsuAPI] Error en proceso de consulta GET:', err.message);
      return null;
    }
  },

  async _post(body) {
    try {
      // Usamos de forma obligatoria 'text/plain' para evadir las políticas de Preflight OPTIONS
      // que causan bloqueos de CORS en los servidores estáticos de Google Apps Script.
      const res  = await fetch(KINSU_CONFIG.APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(body),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.warn('[KinsuAPI] Error en proceso de transmisión POST:', err.message);
      return null;
    }
  },
};

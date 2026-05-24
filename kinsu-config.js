/**
 * KINSU — Configuración de conexión con Google Sheets
 * * INSTRUCCIONES:
 * 1. Después de instalar el Apps Script, copia la URL de implementación
 * 2. Pégala en APPS_SCRIPT_URL abajo
 * 3. Sube este archivo a GitHub junto con los demás HTMLs
 * 4. Todos los HTMLs lo cargan automáticamente
 */

const KINSU_CONFIG = {
  // URL de Apps Script después de implementar
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyEQcXcLxCbNXWTBiDTL0K-cd4KjPK0WcC-HyDDAHKa_p6d9M3jyUdsre7AfVBbb3h5_g/exec',

  // ID del Kinsurer demo (se reemplaza con el login real)
  DEFAULT_KINSURER_ID: 'KIN-0001',
};

// ═══════════════════════════════════════════════════
// API CLIENT — funciones que usan todos los HTMLs
// ═══════════════════════════════════════════════════
const KinsuAPI = {

  // Obtiene el kinsurerID del usuario logueado
  getKinsurerID() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.kinsurerID || KINSU_CONFIG.DEFAULT_KINSURER_ID;
  },

  // ── AUTH ─────────────────────────────────────────

  async checkEmail(email) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=checkEmail&email=${encodeURIComponent(email)}`;
    return this._get(url);
  },

  async sendOTP(email, nombre) {
    return this._post({
      action: 'sendOTP',
      data: { email, nombre }
    });
  },

  async verifyOTP(email, otp) {
    return this._post({
      action: 'verifyOTP',
      data: { email, otp }
    });
  },

  async login(email, password) {
    return this._post({
      action: 'login',
      data: { email, password }
    });
  },

  // ── PROSPECTOS ───────────────────────────────────

  async getProspectos() {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getProspectos&kinsurerID=${this.getKinsurerID()}`;
    return this._get(url);
  },

  async getProspecto(folio) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=getProspecto&folio=${folio}`;
    return this._get(url);
  },

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

  /**
   * ACTUALIZA LAS NOTAS / PLAN DE SEGUIMIENTO EN LA BD PIVOTE
   * Envía de forma segura el folio y el string concatenado al Apps Script.
   */
  async updateProspectoNotes(folio, nuevasNotas) {
    return this._post({
      action: 'updateProspectoNotes',
      data: { 
        folio: folio, 
        notas: nuevasNotas 
      }
    });
  },

  // ── OTROS ────────────────────────────────────────

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

  // ── HTTP helpers ─────────────────────────────────

  async _get(url) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.warn('[KinsuAPI] Error GET:', err.message);
      return null;
    }
  },

  async _post(body) {
    try {
      // Usamos text/plain para evitar el preflight CORS de Apps Script
      // Apps Script no maneja OPTIONS requests con application/json
      const res  = await fetch(KINSU_CONFIG.APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('[KinsuAPI] Error POST:', err.message);
      return { error: err.message };
    }
  }
};

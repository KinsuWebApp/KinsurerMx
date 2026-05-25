/**
 * KINSU — Configuración de conexión con Google Sheets
 */

const KINSU_CONFIG = {
  // ⚠️ TU URL ACTUALIZADA DE APPS SCRIPT (Mantenemos la tuya)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyEQcXcLxCbNXWTBiDTL0K-cd4KjPK0WcC-HyDDAHKa_p6d9M3jyUdsre7AfVBbb3h5_g/exec',
  DEFAULT_KINSURER_ID: 'KIN-0001',
};

const KinsuAPI = {

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
    return this._post({ action: 'sendOTP', email, nombre });
  },

  async verifyOTP(email, otp) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=verifyOTP&email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
    return this._get(url);
  },

  async createKinsurer(data) {
    return this._post({ action: 'createKinsurer', data });
  },

  async login(email, password) {
    const url = `${KINSU_CONFIG.APPS_SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&pwd=${encodeURIComponent(password)}`;
    return this._get(url);
  },

  // ── GET ──────────────────────────────────────────

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

  // ── POST ─────────────────────────────────────────

  async createProspecto(data) {
    return this._post({
      action: 'createProspecto',
      data: { ...data, kinsurerID: this.getKinsurerID() }
    });
  },

  async updateEstatus(folio, estatus) {
    return this._post({
      action: 'updateEstatus',
      data: { folio, estatus }
    });
  },

  // 🔥 SOLUCIÓN DEFINITIVA DE CONEXIÓN DEL EXPEDIENTE COMERCIAL:
  async updateProspectoNotes(folio, nuevasNotas) {
    return this._post({
      action: 'updateProspectoNotes',
      data: { folio: folio, notas: nuevasNotas }
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
      console.warn('[KinsuAPI] Error POST:', err.message);
      return null;
    }
  },
};

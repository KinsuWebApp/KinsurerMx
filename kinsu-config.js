/**
 * KINSU — Configuración de conexión con Google Sheets
 * 
 * INSTRUCCIONES:
 * 1. Después de instalar el Apps Script, copia la URL de implementación
 * 2. Pégala en APPS_SCRIPT_URL abajo
 * 3. Sube este archivo a GitHub junto con los demás HTMLs
 * 4. Todos los HTMLs lo cargan automáticamente
 */

const KINSU_CONFIG = {
  // ← PEGA AQUÍ tu URL de Apps Script después de implementar
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyj22qh-5SNLQxF9f2b7_4AWJQtjDGwLL_KtxTTKVyiQzojGVUOGODcf-0yxw98tpbbfw/exec',

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
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.warn('[KinsuAPI] Error POST:', err.message);
      return null;
    }
  },
};

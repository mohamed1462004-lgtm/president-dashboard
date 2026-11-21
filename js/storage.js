const Storage = {
  key: 'enactus_hub_v1',

  async load() {
    try { return JSON.parse(localStorage.getItem(this.key)); }
    catch (e) { return null; }
  },

  async save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },

  exportJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'enactus-hub-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
};
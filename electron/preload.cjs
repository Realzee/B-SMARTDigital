const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('bsmartElectron', {
  isElectron: true,
  platform: process.platform,
});

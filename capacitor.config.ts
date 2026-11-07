import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.obdcool.app',
  appName: 'OBD COOL',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Buscando ELM327…',
        cancel: 'Cancelar',
        availableDevices: 'Dispositivos disponibles',
        noDeviceFound: 'No se encontró ningún ELM327. Revisa que esté encendido y cerca.',
      },
    },
  },
}

export default config

import { Platform } from 'react-native';

/**
 * ==============================================================================
 * MOBILE APP NETWORKING EXPLANATION (EMULATORS vs PHYSICAL DEVICES)
 * ==============================================================================
 *
 * 1. LOCALHOST DOES NOT WORK ON MOBILE DEVICES:
 *    - On a physical phone or an Android emulator, 'localhost' or '127.0.0.1'
 *      refers to the loopback interface OF THE MOBILE DEVICE ITSELF, not your
 *      development computer running the backend server!
 *
 * 2. ANDROID EMULATOR NETWORKING:
 *    - The official Android emulator runs inside QEMU and uses a virtual router.
 *    - The development host machine is mapped to special IP: http://10.0.2.2:5000/api
 *
 * 3. PHYSICAL DEVICE (EXPO GO OVER WI-FI):
 *    - The mobile phone and your computer must be connected to the SAME Wi-Fi network.
 *    - The app connects to your computer's local Area Network (LAN) IPv4 address,
 *      e.g., http://10.104.220.54:5000/api (or whatever your Wi-Fi router assigned).
 *
 * 4. IOS SIMULATOR / WEB:
 *    - The iOS Simulator shares the host network interface directly, so
 *      http://localhost:5000/api works on iOS simulator and browser preview.
 * ==============================================================================
 */

// Host machine's active LAN Wi-Fi IP detected from your environment
export const DEFAULT_LAN_IP = '10.104.220.54';
export const DEFAULT_PORT = '5000';

export const getDefaultBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    // By default for Expo development, we default to the LAN IP so it works
    // seamlessly on both physical devices via Expo Go AND Android emulators.
    return `http://${DEFAULT_LAN_IP}:${DEFAULT_PORT}/api`;
  }
  if (Platform.OS === 'ios') {
    return `http://localhost:${DEFAULT_PORT}/api`;
  }
  return `http://localhost:${DEFAULT_PORT}/api`;
};

// Global in-memory override that can be customized at runtime by the user
let currentBaseUrl: string = getDefaultBaseUrl();

export const getApiBaseUrl = (): string => currentBaseUrl;

export const setApiBaseUrl = (url: string): void => {
  let cleaned = url.trim();
  // Ensure trailing slash is removed
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  // Ensure /api suffix exists
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  currentBaseUrl = cleaned;
};

export const PRESET_URLS = [
  {
    label: 'Physical Phone (Wi-Fi LAN)',
    url: `http://${DEFAULT_LAN_IP}:${DEFAULT_PORT}/api`,
    description: 'Use when testing with Expo Go on your actual phone over Wi-Fi',
  },
  {
    label: 'Android Emulator',
    url: `http://10.0.2.2:${DEFAULT_PORT}/api`,
    description: 'Standard Android Studio emulator host alias',
  },
  {
    label: 'Localhost (Web / iOS)',
    url: `http://localhost:${DEFAULT_PORT}/api`,
    description: 'Use for Web browser or iOS simulator',
  },
];

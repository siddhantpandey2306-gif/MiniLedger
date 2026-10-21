import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../types/api';

const TOKEN_KEY = 'miniledger_auth_token';
const USER_KEY = 'miniledger_user_profile';
const BASE_URL_KEY = 'miniledger_custom_base_url';

// In-memory fallback for environments where SecureStore isn't available (e.g. web preview)
const memoryStorage: Record<string, string> = {};

const isSecureStoreAvailable = (): boolean => {
  return Platform.OS === 'android' || Platform.OS === 'ios';
};

export const StorageService = {
  async saveToken(token: string): Promise<void> {
    try {
      if (isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        memoryStorage[TOKEN_KEY] = token;
      }
    } catch (error) {
      console.warn('[StorageService] Error saving token to SecureStore:', error);
      memoryStorage[TOKEN_KEY] = token;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (isSecureStoreAvailable()) {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
      return memoryStorage[TOKEN_KEY] || null;
    } catch (error) {
      console.warn('[StorageService] Error reading token from SecureStore:', error);
      return memoryStorage[TOKEN_KEY] || null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (isSecureStoreAvailable()) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      delete memoryStorage[TOKEN_KEY];
    } catch (error) {
      console.warn('[StorageService] Error deleting token from SecureStore:', error);
      delete memoryStorage[TOKEN_KEY];
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      const serialized = JSON.stringify(user);
      if (isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(USER_KEY, serialized);
      } else {
        memoryStorage[USER_KEY] = serialized;
      }
    } catch (error) {
      console.warn('[StorageService] Error saving user to SecureStore:', error);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      let raw: string | null = null;
      if (isSecureStoreAvailable()) {
        raw = await SecureStore.getItemAsync(USER_KEY);
      } else {
        raw = memoryStorage[USER_KEY] || null;
      }
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('[StorageService] Error reading user from SecureStore:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      if (isSecureStoreAvailable()) {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
      delete memoryStorage[USER_KEY];
    } catch (error) {
      console.warn('[StorageService] Error removing user from SecureStore:', error);
    }
  },

  async saveCustomBaseUrl(url: string): Promise<void> {
    try {
      if (isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(BASE_URL_KEY, url);
      }
      memoryStorage[BASE_URL_KEY] = url;
    } catch (error) {
      console.warn('[StorageService] Error saving base URL:', error);
      memoryStorage[BASE_URL_KEY] = url;
    }
  },

  async getCustomBaseUrl(): Promise<string | null> {
    try {
      if (isSecureStoreAvailable()) {
        return await SecureStore.getItemAsync(BASE_URL_KEY);
      }
      return memoryStorage[BASE_URL_KEY] || null;
    } catch (error) {
      return memoryStorage[BASE_URL_KEY] || null;
    }
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  },
};

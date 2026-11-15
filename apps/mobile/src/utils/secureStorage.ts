/**
 * M1.2: Secure Storage Utilities
 */

import * as SecureStore from 'expo-secure-store';

/**
 * Store sensitive data securely (encrypted)
 */
export async function storeSecure(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Failed to store ${key}:`, error);
    throw error;
  }
}

/**
 * Retrieve sensitive data securely
 */
export async function getSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Failed to get ${key}:`, error);
    return null;
  }
}

/**
 * Delete sensitive data
 */
export async function deleteSecure(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
  }
}

/**
 * Store object securely (JSON serialized)
 */
export async function storeSecureObject<T>(key: string, value: T): Promise<void> {
  await storeSecure(key, JSON.stringify(value));
}

/**
 * Retrieve object securely (JSON deserialized)
 */
export async function getSecureObject<T>(key: string): Promise<T | null> {
  const value = await getSecure(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return null;
  }
}

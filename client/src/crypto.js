// Browser-native Web Crypto E2E encryption helpers
// Key is derived from the room name via PBKDF2 — stable across refreshes,
// no key exchange needed, server never sees plaintext.

const SALT = new TextEncoder().encode('chatapp-e2e-salt-v1');
const PBKDF2_ITERATIONS = 100000;

// Derive a stable AES-GCM 256-bit key from the room name
export async function deriveRoomKey(roomName) {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(roomName),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext string → base64 ciphertext (12-byte IV prepended)
export async function encryptMessage(key, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

// Decrypt base64 ciphertext → plaintext string
export async function decryptMessage(key, b64) {
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

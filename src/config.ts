// Firebase connection settings.
// These values are designed to be public (they only say *which* database to use).
// The data itself is protected by the security rules in firestore.rules:
// only the owner account can change anything; everyone else can only read.
export const FIREBASE_CONFIG: Record<string, string> | null = null;

// The Firebase "User UID" of the owner account (Authentication → Users).
export const OWNER_UID = '';

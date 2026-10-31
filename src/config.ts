// Firebase connection settings.
// These values are designed to be public (they only say *which* database to use).
// The data itself is protected by the security rules in firestore.rules:
// only the owner account can change anything; everyone else can only read.
export const FIREBASE_CONFIG: Record<string, string> | null = {
  apiKey: 'AIzaSyBKbTdLRijz9-1KoOvmZRjjKTse8PLBwVM',
  authDomain: 'hogwarts-f600e.firebaseapp.com',
  projectId: 'hogwarts-f600e',
  storageBucket: 'hogwarts-f600e.firebasestorage.app',
  messagingSenderId: '1004989999913',
  appId: '1:1004989999913:web:a142c4237d716435386538',
};

// The Firebase "User UID" of the owner account (Authentication → Users).
export const OWNER_UID = 'hDqKKGELFzZuMvSwlTlYio4q56i1';

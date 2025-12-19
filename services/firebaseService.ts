import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  addDoc,
  Timestamp,
  QueryConstraint 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebaseConfig';
import { GeneratedCode, HistoryItem } from '../types';

// Firestore Collections
export const COLLECTIONS = {
  GENERATED_CODE: 'generatedCode',
  HISTORY: 'history',
  USERS: 'users',
} as const;

// Save generated code to Firestore
export const saveGeneratedCode = async (
  userId: string,
  code: GeneratedCode,
  metadata?: {
    sectionName?: string;
    userGuidance?: string;
    imageUrl?: string;
  }
): Promise<string> => {
  try {
    const codeRef = doc(collection(db, COLLECTIONS.GENERATED_CODE));
    await setDoc(codeRef, {
      userId,
      html: code.html,
      css: code.css,
      javascript: code.javascript,
      sectionName: metadata?.sectionName || '',
      userGuidance: metadata?.userGuidance || '',
      imageUrl: metadata?.imageUrl || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return codeRef.id;
  } catch (error) {
    console.error('Error saving generated code:', error);
    throw error;
  }
};

// Get generated code by ID
export const getGeneratedCode = async (codeId: string): Promise<GeneratedCode | null> => {
  try {
    const codeRef = doc(db, COLLECTIONS.GENERATED_CODE, codeId);
    const codeSnap = await getDoc(codeRef);
    
    if (codeSnap.exists()) {
      const data = codeSnap.data();
      return {
        html: data.html,
        css: data.css,
        javascript: data.javascript,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting generated code:', error);
    throw error;
  }
};

// Save history item
export const saveHistoryItem = async (
  userId: string,
  historyItem: HistoryItem
): Promise<string> => {
  try {
    const historyRef = doc(collection(db, COLLECTIONS.HISTORY));
    await setDoc(historyRef, {
      userId,
      ...historyItem,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return historyRef.id;
  } catch (error) {
    console.error('Error saving history item:', error);
    throw error;
  }
};

// Get user's history
export const getUserHistory = async (userId: string): Promise<HistoryItem[]> => {
  try {
    const historyQuery = query(
      collection(db, COLLECTIONS.HISTORY),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(historyQuery);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        sectionName: data.sectionName,
        userGuidance: data.userGuidance,
        code: data.code,
        timestamp: data.createdAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error getting user history:', error);
    throw error;
  }
};

// Delete history item
export const deleteHistoryItem = async (historyId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.HISTORY, historyId));
  } catch (error) {
    console.error('Error deleting history item:', error);
    throw error;
  }
};

// Upload image to Firebase Storage
export const uploadImage = async (
  file: File,
  path: string = 'uploads'
): Promise<string> => {
  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Delete image from Firebase Storage
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};


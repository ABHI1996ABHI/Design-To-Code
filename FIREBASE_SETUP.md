# Firebase Setup Guide

This project is configured to use Firebase for data persistence, authentication, and file storage.

## Prerequisites

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - **Firestore Database** (for storing generated code and history)
   - **Storage** (for storing uploaded images)
   - **Authentication** (optional, for user management)

## Installation

Install Firebase SDK:

```bash
npm install firebase
```

## Configuration

1. Get your Firebase configuration from the Firebase Console:
   - Go to Project Settings → General
   - Scroll down to "Your apps" section
   - Click on the web app icon (</>) or create a new web app
   - Copy the configuration values

2. Update `.env.local` with your Firebase credentials:

```env
# Existing Gemini API Key
GEMINI_API_KEY=your_gemini_api_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Firestore Security Rules

Set up Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own data
    match /generatedCode/{codeId} {
      allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    match /history/{historyId} {
      allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && userId == request.auth.uid;
    }
  }
}
```

## Storage Security Rules

Set up Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Usage

The Firebase services are available through:

- `services/firebaseConfig.ts` - Firebase initialization and exports
- `services/firebaseService.ts` - Helper functions for Firestore and Storage operations

### Example Usage

```typescript
import { saveGeneratedCode, getUserHistory } from './services/firebaseService';
import { auth } from './services/firebaseConfig';

// Save generated code
const codeId = await saveGeneratedCode(
  auth.currentUser?.uid || 'anonymous',
  {
    html: '<div>...</div>',
    css: '<style>...</style>',
    javascript: '<script>...</script>'
  },
  {
    sectionName: 'Hero Section',
    userGuidance: 'Create a modern hero section'
  }
);

// Get user history
const history = await getUserHistory(auth.currentUser?.uid || 'anonymous');
```

## Restart Development Server

After updating `.env.local`, restart your development server:

```bash
npm run dev
```


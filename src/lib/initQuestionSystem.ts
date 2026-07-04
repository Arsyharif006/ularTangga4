// ============================================================
// Question System Initializer
// ============================================================

import { initializeQuestionCache } from './questionCache';

let initialized = false;

export async function initializeQuestionSystem(): Promise<void> {
  if (initialized) return;
  
  try {
    await initializeQuestionCache();
    initialized = true;
    console.log('Question system initialized');
  } catch (error) {
    console.error('Error initializing question system:', error);
    // Tetap lanjut meski fail - akan gunakan static questions
    initialized = true;
  }
}

// Call this once at app startup (from layout atau setup page)
export function ensureQuestionSystemInitialized(): void {
  if (!initialized) {
    // Non-blocking initialization
    initializeQuestionSystem().catch(err => {
      console.error('Failed to initialize question system:', err);
    });
  }
}

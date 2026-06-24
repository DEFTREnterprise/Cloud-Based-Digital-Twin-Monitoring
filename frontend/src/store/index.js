import { configureStore } from '@reduxjs/toolkit';
import apiKeyReducer from './slices/apiKeySlice';
import { apiKeyPersistenceMiddleware } from './middleware/apiKeyPersistence';

export const store = configureStore({
  reducer: {
    apiKey: apiKeyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(apiKeyPersistenceMiddleware),
});

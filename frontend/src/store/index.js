import { configureStore } from '@reduxjs/toolkit';
import apiKeyReducer from './slices/apiKeySlice';
import authReducer from './slices/authSlice';
import { apiKeyPersistenceMiddleware } from './middleware/apiKeyPersistence';

export const store = configureStore({
  reducer: {
    apiKey: apiKeyReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(apiKeyPersistenceMiddleware),
});
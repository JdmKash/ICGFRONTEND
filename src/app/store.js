import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { combineReducers } from 'redux';

import userReducer from "../features/userSlice";
import messageReducer from "../features/messageSlice";
import calculateReducer from "../features/calculateSlice";
import coinShowReducer from "../features/coinShowSlice";
import topUsersReducer from "../features/topUsersSlice";
import balanceReducer from "../features/balanceSlice";

// Configure persistence for specific reducers
const userPersistConfig = {
  key: 'user',
  storage,
  whitelist: ['value'] // only persist the 'value' field of userSlice
};

const balancePersistConfig = {
  key: 'balance',
  storage,
  whitelist: ['value', 'lastUpdated'] // persist both balance value and lastUpdated timestamp
};

// Create root reducer with persistence
const rootReducer = combineReducers({
  user: persistReducer(userPersistConfig, userReducer),
  balance: persistReducer(balancePersistConfig, balanceReducer),
  message: messageReducer,
  calculate: calculateReducer,
  coinShow: coinShowReducer,
  topUsers: topUsersReducer,
});

// Configure the store with the persisted reducer
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types since they might contain non-serializable values
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { combineReducers } from 'redux';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';

import userReducer from "../features/userSlice";
import messageReducer from "../features/messageSlice";
import calculateReducer from "../features/calculateSlice";
import coinShowReducer from "../features/coinShowSlice";
import topUsersReducer from "../features/topUsersSlice";
import balanceReducer from "../features/balanceSlice";

// Configure persistence for all reducers
const userPersistConfig = {
  key: 'user',
  storage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['value'] // only persist the 'value' field of userSlice
};

const balancePersistConfig = {
  key: 'balance',
  storage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['value', 'lastUpdated'] // persist both balance value and lastUpdated timestamp
};

const calculatePersistConfig = {
  key: 'calculate',
  storage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['value'] // persist mining calculation data
};

const topUsersPersistConfig = {
  key: 'topUsers',
  storage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['value'] // persist leaderboard data
};

const coinShowPersistConfig = {
  key: 'coinShow',
  storage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['value'] // persist coin animation state
};

// Create root reducer with persistence for all important slices
const rootReducer = combineReducers({
  user: persistReducer(userPersistConfig, userReducer),
  balance: persistReducer(balancePersistConfig, balanceReducer),
  message: messageReducer, // No need to persist transient messages
  calculate: persistReducer(calculatePersistConfig, calculateReducer),
  coinShow: persistReducer(coinShowPersistConfig, coinShowReducer),
  topUsers: persistReducer(topUsersPersistConfig, topUsersReducer),
});

// Configure the store with the persisted reducer
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types since they might contain non-serializable values
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.miningStartedTime', 'meta.arg.miningStartedTime'],
        // Ignore these paths in the state
        ignoredPaths: [
          'user.value.miningStartedTime',
          'user.value.daily.claimedTime',
          'calculate.value.miningStartedTime'
        ],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

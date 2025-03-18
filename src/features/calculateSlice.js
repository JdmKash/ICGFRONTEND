import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: {
    miningStartedTime: null,
    mined: 0,
    progress: 0,
    remainingTime: { hours: 0, minutes: 0, seconds: 0 },
    canClaim: false,
    canUpgrade: false
  },
};

export const calculateSlice = createSlice({
  name: "calculate",
  initialState,
  reducers: {
    setCalculated: (state, action) => {
      state.value = action.payload;
    },
    startMining: (state, action) => {
      const { miningStartedTime } = action.payload;
      state.value = {
        ...state.value,
        miningStartedTime,
        mined: 0,
        progress: 0,
        remainingTime: { hours: 6, minutes: 0, seconds: 0 },
        canClaim: false
      };
    },
    stopMining: (state) => {
      state.value = {
        ...state.value,
        miningStartedTime: null,
        progress: 0,
        remainingTime: { hours: 0, minutes: 0, seconds: 0 },
        canClaim: false
      };
    },
    resetMining: (state) => {
      state.value = {
        ...state.value,
        miningStartedTime: null,
        mined: 0,
        progress: 0,
        remainingTime: { hours: 0, minutes: 0, seconds: 0 },
        canClaim: false
      };
    }
  },
});

export const { setCalculated, startMining, stopMining, resetMining } = calculateSlice.actions;

export const selectCalculated = (state) => state.calculate.value;
export const selectCalculate = (state) => state.calculate.value;

export default calculateSlice.reducer;

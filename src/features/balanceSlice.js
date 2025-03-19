import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: 0,
  lastUpdated: null,
};

export const balanceSlice = createSlice({
  name: "balance",
  initialState,
  reducers: {
    setBalance: (state, action) => {
      state.value = action.payload;
      state.lastUpdated = Date.now();
    },
    updateBalance: (state, action) => {
      state.value = action.payload;
      state.lastUpdated = Date.now();
    },
  },
});

export const { setBalance, updateBalance } = balanceSlice.actions;

export const selectBalance = (state) => state.balance.value;
export const selectBalanceLastUpdated = (state) => state.balance.lastUpdated;

export default balanceSlice.reducer;

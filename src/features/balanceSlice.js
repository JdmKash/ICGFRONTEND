import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: 0,
  lastUpdated: null
};

export const balanceSlice = createSlice({
  name: "balance",
  initialState,
  reducers: {
    updateBalance: (state, action) => {
      state.value = action.payload;
      state.lastUpdated = Date.now();
    },
  },
});

export const { updateBalance } = balanceSlice.actions;

export const selectBalance = (state) => state.balance.value;

export default balanceSlice.reducer;

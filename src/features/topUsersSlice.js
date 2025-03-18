import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: [],
  lastUpdated: null
};

export const topUsersSlice = createSlice({
  name: "topUsers",
  initialState,
  reducers: {
    setTopUsers: (state, action) => {
      state.value = action.payload;
      state.lastUpdated = Date.now();
    },
  },
});

export const { setTopUsers } = topUsersSlice.actions;

export const selectTopUsers = (state) => state.topUsers.value;

export default topUsersSlice.reducer;

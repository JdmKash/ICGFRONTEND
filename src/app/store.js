import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/userSlice";
import messagereducer from "../features/messageSlice";
import calculaterReducer from "../features/calculateSlice";
import coinShowReducer from "../features/coinShowSlice";
import topUsersReducer from "../features/topUsersSlice" ;

export const store = configureStore({
     reducer: {
        user: userReducer,
        message: messagereducer,
        calculate: calculaterReducer,
        coinShow: coinShowReducer,
        topUsers: topUsersReducer
    },
});
// App.js
import React, { useEffect } from "react";
import "./App.css";
import { collection } from "firebase/firestore";
import { db } from "./firebase";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "./features/userSlice";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./Screens/Home";
import Daily from "./Screens/Daily";
import Earn from "./Screens/Earn";
import AirDrops from "./Screens/airdrops";
import Refferals from "./Screens/refferals";
import CoinAnimation from "./Components/CoinAnimation";
import { selectShowMessage, setShowMessage } from "./features/messageSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectCoinShow } from "./features/coinShowSlice";
import BottomNavigation from "./Components/BottomNavigation";
import { setCalculated } from "./features/calculateSlice";

// Simple calculate component included directly to avoid import issues
const CalculateNumsSimple = () => {
  const dispatch = useDispatch();

  // Immediately initialize calculate state with default values
  React.useEffect(() => {
    console.log("CalculateNumsSimple: Initializing calculate state with default values");
    dispatch(
      setCalculated({
        mined: 0,
        remainingTime: { hours: 6, minutes: 0, seconds: 0 },
        progress: 0,
        canClaim: false,
        canUpgrade: false,
        updateError: null,
      })
    );
  }, [dispatch]);

  return null;
};

function App() {
  const dispatch = useDispatch();
  const message = useSelector(selectShowMessage);
  const coinShow = useSelector(selectCoinShow);
  
  // Initialize default user and calculate state immediately
  useEffect(() => {
    // Create default user
    const defaultUserId = "default_user_" + Date.now();
    console.log("Creating default user with ID:", defaultUserId);
    
    dispatch(
      setUser({
        uid: defaultUserId,
        userImage: null,
        firstName: "Guest",
        lastName: "User",
        userName: "guest_user",
        languageCode: "en",
        referrals: {},
        referredBy: null,
        isPremium: false,
        balance: 0,
        mineRate: 0.001,
        isMining: false,
        miningStartedTime: null,
        daily: {
          claimedTime: null,
          claimedDay: 0,
        },
        links: {},
      })
    );
    
    // Initialize calculate state
    dispatch(
      setCalculated({
        mined: 0,
        remainingTime: { hours: 6, minutes: 0, seconds: 0 },
        progress: 0,
        canClaim: false,
        canUpgrade: false,
        updateError: null,
      })
    );
    
    // Try to connect to Firebase in the background
    try {
      collection(db, "users");
      console.log("Firebase connection initialized");
    } catch (error) {
      console.error("Firebase connection error:", error);
    }
  }, [dispatch]);

  useEffect(() => {
    if (message) {
      toast(message.message, {
        autoClose: 2500,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        closeButton: false,
      });
      dispatch(setShowMessage(null));
    }
  }, [message, dispatch]);

  return (
    <Router>
      <BottomNavigation />
      <>
        <CalculateNumsSimple />
        <ToastContainer
          style={{
            width: "calc(100% - 40px)", 
            maxWidth: "none",
            left: "20px",
            right: "20px",
            top: "20px",
            height: "20px",
          }}
          toastStyle={{
            minHeight: "20px",
            padding: "0px 10px",
            paddingBottom: "4px",
            backgroundColor:
              message?.color === "green"
                ? "#00c000"
                : message?.color === "blue"
                ? "#1d4ed8"
                : "red",
            color: "white",
            borderRadius: "6px",
            marginBottom: "4px",
          }}
        />
        <CoinAnimation showAnimation={coinShow} />
      </>
      <Routes>
        <Route path="*" element={<Home />} />
        <Route path="/" element={<Home />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/earn" element={<Earn />} />
        <Route path="/airdrops" element={<AirDrops />} />
        <Route path="/refferals" element={<Refferals />} />
      </Routes>
    </Router>
  );
}

export default App;

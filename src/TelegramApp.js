import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser, selectUser } from "./features/userSlice";
import { updateBalance } from "./features/balanceSlice";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Screens/Home";
import Daily from "./Screens/Daily";
import Earn from "./Screens/Earn";
import BottomNavigation from "./Components/BottomNavigation";
import CoinAnimation from "./Components/CoinAnimation";
import { selectCoinShow } from "./features/coinShowSlice";
import { selectMessage } from "./features/messageSlice";
import "./App.css";

function TelegramApp() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const coinShow = useSelector(selectCoinShow);
  const message = useSelector(selectMessage);
  const [showMessage, setShowMessage] = useState(false);

  // Improved Telegram user authentication
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const telegramUser = tg.initDataUnsafe.user;
      const userId = telegramUser.id.toString();
      
      console.log("Telegram user data:", telegramUser);
      
      // Create a proper user object from Telegram data
      const userObj = {
        uid: userId,
        userImage: telegramUser.photo_url || null,
        firstName: telegramUser.first_name || "Guest",
        lastName: telegramUser.last_name || "User",
        userName: telegramUser.username || "guest_user",
        languageCode: telegramUser.language_code || "en",
        referrals: {},
        referredBy: null,
        isPremium: false,
        balance: 100, // Default starting balance
        mineRate: 0.001,
        isMining: false,
        miningStartedTime: null,
        lastLogin: serverTimestamp()
      };
      
      // Check if user exists in Firestore
      const checkAndCreateUser = async () => {
        try {
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            // Create user in Firestore if doesn't exist
            await setDoc(userRef, userObj);
            console.log("Created new user in Firestore:", userId);
            
            // Set user in Redux
            dispatch(setUser(userObj));
            dispatch(updateBalance(userObj.balance));
          } else {
            // User exists, update lastLogin and get latest data
            const userData = userSnap.data();
            
            // Update lastLogin
            await updateDoc(userRef, {
              lastLogin: serverTimestamp()
            });
            
            // Update Redux with Firestore data to ensure consistency
            dispatch(setUser({
              ...userData,
              uid: userId // Ensure UID is correct
            }));
            
            // Update balance in Redux
            if (userData.balance !== undefined) {
              dispatch(updateBalance(userData.balance));
            }
            
            console.log("Updated existing user:", userId);
          }
        } catch (error) {
          console.error("Error checking/creating user:", error);
          
          // Fallback: still set user in Redux even if Firestore fails
          dispatch(setUser(userObj));
          dispatch(updateBalance(userObj.balance));
        }
      };
      
      checkAndCreateUser();
    } else {
      console.error("Telegram WebApp data not available, creating guest user");
      
      // Fallback for testing or when Telegram data is not available
      const guestId = "guest_" + Date.now().toString();
      const guestUser = {
        uid: guestId,
        userImage: null,
        firstName: "Guest",
        lastName: "User",
        userName: "guest_user",
        languageCode: "en",
        referrals: {},
        referredBy: null,
        isPremium: false,
        balance: 100,
        mineRate: 0.001,
        isMining: false,
        miningStartedTime: null
      };
      
      dispatch(setUser(guestUser));
      dispatch(updateBalance(guestUser.balance));
      
      // Also save guest user to Firestore for consistency
      const saveGuestUser = async () => {
        try {
          const userRef = doc(db, "users", guestId);
          await setDoc(userRef, guestUser);
        } catch (error) {
          console.error("Error saving guest user:", error);
        }
      };
      
      saveGuestUser();
    }
  }, [dispatch]);

  useEffect(() => {
    if (message.message) {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="App">
      {coinShow && <CoinAnimation />}
      {showMessage && (
        <div
          className="message"
          style={{ backgroundColor: message.color || "green" }}
        >
          {message.message}
        </div>
      )}
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/earn" element={<Earn />} />
        </Routes>
        <BottomNavigation />
      </Router>
    </div>
  );
}

export default TelegramApp;

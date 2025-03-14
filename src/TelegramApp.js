import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "./features/userSlice";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./Screens/Home";
import Daily from "./Screens/Daily";
import Earn from "./Screens/Earn";
import AirDrops from "./Screens/airdrops";
import Refferals from "./Screens/refferals";
import Loading from "./Screens/Loading";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { setTopUsers } from "./features/topUsersSlice";
import "./App.css";

// Telegram-specific App component with minimal dependencies for initial loading
function TelegramApp() {
  const dispatch = useDispatch();
  const [telegramUser, setTelegramUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [telegramInitialized, setTelegramInitialized] = useState(false);
  const [telegramError, setTelegramError] = useState(null);
  const [appStage, setAppStage] = useState("initializing"); // For debugging

  // Function to safely process Firestore timestamp fields
  const processTimestamp = (timestamp) => {
    return timestamp ? timestamp.toMillis() : null;
  };

  // Function to safely process links object
  const processLinks = (links) => {
    if (!links) return {};
    return Object.entries(links).reduce((acc, [key, value]) => {
      acc[key] = {
        ...value,
        time: processTimestamp(value.time),
      };
      return acc;
    }, {});
  };

  // Initialize Telegram WebApp with retry mechanism
  useEffect(() => {
    console.log("App initialization started");
    setAppStage("telegram-init-start");
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const initTelegram = () => {
      try {
        console.log("Attempting to initialize Telegram WebApp");
        
        // Check if Telegram WebApp is available
        if (window.Telegram && window.Telegram.WebApp) {
          const tg = window.Telegram.WebApp;
          console.log("Telegram WebApp found, calling ready()");
          tg.ready();
          
          // Get user data from Telegram
          if (tg?.initDataUnsafe?.user?.id) {
            const userId = tg.initDataUnsafe.user.id.toString();
            console.log("Telegram user identified:", userId);
            
            setTelegramUser({
              id: userId,
              firstName: tg?.initDataUnsafe?.user?.first_name || "User",
              lastName: tg?.initDataUnsafe?.user?.last_name || null,
              username: tg?.initDataUnsafe?.user?.username || null,
              languageCode: tg?.initDataUnsafe?.user?.language_code || "en",
            });
            
            // Set Telegram WebApp UI settings
            try {
              console.log("Setting Telegram UI properties");
              tg.expand();
              tg.setBackgroundColor("#0b0b0b");
              tg.setHeaderColor("#0b0b0b");
            } catch (uiError) {
              console.error("Error setting Telegram UI:", uiError);
              // Continue even if UI settings fail
            }
            
            setTelegramInitialized(true);
            setAppStage("telegram-init-success");
          } else {
            console.log("No Telegram user data, using fallback");
            // Fallback for testing outside Telegram
            setTelegramUser({
              id: "82424881123",
              firstName: "TestUser",
              lastName: null,
              username: "@testuser",
              languageCode: "en",
            });
            setTelegramInitialized(true);
            setAppStage("telegram-init-fallback");
          }
        } else {
          if (retryCount < maxRetries) {
            console.log(`Telegram WebApp not found, retrying (${retryCount + 1}/${maxRetries})...`);
            retryCount++;
            setTimeout(initTelegram, 1000); // Retry after 1 second
          } else {
            console.log("Telegram WebApp not available after retries, using fallback");
            setTelegramUser({
              id: "82424881123",
              firstName: "TestUser",
              lastName: null,
              username: "@testuser",
              languageCode: "en",
            });
            setTelegramInitialized(true);
            setAppStage("telegram-init-fallback-after-retry");
          }
        }
      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
        setTelegramError(error.message);
        
        // Fallback to ensure the app still works
        if (retryCount < maxRetries) {
          console.log(`Error in Telegram init, retrying (${retryCount + 1}/${maxRetries})...`);
          retryCount++;
          setTimeout(initTelegram, 1000); // Retry after 1 second
        } else {
          console.log("Using fallback after error in Telegram initialization");
          setTelegramUser({
            id: "82424881123",
            firstName: "TestUser",
            lastName: null,
            username: "@testuser",
            languageCode: "en",
          });
          setTelegramInitialized(true);
          setAppStage("telegram-init-error-fallback");
        }
      }
    };
    
    // Start initialization
    initTelegram();
  }, []);

  // Connect to Firestore once Telegram is initialized
  useEffect(() => {
    if (!telegramUser) return;
    
    console.log("Telegram user available, connecting to Firestore");
    setAppStage("firestore-connect");
    
    try {
      console.log("Setting up Firestore listener for user:", telegramUser.id);
      const unsubscribe = onSnapshot(
        doc(db, "users", telegramUser.id),
        async (docSnap) => {
          try {
            if (docSnap.exists()) {
              console.log("User document exists, updating Redux state");
              const userData = docSnap.data();
              
              dispatch(
                setUser({
                  uid: telegramUser.id,
                  userImage: userData.userImage,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  userName: userData.username,
                  languageCode: userData.languageCode,
                  referrals: userData.referrals,
                  referredBy: userData.referredBy,
                  isPremium: userData.isPremium,
                  balance: userData.balance,
                  mineRate: userData.mineRate,
                  isMining: userData.isMining,
                  miningStartedTime: processTimestamp(userData.miningStartedTime),
                  daily: {
                    claimedTime: processTimestamp(userData.daily?.claimedTime),
                    claimedDay: userData.daily?.claimedDay || 0,
                  },
                  links: processLinks(userData.links),
                })
              );
              
              setIsLoading(false);
              setAppStage("user-data-loaded");
            } else {
              console.log("User document doesn't exist, creating new user");
              try {
                await setDoc(doc(db, "users", telegramUser.id), {
                  firstName: telegramUser.firstName,
                  lastName: telegramUser.lastName,
                  username: telegramUser.username,
                  languageCode: telegramUser.languageCode,
                  referrals: {},
                  referredBy: null,
                  balance: 0,
                  mineRate: 0.001,
                  isMining: false,
                  miningStartedTime: null,
                  daily: {
                    claimedTime: null,
                    claimedDay: 0,
                  },
                  links: null,
                });
                
                console.log("New user created successfully");
                setIsLoading(false);
                setAppStage("new-user-created");
              } catch (createError) {
                console.error("Error creating new user:", createError);
                setIsLoading(false);
                setAppStage("user-creation-error");
              }
            }
          } catch (docError) {
            console.error("Error processing user document:", docError);
            setIsLoading(false);
            setAppStage("doc-processing-error");
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
          setIsLoading(false);
          setAppStage("firestore-listener-error");
        }
      );
      
      // Fetch top users in the background
      fetchTopUsers();
      
      return () => {
        console.log("Cleaning up Firestore listener");
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up Firestore connection:", error);
      setIsLoading(false);
      setAppStage("firestore-setup-error");
    }
  }, [telegramUser, dispatch]);

  // Fetch top users
  const fetchTopUsers = async () => {
    try {
      console.log("Fetching top users");
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("balance", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      
      const topUsers = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        balance: docSnap.data().balance,
        userImage: docSnap.data().userImage,
        firstName: docSnap.data().firstName,
        lastName: docSnap.data().lastName,
      }));
      
      dispatch(setTopUsers(topUsers));
      console.log("Top users fetched successfully");
    } catch (error) {
      console.error("Error fetching top users:", error);
    }
  };

  // Show error message if Telegram initialization failed
  if (telegramError && !telegramInitialized) {
    return (
      <div style={{ 
        padding: '20px', 
        color: 'white', 
        backgroundColor: '#0b0b0b',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h2>Initialization Error</h2>
        <p>There was a problem initializing the app: {telegramError}</p>
        <p>Current stage: {appStage}</p>
        <p>Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  // Simplified app structure with minimal conditional rendering
  return (
    <Router>
      <div className="app-container" style={{ backgroundColor: '#0b0b0b', minHeight: '100vh' }}>
        {/* Debug info - remove in production */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px', fontSize: '10px', zIndex: 9999 }}>
          Stage: {appStage} | Loading: {isLoading ? 'Yes' : 'No'} | TG Init: {telegramInitialized ? 'Yes' : 'No'}
        </div>
        
        <Routes>
          <Route path="*" element={<Loading stage={appStage} />} />
          <Route path="/" element={isLoading ? <Loading stage={appStage} /> : <Home />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/earn" element={<Earn />} />
          <Route path="/airdrops" element={<AirDrops />} />
          <Route path="/refferals" element={<Refferals />} />
        </Routes>
      </div>
    </Router>
  );
}

export default TelegramApp;

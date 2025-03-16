import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "./features/userSlice";
import { setBalance } from "./features/balanceSlice";
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

  // Function to save user data to localStorage
  const saveUserToLocalStorage = (user) => {
    if (!user) return;
    try {
      console.log("Saving user data to localStorage:", user.id);
      localStorage.setItem('telegramUserId', user.id);
      localStorage.setItem('telegramUserData', JSON.stringify({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        languageCode: user.languageCode
      }));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  // Function to get user data from localStorage
  const getUserFromLocalStorage = () => {
    try {
      const userId = localStorage.getItem('telegramUserId');
      const userData = localStorage.getItem('telegramUserData');
      
      if (userId && userData) {
        console.log("Retrieved user data from localStorage:", userId);
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error("Error retrieving from localStorage:", error);
      return null;
    }
  };

  // Initialize Telegram WebApp with retry mechanism
  useEffect(() => {
    console.log("App initialization started");
    setAppStage("telegram-init-start");
    
    let retryCount = 0;
    const maxRetries = 3;
    
    // First check if we have stored user data
    const storedUser = getUserFromLocalStorage();
    if (storedUser) {
      console.log("Using stored Telegram user data:", storedUser.id);
      setTelegramUser(storedUser);
      setTelegramInitialized(true);
      setAppStage("telegram-init-from-storage");
      return; // Skip Telegram initialization if we have stored data
    }
    
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
            
            const user = {
              id: userId,
              firstName: tg?.initDataUnsafe?.user?.first_name || "User",
              lastName: tg?.initDataUnsafe?.user?.last_name || null,
              username: tg?.initDataUnsafe?.user?.username || null,
              languageCode: tg?.initDataUnsafe?.user?.language_code || "en",
            };
            
            // Save user data to localStorage for persistence
            saveUserToLocalStorage(user);
            
            setTelegramUser(user);
            
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
            console.log("No Telegram user data, checking localStorage");
            
            // Try to get user from localStorage as a fallback
            const storedUser = getUserFromLocalStorage();
            if (storedUser) {
              console.log("Using stored Telegram user data as fallback");
              setTelegramUser(storedUser);
              setTelegramInitialized(true);
              setAppStage("telegram-init-storage-fallback");
              return;
            }
            
            // Last resort fallback for testing outside Telegram
            console.log("No stored user data, using test fallback");
            const testUser = {
              id: "82424881123",
              firstName: "TestUser",
              lastName: null,
              username: "@testuser",
              languageCode: "en",
            };
            
            // Only save test user to localStorage in development
            if (process.env.NODE_ENV === 'development') {
              saveUserToLocalStorage(testUser);
            }
            
            setTelegramUser(testUser);
            setTelegramInitialized(true);
            setAppStage("telegram-init-fallback");
          }
        } else {
          if (retryCount < maxRetries) {
            console.log(`Telegram WebApp not found, retrying (${retryCount + 1}/${maxRetries})...`);
            retryCount++;
            setTimeout(initTelegram, 1000); // Retry after 1 second
          } else {
            console.log("Telegram WebApp not available after retries, checking localStorage");
            
            // Try to get user from localStorage as a fallback
            const storedUser = getUserFromLocalStorage();
            if (storedUser) {
              console.log("Using stored Telegram user data after retries");
              setTelegramUser(storedUser);
              setTelegramInitialized(true);
              setAppStage("telegram-init-storage-after-retry");
              return;
            }
            
            // Last resort fallback
            console.log("No stored user data after retries, using test fallback");
            const testUser = {
              id: "82424881123",
              firstName: "TestUser",
              lastName: null,
              username: "@testuser",
              languageCode: "en",
            };
            
            setTelegramUser(testUser);
            setTelegramInitialized(true);
            setAppStage("telegram-init-fallback-after-retry");
          }
        }
      } catch (error) {
        console.error("Error initializing Telegram WebApp:", error);
        setTelegramError(error.message);
        
        // Try to get user from localStorage as a fallback
        const storedUser = getUserFromLocalStorage();
        if (storedUser) {
          console.log("Using stored Telegram user data after error");
          setTelegramUser(storedUser);
          setTelegramInitialized(true);
          setAppStage("telegram-init-storage-after-error");
          return;
        }
        
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
              
              // Update the balance in the dedicated balance slice for real-time updates
              dispatch(setBalance(userData.balance || 0));
              
              dispatch(
                setUser({
                  uid: telegramUser.id,
                  userImage: userData.userImage,
                  firstName: userData.firstName || telegramUser.firstName,
                  lastName: userData.lastName || telegramUser.lastName,
                  userName: userData.userName || telegramUser.username,
                  languageCode: userData.languageCode || telegramUser.languageCode,
                  referrals: userData.referrals || {},
                  referredBy: userData.referredBy || null,
                  isPremium: userData.isPremium || false,
                  balance: userData.balance || 0,
                  mineRate: userData.mineRate || 0.001,
                  isMining: userData.isMining || false,
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
                // Create a new user document with the Telegram username
                await setDoc(doc(db, "users", telegramUser.id), {
                  uid: telegramUser.id,
                  firstName: telegramUser.firstName,
                  lastName: telegramUser.lastName,
                  userName: telegramUser.username, // Use consistent field name
                  username: telegramUser.username, // Keep both for backward compatibility
                  languageCode: telegramUser.languageCode,
                  referrals: {},
                  referredBy: null,
                  isPremium: false,
                  balance: 100, // Start with some balance
                  mineRate: 0.001,
                  isMining: false,
                  miningStartedTime: null,
                  daily: {
                    claimedTime: null,
                    claimedDay: 0,
                  },
                  links: {},
                });
                
                // Initialize balance in the dedicated balance slice
                dispatch(setBalance(100));
                
                // Also update the user in Redux
                dispatch(
                  setUser({
                    uid: telegramUser.id,
                    userImage: null,
                    firstName: telegramUser.firstName,
                    lastName: telegramUser.lastName,
                    userName: telegramUser.username,
                    languageCode: telegramUser.languageCode,
                    referrals: {},
                    referredBy: null,
                    isPremium: false,
                    balance: 100,
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
      
      const topUsers = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          balance: data.balance || 0,
          userImage: data.userImage,
          firstName: data.firstName,
          lastName: data.lastName,
          // Use userName field with fallback to username field
          userName: data.userName || data.username,
        };
      });
      
      console.log("Top users data:", topUsers);
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

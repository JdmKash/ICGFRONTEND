import { useEffect, useState } from "react";
import "./App.css";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { selectUser, setUser } from "./features/userSlice";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./Screens/Home";
import Daily from "./Screens/Daily";
import Earn from "./Screens/Earn";
import AirDrops from "./Screens/airdrops";
import Refferals from "./Screens/refferals";
import CalculateNums from "./Components/CalculateNums";
import CoinAnimation from "./Components/CoinAnimation";
import { selectShowMessage, setShowMessage } from "./features/messageSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectCoinShow } from "./features/coinShowSlice";
import { setTopUsers } from "./features/topUsersSlice";
import Loading from "./Screens/Loading";
import BottomNavigation from "./Components/BottomNavigation";
import { selectCalculated } from "./features/calculateSlice";

function App() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const calculate = useSelector(selectCalculated);
  const message = useSelector(selectShowMessage);
  const coinShow = useSelector(selectCoinShow);

  const [webApp, setWebApp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [telegramError, setTelegramError] = useState(null);
  const [initStage, setInitStage] = useState("initializing");
  
  // Function to safely process links object
  const processLinks = (links) => {
    if (!links) return {};
    return Object.entries(links).reduce((acc, [key, value]) => {
      acc[key] = {
        ...value,
        time: value.time ? value.time.toMillis() : null,
      };
      return acc;
    }, {});
  };

  // Safely initialize Telegram WebApp
  useEffect(() => {
    console.log("Initializing Telegram WebApp");
    setInitStage("telegram-init-start");
    
    try {
      // Check if Telegram WebApp is available
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        console.log("Telegram WebApp found, calling ready()");
        tg.ready();

        if (tg?.initDataUnsafe?.user?.id) {
          const userId = tg.initDataUnsafe.user.id;
          const userIdString = userId.toString();
          console.log("Telegram user identified:", userIdString);
          
          setWebApp({
            id: userIdString,
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
          
          setInitStage("telegram-init-success");
        } else {
          console.log("No Telegram user data, using fallback");
          // Fallback for testing outside Telegram
          setWebApp({
            id: "82424881123",
            firstName: "FirstName",
            lastName: null,
            username: "@username",
            languageCode: "en",
          });
          setInitStage("telegram-init-fallback");
        }
      } else {
        console.log("Telegram WebApp not available, using fallback");
        setWebApp({
          id: "82424881123",
          firstName: "FirstName",
          lastName: null,
          username: "@username",
          languageCode: "en",
        });
        setInitStage("telegram-init-fallback");
      }
    } catch (error) {
      console.error("Error initializing Telegram WebApp:", error);
      setTelegramError(error.message);
      setInitStage("telegram-init-error");
      
      // Fallback to ensure the app still works
      setWebApp({
        id: "82424881123",
        firstName: "FirstName",
        lastName: null,
        username: "@username",
        languageCode: "en",
      });
    }
  }, []);

  // Connect to Firestore once Telegram is initialized
  useEffect(() => {
    if (!webApp) return;
    
    console.log("Telegram user available, connecting to Firestore");
    setInitStage("firestore-connect");
    
    try {
      console.log("Setting up Firestore listener for user:", webApp.id);
      const unsub = onSnapshot(
        doc(db, "users", webApp.id),
        async (docSnap) => {
          try {
            if (docSnap.exists()) {
              console.log("User document exists, updating Redux state");
              const userData = docSnap.data();
              
              dispatch(
                setUser({
                  uid: webApp.id,
                  userImage: userData.userImage,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  userName: userData.username,
                  languageCode: userData.languageCode,
                  referrals: userData.referrals || {},
                  referredBy: userData.referredBy,
                  isPremium: userData.isPremium,
                  balance: userData.balance,
                  mineRate: userData.mineRate,
                  isMining: userData.isMining,
                  miningStartedTime: userData.miningStartedTime 
                    ? userData.miningStartedTime.toMillis()
                    : null,
                  daily: {
                    claimedTime: userData.daily?.claimedTime
                      ? userData.daily.claimedTime.toMillis() 
                      : null,
                    claimedDay: userData.daily?.claimedDay || 0,
                  },
                  links: processLinks(userData.links),
                })
              );
              
              setIsLoading(false);
              setInitStage("user-data-loaded");
            } else {
              console.log("User document doesn't exist, creating new user");
              try {
                await setDoc(doc(db, "users", webApp.id), {
                  firstName: webApp.firstName,
                  lastName: webApp.lastName || null,
                  username: webApp.username || null,
                  languageCode: webApp.languageCode,
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
                setInitStage("new-user-created");
              } catch (createError) {
                console.error("Error creating new user:", createError);
                setIsLoading(false);
                setInitStage("user-creation-error");
              }
            }
          } catch (docError) {
            console.error("Error processing user document:", docError);
            setIsLoading(false);
            setInitStage("doc-processing-error");
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
          setIsLoading(false);
          setInitStage("firestore-listener-error");
        }
      );
      
      // Fetch top users in the background
      fetchTopUsers();
      
      return () => { 
        console.log("Cleaning up Firestore listener");
        unsub();
      };
    } catch (error) {
      console.error("Error setting up Firestore connection:", error);
      setIsLoading(false);
      setInitStage("firestore-setup-error");
    }
  }, [dispatch, webApp]); 

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

  // Handle toast messages
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

  // Show error message if Telegram initialization failed
  if (telegramError) {
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
        <p>Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <Router>
      {user && calculate && <BottomNavigation />}
      {user && (
        <>
          <CalculateNums />
          <ToastContainer
            style={{
              width: "calc(100% - 40px)", // 40px is the total of left and right 
              maxWidth: "none",
              left: "20px",
              right: "20px",
              top: "20px",
              height: "20px",
            }}
            toastStyle={{
              minHeight: "20px", // Adjust this value to change the height
              padding: "0px 10px", // Adjust padding to further control size
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
      )}
      <Routes>
        <Route path="*" element={<Loading stage={initStage} />} />
        <Route path="/" element={isLoading ? <Loading stage={initStage} /> : <Home />} />
        {user && calculate && <Route path="/daily" element={<Daily />} />}
        {user && calculate && <Route path="/earn" element={<Earn />} />}
        {user && calculate && <Route path="/airdrops" element={<AirDrops />} />}
        {user && calculate && <Route path="/refferals" element={<Refferals />} />}
      </Routes>
      
      {/* Debug info - remove in production */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        padding: '4px', 
        fontSize: '10px', 
        zIndex: 9999 
      }}>
        Stage: {initStage} | Loading: {isLoading ? 'Yes' : 'No'} | User: {user ? 'Yes' : 'No'} | Calculate: {calculate ? 'Yes' : 'No'}
      </div>
    </Router>
  );
}

export default App;

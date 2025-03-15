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
import { HashRouter as Router, Route, Routes } from "react-router-dom";
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
  const [telegramInitError, setTelegramInitError] = useState(null);
  
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
    try {
      // Check if Telegram WebApp is available
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();

        if (tg?.initDataUnsafe?.user?.id) {
          const userId = tg.initDataUnsafe.user.id;
          const userIdString = userId.toString();
          
          setWebApp({
            id: userIdString,
            firstName: tg?.initDataUnsafe?.user?.first_name,
            lastName: tg?.initDataUnsafe?.user?.last_name,
            username: tg?.initDataUnsafe?.user?.username,
            languageCode: tg?.initDataUnsafe?.user?.language_code,
          });
          
          // Set Telegram WebApp UI settings
          try {
            tg.expand();
            tg.setBackgroundColor("#0b0b0b");
            tg.setHeaderColor("#0b0b0b");
          } catch (uiError) {
            console.error("Error setting Telegram UI:", uiError);
            // Continue even if UI settings fail
          }
        } else {
          console.log("Using fallback user data (not in Telegram)");
          setWebApp({
            id: "82424881123",
            firstName: "FirstName",
            lastName: null,
            username: "@username",
            languageCode: "en",
          });
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
      }
    } catch (error) {
      console.error("Error initializing Telegram WebApp:", error);
      setTelegramInitError(error.message);
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

  useEffect(() => {
    //Listening to User
    const getUser = () => {    
      try {
        const unsub = onSnapshot(doc(db, "users", webApp.id), async (docSnap) => {
          if (docSnap.exists()) {
            dispatch(
              setUser({
                uid: webApp.id,
                userImage: docSnap.data().userImage,
                firstName: docSnap.data().firstName,
                lastName: docSnap.data().lastName,
                userName: docSnap.data().username,
                languageCode: docSnap.data().languageCode,
                referrals: docSnap.data().referrals || {},
                referredBy: docSnap.data().referredBy,
                isPremium: docSnap.data().isPremium,
                balance: docSnap.data().balance,
                mineRate: docSnap.data().mineRate,
                isMining: docSnap.data().isMining,
                miningStartedTime: docSnap.data().miningStartedTime 
                  ? docSnap.data().miningStartedTime.toMillis()
                  : null,
                daily: {
                  claimedTime: docSnap.data().daily?.claimedTime
                    ? docSnap.data().daily.claimedTime.toMillis() 
                    : null,
                  claimedDay: docSnap.data().daily?.claimedDay || 0,
                },
                links: processLinks(docSnap.data().links),
              })
            );
            setIsLoading(false);
          } 
          else {
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
              setIsLoading(false);
            } catch (error) {
              console.error("Error creating new user:", error);
              setIsLoading(false);
            }
          }
        });

        return () => { 
          unsub();
        };
      } catch (error) {
        console.error("Error in getUser:", error);
        setIsLoading(false);
        return () => {};
      }
    };

    if (webApp) {
      getUser();
    } 
  }, [dispatch, webApp]); 

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
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
      } catch (error) {
        console.error("Error fetching top users:", error);
      }
    };

    fetchTopUsers();
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

  // Show error message if Telegram initialization failed
  if (telegramInitError) {
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
        <p>There was a problem initializing the app: {telegramInitError}</p>
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
        <Route path="*" element={<Loading />} />
        <Route path="/" element={isLoading ? <Loading /> : <Home />} />
        {user && calculate && <Route path="/daily" element={<Daily />} />}
        {user && calculate && <Route path="/earn" element={<Earn />} />}
        {user && calculate && <Route path="/airdrops" element={<AirDrops />} />}
        {user && calculate && <Route path="/refferals" element={<Refferals />} />}
      </Routes>
    </Router>
  );
}

export default App;


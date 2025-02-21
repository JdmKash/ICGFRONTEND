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
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [webApp, setWebApp] = useState(null);

  // Helper function to process Firestore timestamps in links
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

  // Initialize Telegram WebApp
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      
      if (!tg) {
        console.warn("Telegram WebApp not found, using development data");
        setWebApp({
          id: "82424881123",
          firstName: "FirstName",
          lastName: null,
          username: "@username",
          languageCode: "en",
        });
        return;
      }

      tg.ready();

      if (tg?.initDataUnsafe?.user?.id) {
        const userId = tg.initDataUnsafe.user.id.toString();
        setWebApp({
          id: userId,
          firstName: tg.initDataUnsafe.user.first_name,
          lastName: tg.initDataUnsafe.user.last_name,
          username: tg.initDataUnsafe.user.username,
          languageCode: tg.initDataUnsafe.user.language_code,
        });

        tg.expand();
        tg.setBackgroundColor("#0b0b0b");
        tg.setHeaderColor("#0b0b0b");
      }
    } catch (error) {
      console.error("Error initializing Telegram WebApp:", error);
      // Fallback to development data
      setWebApp({
        id: "82424881123",
        firstName: "FirstName",
        lastName: null,
        username: "@username",
        languageCode: "en",
      });
    }
  }, []);

  // Initialize or fetch user data
  useEffect(() => {
    if (!webApp) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", webApp.id),
      async (docSnap) => {
        try {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            dispatch(
              setUser({
                uid: webApp.id,
                userImage: userData.userImage,
                firstName: userData.firstname,
                lastName: userData.lastname,
                userName: userData.username,
                languageCode: userData.languageCode,
                referrals: userData.referrals,
                referredBy: userData.referredBy,
                isPremium: userData.isPremium,
                balance: userData.balance,
                mineRate: userData.mineRate,
                isMining: userData.isMining,
                miningStartedTime: userData.miningStartedTime
                  ? userData.miningStartedTime.toMillis()
                  : null,
                daily: {
                  claimedTime: userData.daily.claimedTime
                    ? userData.daily.claimedTime.toMillis()
                    : null,
                  claimedDay: userData.daily.claimedDay,
                },
                links: processLinks(userData.links),
              })
            );
          } else {
            // Create new user document if it doesn't exist
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
          }
          setIsInitializing(false);
        } catch (error) {
          console.error("Error processing user data:", error);
          dispatch(
            setShowMessage({
              message: "Error loading user data. Please refresh.",
              color: "red",
            })
          );
        }
      }
    );

    return () => unsubscribe();
  }, [webApp, dispatch]);

  // Fetch top users
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

    if (!isInitializing) {
      fetchTopUsers();
    }
  }, [dispatch, isInitializing]);

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

  if (isInitializing) {
    return <Loading />;
  }

  return (
    <Router>
      {user && calculate && <BottomNavigation />}
      {user && (
        <>
          <CalculateNums />
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
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        {user && calculate ? (
          <>
            <Route path="/daily" element={<Daily />} />
            <Route path="/earn" element={<Earn />} />
            <Route path="/airdrops" element={<AirDrops />} />
            <Route path="/refferals" element={<Refferals />} />
          </>
        ) : (
          // Redirect to loading or home if user/calculate isn't ready
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
        <Route path="*" element={<Loading />} />
      </Routes>
    </Router>
  );
}

export default App;
import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../features/userSlice";
import { setShowMessage } from "../features/messageSlice";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/RewardedAdsButton.css";

// Reward amount per ad view
const COINS_PER_AD = 10;
// Maximum number of ads per period
const MAX_ADS_PER_PERIOD = 10;
// Period duration in milliseconds (12 hours)
const PERIOD_DURATION = 12 * 60 * 60 * 1000;

function RewardedAdsButton() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [isLoading, setIsLoading] = useState(false);
  const [adsRemaining, setAdsRemaining] = useState(0);
  const [nextAdTime, setNextAdTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isAdButtonDisabled, setIsAdButtonDisabled] = useState(true);

  // Check if user can view an ad - wrapped in useCallback to prevent recreation on every render
  const checkAdStatus = useCallback(async () => {
    if (!user || !user.uid) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.error("User document not found");
        setIsLoading(false);
        return;
      }
      
      const userData = userSnap.data();
      const adViews = userData.adViews || { count: 0, lastViewTime: null, periodStartTime: null };
      const now = Date.now();
      
      // Check if period has expired
      if (adViews.periodStartTime) {
        const periodEnd = adViews.periodStartTime.toMillis() + PERIOD_DURATION;
        
        if (now >= periodEnd) {
          // Period has expired, reset counters
          setAdsRemaining(MAX_ADS_PER_PERIOD);
          setNextAdTime(null);
          setIsAdButtonDisabled(false);
        } else if (adViews.count >= MAX_ADS_PER_PERIOD) {
          // Max ads reached for current period
          setAdsRemaining(0);
          setNextAdTime(periodEnd);
          setIsAdButtonDisabled(true);
        } else {
          // Period active, ads remaining
          setAdsRemaining(MAX_ADS_PER_PERIOD - adViews.count);
          setNextAdTime(null);
          setIsAdButtonDisabled(false);
        }
      } else {
        // No period started yet
        setAdsRemaining(MAX_ADS_PER_PERIOD);
        setNextAdTime(null);
        setIsAdButtonDisabled(false);
      }
    } catch (error) {
      console.error("Error checking ad status:", error);
      dispatch(
        setShowMessage({
          message: "Error checking ad status. Please try again.",
          color: "red",
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, dispatch]); // Include dependencies used inside the function

  // Check user's ad viewing status on component mount
  useEffect(() => {
    if (user && user.uid) {
      checkAdStatus();
    }
  }, [user, checkAdStatus]);

  // Update countdown timer
  useEffect(() => {
    let timer;
    if (nextAdTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const remaining = nextAdTime - now;
        
        if (remaining <= 0) {
          clearInterval(timer);
          checkAdStatus(); // Refresh ad status when time is up
        } else {
          // Format time remaining
          const hours = Math.floor(remaining / (60 * 60 * 1000));
          const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
          const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [nextAdTime, checkAdStatus]);

  // Handle watching an ad
  const handleWatchAd = async () => {
    if (isAdButtonDisabled || isLoading) return;
    
    setIsLoading(true);
    try {
      // Show ad using Monetag SDK
      window.show_8923854('pop').then(async () => {
        // Ad was watched successfully
        // Update user's ad viewing status in Firebase
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          throw new Error("User document not found");
        }
        
        const userData = userSnap.data();
        const now = serverTimestamp();
        const adViews = userData.adViews || { count: 0, lastViewTime: null, periodStartTime: null };
        
        // If this is the first ad view or period has expired, start a new period
        const updateData = {
          adViews: {
            count: adViews.periodStartTime ? adViews.count + 1 : 1,
            lastViewTime: now,
            periodStartTime: adViews.periodStartTime || now
          },
          // Add coins to user's balance
          balance: userData.balance + COINS_PER_AD
        };
        
        await updateDoc(userRef, updateData);
        
        // Show success message
        dispatch(
          setShowMessage({
            message: `Congratulations! You earned ${COINS_PER_AD} coins!`,
            color: "green",
          })
        );
        
        // Refresh ad status
        checkAdStatus();
      }).catch(error => {
        console.error("Error showing ad:", error);
        dispatch(
          setShowMessage({
            message: "Error showing ad. Please try again.",
            color: "red",
          })
        );
      });
    } catch (error) {
      console.error("Error handling ad view:", error);
      dispatch(
        setShowMessage({
          message: "Error processing ad view. Please try again.",
          color: "red",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div className="text-white p-4">Loading user data...</div>;
  }

  return (
    <div className="rewarded-ads-container">
      <h3 className="rewarded-ads-title">Watch Ads to Earn Coins</h3>
      
      <div className="rewarded-ads-info">
        <p>Earn {COINS_PER_AD} coins for each ad you watch</p>
        <p>Limit: {MAX_ADS_PER_PERIOD} ads every 12 hours</p>
        
        {adsRemaining > 0 ? (
          <p className="ads-remaining">Ads remaining: {adsRemaining}/{MAX_ADS_PER_PERIOD}</p>
        ) : (
          <div className="time-remaining">
            <p>Maximum ads watched</p>
            <p>Next ad available in: {timeRemaining}</p>
          </div>
        )}
      </div>
      
      <button
        className={`rewarded-ads-button ${isAdButtonDisabled ? 'disabled' : ''}`}
        onClick={handleWatchAd}
        disabled={isAdButtonDisabled || isLoading}
      >
        {isLoading ? "Loading..." : "Watch Ad to Earn Coins"}
      </button>
    </div>
  );
}

export default RewardedAdsButton;

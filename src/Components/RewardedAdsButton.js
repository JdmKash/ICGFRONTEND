import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../features/userSlice";
import { setShowMessage } from "../features/messageSlice";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/RewardedAdsButton.css";
import { setCoinShow } from "../features/coinShowSlice";
import { updateBalance } from "../features/balanceSlice";

// Reward amount per ad view
const COINS_PER_AD = 10;
// Maximum number of ads per period
const MAX_ADS_PER_PERIOD = 10;
// Period duration in milliseconds (24 hours)
const PERIOD_DURATION = 24 * 60 * 60 * 1000;

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
      // Check if Monetag SDK is available
      if (typeof window.show_8923854 !== 'function') {
        console.error("Ad SDK not found or not loaded properly");
        
        // Fallback: Proceed as if ad was watched successfully
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            // Create user document if it doesn't exist
            await setDoc(userRef, {
              uid: user.uid,
              userImage: user.userImage || null,
              firstName: user.firstName || "Guest",
              lastName: user.lastName || "User",
              userName: user.userName || "guest_user",
              balance: 100, // Default starting balance
              adViews: {
                count: 1,
                lastViewTime: serverTimestamp(),
                periodStartTime: serverTimestamp()
              }
            });
            
            // Update balance in real-time
            dispatch(updateBalance(100));
            
            dispatch(
              setShowMessage({
                message: `Congratulations! You earned ${COINS_PER_AD} coins!`,
                color: "green",
              })
            );
            
            // Refresh ad status
            checkAdStatus();
            setIsLoading(false);
            return;
          }
          
          const userData = userSnap.data();
          const now = serverTimestamp();
          const adViews = userData.adViews || { count: 0, lastViewTime: null, periodStartTime: null };
          
          // If this is the first ad view or period has expired, start a new period
          const newBalance = (userData.balance || 0) + COINS_PER_AD;
          const updateData = {
            adViews: {
              count: adViews.periodStartTime ? adViews.count + 1 : 1,
              lastViewTime: now,
              periodStartTime: adViews.periodStartTime || now
            },
            // Add coins to user's balance
            balance: newBalance
          };
          
          await updateDoc(userRef, updateData);
          
          // Update balance in real-time
          dispatch(updateBalance(newBalance));
          
          // Show success message
          dispatch(
            setShowMessage({
              message: `Congratulations! You earned ${COINS_PER_AD} coins!`,
              color: "green",
            })
          );
          
          // Refresh ad status
          checkAdStatus();
        } catch (error) {
          console.error("Error in fallback ad handling:", error);
          
          // Even if there's an error, still try to reward the user
          try {
            const userRef = doc(db, "users", user.uid);
            const newBalance = (user.balance || 0) + COINS_PER_AD;
            await setDoc(userRef, {
              balance: newBalance,
              uid: user.uid
            }, { merge: true });
            
            // Update balance in real-time
            dispatch(updateBalance(newBalance));
            
            dispatch(
              setShowMessage({
                message: `Coins awarded despite error!`,
                color: "green",
              })
            );
          } catch (finalError) {
            console.error("Final fallback error:", finalError);
            dispatch(
              setShowMessage({
                message: "Error processing reward. Please try again.",
                color: "red",
              })
            );
          }
        }
        
        setIsLoading(false);
        return;
      }
      
      // If SDK is available, try to show ad
      try {
        // Use a timeout to handle potential hanging ad requests
        const adPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Ad request timed out"));
          }, 5000); // 5 second timeout
          
          try {
            window.show_8923854('pop')
              .then(result => {
                clearTimeout(timeout);
                resolve(result);
              })
              .catch(error => {
                clearTimeout(timeout);
                reject(error);
              });
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
        
        await adPromise.then(async () => {
          // Ad was watched successfully
          // Update user's ad viewing status in Firebase
          try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
              // Create user document if it doesn't exist
              const newBalance = 100 + COINS_PER_AD;
              await setDoc(userRef, {
                uid: user.uid,
                userImage: user.userImage || null,
                firstName: user.firstName || "Guest",
                lastName: user.lastName || "User",
                userName: user.userName || "guest_user",
                balance: newBalance, // Default starting balance + reward
                adViews: {
                  count: 1,
                  lastViewTime: serverTimestamp(),
                  periodStartTime: serverTimestamp()
                }
              });
              
              // Update balance in real-time
              dispatch(updateBalance(newBalance));
              
              dispatch(
                setShowMessage({
                  message: `Congratulations! You earned ${COINS_PER_AD} coins!`,
                  color: "green",
                })
              );
              
              // Refresh ad status
              checkAdStatus();
              return;
            }
            
            const userData = userSnap.data();
            const now = serverTimestamp();
            const adViews = userData.adViews || { count: 0, lastViewTime: null, periodStartTime: null };
            
            // If this is the first ad view or period has expired, start a new period
            const newBalance = (userData.balance || 0) + COINS_PER_AD;
            const updateData = {
              adViews: {
                count: adViews.periodStartTime ? adViews.count + 1 : 1,
                lastViewTime: now,
                periodStartTime: adViews.periodStartTime || now
              },
              // Add coins to user's balance
              balance: newBalance
            };
            
            await updateDoc(userRef, updateData);
            
            // Update balance in real-time
            dispatch(updateBalance(newBalance));
            
            // Show success message and coin animation
            dispatch(setCoinShow(true));
            dispatch(
              setShowMessage({
                message: `Congratulations! You earned ${COINS_PER_AD} coins!`,
                color: "green",
              })
            );
            
            // Refresh ad status
            checkAdStatus();
          } catch (error) {
            console.error("Error updating user after ad view:", error);
            
            // Fallback: Try to update with merge option
            try {
              const userRef = doc(db, "users", user.uid);
              const newBalance = (user.balance || 0) + COINS_PER_AD;
              await setDoc(userRef, {
                balance: newBalance,
                uid: user.uid
              }, { merge: true });
              
              // Update balance in real-time
              dispatch(updateBalance(newBalance));
              
              dispatch(
                setShowMessage({
                  message: `Coins awarded despite error!`,
                  color: "green",
                })
              );
            } catch (finalError) {
              console.error("Final fallback error:", finalError);
              dispatch(
                setShowMessage({
                  message: "Error processing reward. Please try again.",
                  color: "red",
                })
              );
            }
          }
        }).catch(async (error) => {
          console.error("Error showing ad:", error);
          
          // Fallback: Proceed as if ad was watched successfully
          try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
              // Create user document if it doesn't exist
              const newBalance = 100 + COINS_PER_AD;
              await setDoc(userRef, {
                uid: user.uid,
                userImage: user.userImage || null,
                firstName: user.firstName || "Guest",
                lastName: user.lastName || "User",
                userName: user.userName || "guest_user",
                balance: newBalance, // Default starting balance + reward
                adViews: {
                  count: 1,
                  lastViewTime: serverTimestamp(),
                  periodStartTime: serverTimestamp()
                }
              });
              
              // Update balance in real-time
              dispatch(updateBalance(newBalance));
              
              dispatch(
                setShowMessage({
                  message: `Congratulations! You earned ${COINS_PER_AD} coins!`,
                  color: "green",
                })
              );
              
              // Refresh ad status
              checkAdStatus();
              return;
            }
            
            const userData = userSnap.data();
            const now = serverTimestamp();
            const adViews = userData.adViews || { count: 0, lastViewTime: null, periodStartTime: null };
            
            // If this is the first ad view or period has expired, start a new period
            const newBalance = (userData.balance || 0) + COINS_PER_AD;
            const updateData = {
              adViews: {
                count: adViews.periodStartTime ? adViews.count + 1 : 1,
                lastViewTime: now,
                periodStartTime: adViews.periodStartTime || now
              },
              // Add coins to user's balance
              balance: newBalance
            };
            
            await updateDoc(userRef, updateData);
            
            // Update balance in real-time
            dispatch(updateBalance(newBalance));
            
            // Show success message
            dispatch(
              setShowMessage({
                message: `Congratulations! You earned ${COINS_PER_AD} coins!`,
                color: "green",
              })
            );
            
            // Refresh ad status
            checkAdStatus();
          } catch (error) {
            console.error("Error in fallback ad handling:", error);
            dispatch(
              setShowMessage({
                message: "Error processing ad. Please try again.",
                color: "red",
              })
            );
          }
        });
      } catch (error) {
        console.error("Error in ad handling:", error);
        dispatch(
          setShowMessage({
            message: "Error showing ad. Please try again.",
            color: "red",
          })
        );
      }
    } catch (error) {
      console.error("Error in ad handling:", error);
      dispatch(
        setShowMessage({
          message: "Error showing ad. Please try again.",
          color: "red",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Return loading state if user data isn't available yet
  if (!user) {
    return (
      <div className="rewarded-ads-container">
        <p className="text-white">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="rewarded-ads-container">
      <div className="rewarded-ads-status">
        {nextAdTime ? (
          <p>Next ad available in: {timeRemaining}</p>
        ) : (
          <p>Ads remaining today: {adsRemaining}/{MAX_ADS_PER_PERIOD}</p>
        )}
      </div>
      <button
        className={`rewarded-ads-button ${isAdButtonDisabled || isLoading ? 'disabled' : ''}`}
        onClick={handleWatchAd}
        disabled={isAdButtonDisabled || isLoading}
      >
        {isLoading ? 'Loading...' : `Watch Ad (+${COINS_PER_AD} coins)`}
      </button>
    </div>
  );
}

export default RewardedAdsButton;

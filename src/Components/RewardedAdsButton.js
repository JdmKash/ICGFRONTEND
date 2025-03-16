import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../features/userSlice";
import { setShowMessage } from "../features/messageSlice";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/RewardedAdsButton.css";
import { setCoinShow } from "../features/coinShowSlice";

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
          const updateData = {
            adViews: {
              count: adViews.periodStartTime ? adViews.count + 1 : 1,
              lastViewTime: now,
              periodStartTime: adViews.periodStartTime || now
            },
            // Add coins to user's balance
            balance: (userData.balance || 0) + COINS_PER_AD
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
        } catch (error) {
          console.error("Error in fallback ad handling:", error);
          
          // Even if there's an error, still try to reward the user
          try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
              balance: (user.balance || 0) + COINS_PER_AD,
              uid: user.uid
            }, { merge: true });
            
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
              await setDoc(userRef, {
                uid: user.uid,
                userImage: user.userImage || null,
                firstName: user.firstName || "Guest",
                lastName: user.lastName || "User",
                userName: user.userName || "guest_user",
                balance: 100 + COINS_PER_AD, // Default starting balance + reward
                adViews: {
                  count: 1,
                  lastViewTime: serverTimestamp(),
                  periodStartTime: serverTimestamp()
                }
              });
              
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
            const updateData = {
              adViews: {
                count: adViews.periodStartTime ? adViews.count + 1 : 1,
                lastViewTime: now,
                periodStartTime: adViews.periodStartTime || now
              },
              // Add coins to user's balance
              balance: (userData.balance || 0) + COINS_PER_AD
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
          } catch (error) {
            console.error("Error updating after ad view:", error);
            // Fallback: Try to update with merge option
            try {
              const userRef = doc(db, "users", user.uid);
              await setDoc(userRef, {
                balance: (user.balance || 0) + COINS_PER_AD,
                uid: user.uid
              }, { merge: true });
              
              dispatch(
                setShowMessage({
                  message: `Coins awarded despite error!`,
                  color: "green",
                })
              );
            } catch (finalError) {
              console.error("Final fallback error:", finalError);
            }
          }
        }).catch(error => {
          console.error("Error showing ad:", error);
          dispatch(
            setShowMessage({
              message: "Error showing ad. Rewarding coins anyway!",
              color: "yellow",
            })
          );
          
          // Fallback: Reward user anyway if ad fails to show
          (async () => {
            try {
              const userRef = doc(db, "users", user.uid);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const userData = userSnap.data();
                await updateDoc(userRef, {
                  balance: (userData.balance || 0) + COINS_PER_AD
                });
              } else {
                // Create user document if it doesn't exist
                await setDoc(userRef, {
                  uid: user.uid,
                  userImage: user.userImage || null,
                  firstName: user.firstName || "Guest",
                  lastName: user.lastName || "User",
                  userName: user.userName || "guest_user",
                  balance: 100 + COINS_PER_AD, // Default starting balance + reward
                  adViews: {
                    count: 1,
                    lastViewTime: serverTimestamp(),
                    periodStartTime: serverTimestamp()
                  }
                });
              }
              
              checkAdStatus();
            } catch (fbError) {
              console.error("Error in fallback reward:", fbError);
              // Final fallback - try with merge
              try {
                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, {
                  balance: (user.balance || 0) + COINS_PER_AD,
                  uid: user.uid
                }, { merge: true });
              } catch (finalError) {
                console.error("Final fallback error:", finalError);
              }
            }
          })();
        });
      } catch (error) {
        console.error("Critical error in ad display:", error);
        dispatch(
          setShowMessage({
            message: "Error with ad system. Rewarding coins anyway!",
            color: "yellow",
          })
        );
        
        // Fallback: Reward user anyway if there's a critical error
        (async () => {
          try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              await updateDoc(userRef, {
                balance: (userData.balance || 0) + COINS_PER_AD
              });
            } else {
              // Create user document if it doesn't exist
              await setDoc(userRef, {
                uid: user.uid,
                userImage: user.userImage || null,
                firstName: user.firstName || "Guest",
                lastName: user.lastName || "User",
                userName: user.userName || "guest_user",
                balance: 100 + COINS_PER_AD, // Default starting balance + reward
                adViews: {
                  count: 1,
                  lastViewTime: serverTimestamp(),
                  periodStartTime: serverTimestamp()
                }
              });
            }
            
            checkAdStatus();
          } catch (fbError) {
            console.error("Error in critical fallback reward:", fbError);
            // Final fallback - try with merge
            try {
              const userRef = doc(db, "users", user.uid);
              await setDoc(userRef, {
                balance: (user.balance || 0) + COINS_PER_AD,
                uid: user.uid
              }, { merge: true });
            } catch (finalError) {
              console.error("Final fallback error:", finalError);
            }
          }
        })();
      }
    } catch (error) {
      console.error("Error handling ad view:", error);
      dispatch(
        setShowMessage({
          message: "Error processing ad view. Please try again.",
          color: "red",
        })
      );
      dispatch(setCoinShow(false));
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
        <p>Limit: {MAX_ADS_PER_PERIOD} ads every 24 hours</p>
        
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

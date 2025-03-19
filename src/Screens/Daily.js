import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser, setUser } from "../features/userSlice";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { setShowMessage } from "../features/messageSlice";
import { updateBalance } from "../features/balanceSlice";
import { setCoinShow } from "../features/coinShowSlice";

function Daily() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    
    // Add missing state variables
    const [claimDisabled, setClaimDisabled] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);
    const [claimDay, setClaimDay] = useState(1);
    const [claimAmount, setClaimAmount] = useState(10);
    
    // Add the formatNumber utility function
    const formatNumber = (num) => {
      // Convert the number to a string with a fixed number of decimal places
      let numStr = num.toFixed(3);
      
      // Split the number into the integer and decimal parts
      let [intPart, decPart] = numStr.split(".");
      
      // Add thousand separators to the integer part
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      
      // If the number is less than 0.01 keep 3 decimal places
      if (num < 0.01) {
        return `${intPart},${decPart}`;  
      }
      
      // For other numbers, keep 2 decimal places
      decPart = decPart.slice(0, 2);
      
      // Always return the formatted number with 2 decimal places
      return `${intPart},${decPart}`;
    };

    const handleClaim = async () => {
      try {
        setClaimDisabled(true);
        dispatch(
          setShowMessage({
            message: "Claiming daily rewards...",
            color: "green",
          })
        );
        
        // Check if user document exists
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Create user document if it doesn't exist
          const newBalance = 100 + claimAmount;
          await setDoc(userRef, {
            uid: user.uid,
            userImage: user.userImage || null,
            firstName: user.firstName || "Guest",
            lastName: user.lastName || "Guest",
            userName: user.userName || "guest_user",
            balance: newBalance, // Default starting balance + reward
            mineRate: 0.001,
            isMining: false,
            miningStartedTime: null,
            daily: {
              claimedTime: serverTimestamp(),
              claimedDay: 1,
            }
          });
          
          // Update Redux state - CRITICAL PART
          dispatch(updateBalance(newBalance));
          
          // Also update user object in Redux to maintain consistency
          dispatch(setUser({
            ...user,
            balance: newBalance,
            daily: {
              claimedTime: new Date(),
              claimedDay: 1,
            }
          }));
          
          // Show coin animation
          dispatch(setCoinShow(true));
          
          dispatch(
            setShowMessage({
              message: `Successfully claimed ₿ ${formatNumber(claimAmount)}! New balance: ₿ ${formatNumber(newBalance)}`,
              color: "green",
            })
          );
          
          setIsClaimed(true);
          setClaimDisabled(false);
          return;
        }
        
        const userData = userSnap.data();
        
        // Get server timestamp
        await updateDoc(userRef, { 
          timeCheck: serverTimestamp() 
        });
        
        // Wait a moment to ensure the server timestamp is saved
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the updated document with server timestamp
        const updatedSnap = await getDoc(userRef);
        const serverNow = updatedSnap.data().timeCheck;
        
        if (!serverNow) {
          throw new Error("Could not retrieve server time");
        }
        
        // Check if user can claim
        let canClaim = true;
        let claimDayX = 1;
        let claimAmountX = claimAmount;
        
        if (userData.daily && userData.daily.claimedTime) {
          const lastClaimTime = userData.daily.claimedTime.toDate();
          const now = serverNow.toDate();
          const hoursDiff = (now - lastClaimTime) / (1000 * 3600);
          
          if (hoursDiff < 24) {
            canClaim = false;
            dispatch(
              setShowMessage({
                message: "You've already claimed today's reward!",
                color: "yellow",
              })
            );
          } else if (hoursDiff >= 48) {
            claimDayX = 1;
            claimAmountX = 10;
            dispatch(
              setShowMessage({
                message: "Claim day has been reset",
                color: "red",
              })
            );
          } else {
            claimDayX = (userData.daily.claimedDay || 0) + 1;
            if (claimDayX <= 10) {
              claimAmountX = 10 * Math.pow(2, claimDayX - 1);  
            } else {
              claimAmountX = 10000;  
            }
          }
        }
        
        if (canClaim) {
          setIsClaimed(true);
          
          // Update user balance with daily reward
          const currentBalance = userData.balance || 0;
          const newBalance = currentBalance + claimAmountX;
          
          await updateDoc(userRef, {
            balance: newBalance,
            daily: {
              claimedTime: serverTimestamp(),
              claimedDay: claimDayX,  
            },
          });
          
          // Update Redux state - CRITICAL PART
          dispatch(updateBalance(newBalance));
          
          // Also update user object in Redux to maintain consistency
          dispatch(setUser({
            ...user,
            balance: newBalance,
            daily: {
              claimedTime: new Date(),
              claimedDay: claimDayX,
            }
          }));
          
          // Show coin animation
          dispatch(setCoinShow(true));
          
          // Show success message with claimed amount and new balance
          dispatch(
            setShowMessage({
              message: `Successfully claimed ₿ ${formatNumber(claimAmountX)}! New balance: ₿ ${formatNumber(newBalance)}`,
              color: "green",
            })
          );
          
          // Update local state
          setClaimDay(claimDayX);
          setClaimAmount(claimDayX <= 10 ? 10 * Math.pow(2, claimDayX - 1) : 10000);
        }
      } catch (error) {
        console.error("Error claiming daily reward:", error);
        
        // Fallback: Try to update with merge option
        try {
          const userRef = doc(db, "users", user.uid);
          const newBalance = (user.balance || 0) + claimAmount;
          
          await setDoc(userRef, {
            balance: newBalance,
            uid: user.uid,
            daily: {
              claimedTime: serverTimestamp(),
              claimedDay: claimDay,
            }
          }, { merge: true });
          
          // Update Redux state - CRITICAL PART
          dispatch(updateBalance(newBalance));
          
          // Also update user object in Redux to maintain consistency
          dispatch(setUser({
            ...user,
            balance: newBalance,
            daily: {
              claimedTime: new Date(),
              claimedDay: claimDay,
            }
          }));
          
          // Show coin animation
          dispatch(setCoinShow(true));
          
          dispatch(
            setShowMessage({
              message: `Successfully claimed ₿ ${formatNumber(claimAmount)}!`,
              color: "green",
            })
          );
          
          setIsClaimed(true);
        } catch (finalError) {
          console.error("Final fallback error:", finalError);
          setIsClaimed(false);
          dispatch(
            setShowMessage({
              message: "Error claiming reward. Please try again!",
              color: "red",
            })  
          );
        }
      } finally {
        setClaimDisabled(false);
      }
    };
    
    // Add a useEffect to initialize claim amount and day based on user data
    useEffect(() => {
      if (user && user.daily) {
        setClaimDay(user.daily.claimedDay || 1);
        const day = user.daily.claimedDay || 1;
        setClaimAmount(day <= 10 ? 10 * Math.pow(2, day - 1) : 10000);
      }
    }, [user]);
    
    return (
      <div className="daily-rewards-container">
        {/* Your UI components here */}
        <button 
          onClick={handleClaim}
          disabled={claimDisabled || isClaimed}
          className={`claim-button ${claimDisabled || isClaimed ? 'disabled' : 'active'}`}
        >
          {claimDisabled ? 'Processing...' : isClaimed ? 'Claimed' : `Claim ₿ ${formatNumber(claimAmount)}`}
        </button>
      </div>
    );
}

export default Daily;


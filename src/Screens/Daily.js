import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../features/userSlice";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { setShowMessage } from "../features/messageSlice";

function Daily() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [claimAmount, setClaimAmount] = useState(10);
    const [claimDay, setClaimDay] = useState(1);
    const [isClaimed, setIsClaimed] = useState(false);
    const [claimDisabled, setClaimDisabled] = useState(false);
    
    const formatNumber = (num) => {
        // Convert the number to a string with a fixed number of decimal places
        let numStr = num.toFixed(3);
        // Split the number into integar and decimal parts
        let [intPart, decPart] = numStr.split(".");
        // Add thousand seprators to the integer part
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        // If the number is less than 0.01, keep 3 decimal places
        if (num < 0.01) {
          return `${intPart},${decPart}`;  
        }
        // For other numbers, keep 3 decimal places
        decPart = decPart.slice(0, 2);
        // Always return the formatted number with 2 decimal places
        return `${intPart}, ${decPart}`;
    };
    
    const calculateClaimAmount = async () => {
      if (!user) return;
      
      try {
        // Check if user document exists
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
            mineRate: 0.001,
            isMining: false,
            miningStartedTime: null,
            daily: {
              claimedTime: null,
              claimedDay: 0,
            }
          });
          
          setIsClaimed(false);
          setClaimDay(1);
          setClaimAmount(10);
          return;
        }
        
        const userData = userSnap.data();
        
        if (!userData.daily || !userData.daily.claimedTime) {
          setIsClaimed(false);
          setClaimDay(1);
          setClaimAmount(10);
          return;
        }
        
        const lastClaimTime = userData.daily.claimedTime.toDate();
        const now = new Date();
        const hoursDiff = (now - lastClaimTime) / (1000 * 3600);
        
        if (hoursDiff < 24) {
          setIsClaimed(true);
          setClaimDay(userData.daily.claimedDay || 1);
        } else if (hoursDiff >= 48) {
          if (!claimDisabled) {
            dispatch(
              setShowMessage({
                message: "You skipped one day",
                color: "red",
              })
            );  
          }
          setIsClaimed(false);
          setClaimDay(1);
          setClaimAmount(10);
        } else {
          setIsClaimed(false);
          const newDay = (userData.daily.claimedDay || 0) + 1;
          setClaimDay(newDay);
          if (newDay <= 10) {
            setClaimAmount(10 * Math.pow(2, newDay - 1));  
          } else {
            setClaimAmount(10000);  
          }  
        }
      } catch (error) {
        console.error("Error calculating claim amount:", error);
      }
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
          await setDoc(userRef, {
            uid: user.uid,
            userImage: user.userImage || null,
            firstName: user.firstName || "Guest",
            lastName: user.lastName || "User",
            userName: user.userName || "guest_user",
            balance: 100 + claimAmount, // Default starting balance + reward
            mineRate: 0.001,
            isMining: false,
            miningStartedTime: null,
            daily: {
              claimedTime: serverTimestamp(),
              claimedDay: 1,
            }
          });
          
          dispatch(
            setShowMessage({
              message: `Successfully claimed ₿ ${formatNumber(claimAmount)}! New balance: ₿ ${formatNumber(100 + claimAmount)}`,
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
          await setDoc(userRef, {
            balance: (user.balance || 0) + claimAmount,
            uid: user.uid,
            daily: {
              claimedTime: serverTimestamp(),
              claimedDay: claimDay,
            }
          }, { merge: true });
          
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
    
    useEffect(() => {
      calculateClaimAmount();
      
      // Set up interval to recalculate claim amount every minute
      const interval = setInterval(() => {
        calculateClaimAmount();
      }, 60000);
      
      return () => clearInterval(interval);
    }, [user]);
    
    return (
      <div className="text-white">
        <div className="flex items-center justify-center py-10">
          <div className="rounded-full p-4">
            <img className="w-28 h-28 object-contain" src={require("../Assets/charge.png")} alt="Daily Reward" />
          </div>  
        </div>
        <p className="text-center font-bold text-3x1">Daily rewards</p>
        <p className="text-center text-lg mt-2">
          Here you can claim your rewards  
        </p>
        <p className="text-center text-x1 font-bold mt-4">(Day {claimDay})</p>
        <div className="mx-10 mt-20">
          {isClaimed ? (
            <button
              disabled
              className="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded cursor-not-allowed"
            >
              Claimed for today
            </button>  
          ) : (
            <button
              disabled={claimDisabled}
              onClick={handleClaim}
              className={`w-full ${
                claimDisabled ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-700"
              } text-white font-bold py-2 px-4 rounded`}  
            >
              Claim ₿ {formatNumber(claimAmount)}  
            </button>
          )}    
        </div>
      </div>
    );
}

export default Daily;

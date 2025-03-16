import React from "react";
import { useState } from "react";
import { selectUser } from "../features/userSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { selectCalculated } from "../features/calculateSlice";
import { setShowMessage } from "../features/messageSlice";
import { setCoinShow } from "../features/coinShowSlice";

function MiningButton() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const calculate = useSelector(selectCalculated);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [claimDisabled, setClaimDisabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Add loading state
  const MAX_MINE_RATE = 100.0;

  // Early return with loading state if user data or calculate data isn't loaded yet
  if (!user || !calculate) {
    return <div className="text-white p-4">Loading mining data...</div>;
  }

  // Removed unused calculateMinedValue function

  const startFarming = async () => {
    // Prevent multiple clicks or starting mining when already mining
    if (isProcessing || isMining) {
      if (isMining) {
        dispatch(
          setShowMessage({
            message: "Mining is already in progress!",
            color: "yellow",
          })
        );
      }
      return;
    }
    
    setIsProcessing(true);
    try {
      dispatch(
        setShowMessage({
          message: "Mining is starting...",
          color: "blue",
        })
      );
      
      // First check if user is already mining to prevent duplicate mining sessions
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      // Check if user document exists in Firestore
      if (!userSnap.exists()) {
        // Create the user document if it doesn't exist
        console.log("Creating user document in Firestore for:", user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          userImage: user.userImage,
          firstName: user.firstName || "Guest",
          lastName: user.lastName || "User",
          userName: user.userName || "guest_user",
          languageCode: user.languageCode || "en",
          referrals: user.referrals || {},
          referredBy: user.referredBy || null,
          isPremium: user.isPremium || false,
          balance: user.balance || 100,
          mineRate: user.mineRate || 0.001,
          isMining: false,
          miningStartedTime: null,
          daily: user.daily || {
            claimedTime: null,
            claimedDay: 0,
          },
          links: user.links || {},
        });
        console.log("User document created successfully");
      } else if (userSnap.exists() && userSnap.data().isMining) {
        dispatch(
          setShowMessage({
            message: "Mining is already in progress!",
            color: "yellow",
          })
        );
        setIsProcessing(false);
        return;
      }
      
      await updateDoc(userRef, {
        isMining: true,
        miningStartedTime: serverTimestamp(),
      });
      
      dispatch(
        setShowMessage({
          message: "Mining started successfully!",
          color: "green",
        })
      );
    } catch (error) {
      console.error("Error starting farming:", error);
      
      // Fallback: Try to update with merge option
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          isMining: true,
          miningStartedTime: serverTimestamp()
        }, { merge: true });
        
        dispatch(
          setShowMessage({
            message: "Mining started successfully!",
            color: "green",
          })
        );
      } catch (finalError) {
        console.error("Final fallback error:", finalError);
        dispatch(
          setShowMessage({
            message: `Error: ${error.message || "Please try again!"}`,
            color: "red",
          })
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const claimRewards = async () => {
    if (claimDisabled || isProcessing) return; // Prevent multiple clicks
    
    setClaimDisabled(true);
    setIsProcessing(true);
    try {
      dispatch(
        setShowMessage({
          message: "Claiming coins in progress...",
          color: "green",
        })
      );
      
      // Reference to user document
      const userRef = doc(db, "users", user.uid);
      
      // First, verify the user is actually mining
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
        
        dispatch(
          setShowMessage({
            message: "No active mining session found!",
            color: "red",
          })
        );
        setClaimDisabled(false);
        setIsProcessing(false);
        return;
      }
      
      if (!userSnap.data().isMining) {
        dispatch(
          setShowMessage({
            message: "No active mining session found!",
            color: "red",
          })
        );
        setClaimDisabled(false);
        setIsProcessing(false);
        return;
      }
      
      // Get server timestamp more reliably
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
      
      // Get mining start time
      const miningStartedTime = updatedSnap.data().miningStartedTime;
      
      if (!miningStartedTime) {
        throw new Error("Mining start time not found");
      }
      
      // Calculate time difference in milliseconds
      const timeDifference = serverNow.toMillis() - miningStartedTime.toMillis();
      
      // Check if 6 hours (21600000 milliseconds) have passed
      if (timeDifference >= 21600000) {
        dispatch(setCoinShow(true));
        
        // Calculate mined amount - note we're using the server timestamp objects directly
        const minedAmount = updatedSnap.data().mineRate * (21600000 / 1000);
        const roundedMinedAmount = Math.round(minedAmount * 1000) / 1000;
        
        console.log("Mined amount:", roundedMinedAmount);
        
        const newBalance = Number((updatedSnap.data().balance + roundedMinedAmount).toFixed(2));
        
        await updateDoc(userRef, {
          balance: newBalance,
          isMining: false,
          miningStartedTime: null,
        });
        
        // Handle referral bonus if applicable
        const referredBy = updatedSnap.data().referredBy;
        if (referredBy) {
          try {
            const referralBonus = Number((roundedMinedAmount * 0.1).toFixed(2));
            const referredDoc = doc(db, "users", referredBy);
            const referrerSnapshot = await getDoc(referredDoc);
            
            if (referrerSnapshot.exists()) {
              const referrerBalance = referrerSnapshot.data().balance;
              const referrerReferrals = referrerSnapshot.data().referrals || {};
              const referralData = referrerReferrals[user.uid] || { addedValue: 0 };
              const referrerAddedValue = referralData.addedValue;
              
              const updatedBalance = Number((referrerBalance + referralBonus).toFixed(2));
              const updatedAddedValue = Number((referrerAddedValue + referralBonus).toFixed(2));
              
              await setDoc(
                referredDoc,
                {
                  referrals: {
                    [user.uid]: {
                      addedValue: updatedAddedValue,
                    },
                  },
                  balance: updatedBalance,
                },
                { merge: true }
              );
            }
          } catch (referralError) {
            console.error("Error processing referral bonus:", referralError);
            // Continue execution even if referral bonus fails
          }
        }
        
        dispatch(
          setShowMessage({
            message: `Successfully claimed ${roundedMinedAmount.toFixed(3)} coins!`,
            color: "green",
          })
        );
      } else {
        console.log("Not enough time has passed to claim rewards");
        const hoursLeft = Math.floor((21600000 - timeDifference) / 3600000);
        const minutesLeft = Math.floor(((21600000 - timeDifference) % 3600000) / 60000);
        
        dispatch(
          setShowMessage({
            message: `Mining not complete yet. ${hoursLeft}h ${minutesLeft}m remaining.`,
            color: "yellow",
          })
        );
        dispatch(setCoinShow(false));
      }
    } catch (error) {
      console.error("Error claiming rewards:", error);
      
      // Fallback: Try to update with merge option
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          isMining: false,
          miningStartedTime: null,
          uid: user.uid
        }, { merge: true });
        
        dispatch(
          setShowMessage({
            message: "Mining session reset due to error.",
            color: "yellow",
          })
        );
      } catch (finalError) {
        console.error("Final fallback error:", finalError);
        dispatch(
          setShowMessage({
            message: `Error: ${error.message || "Please try again!"}`,
            color: "red",
          })
        );
      }
      
      dispatch(setCoinShow(false));
    } finally {
      setClaimDisabled(false);
      setIsProcessing(false);
    }
  };

  const upgradeMinerate = async () => {
    if (isProcessing) return; // Prevent multiple clicks
    
    setIsProcessing(true);
    try {
      const nextRate = Math.min(
        addPrecise(user.mineRate, getUpgradeStep(user.mineRate)),
        MAX_MINE_RATE
      );
      const price = getUpgradePrice(nextRate);
      
      // Verify balance is sufficient before proceeding
      if (user.balance < price) {
        dispatch(
          setShowMessage({
            message: "Insufficient balance for upgrade!",
            color: "red",
          })
        );
        setIsProcessing(false);
        return;
      }
      
      dispatch(
        setShowMessage({
          message: "Upgrading in progress...",
          color: "blue",
        })
      );
      
      const newBalance = Number((user.balance - price).toFixed(2));
      setShowUpgrade(false);
      
      await updateDoc(doc(db, "users", user.uid), {
        balance: newBalance,
        mineRate: nextRate,
      });
      
      dispatch(
        setShowMessage({
          message: `Mine rate upgraded to ${formatNumber(nextRate)} ₿/s!`,
          color: "green",
        })
      );
    } catch (error) {
      console.error("Error upgrading mine rate:", error);
      
      // Fallback: Try to update with merge option
      try {
        const nextRate = Math.min(
          addPrecise(user.mineRate, getUpgradeStep(user.mineRate)),
          MAX_MINE_RATE
        );
        const price = getUpgradePrice(nextRate);
        const newBalance = Number((user.balance - price).toFixed(2));
        
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          balance: newBalance,
          mineRate: nextRate,
          uid: user.uid
        }, { merge: true });
        
        dispatch(
          setShowMessage({
            message: `Mine rate upgraded to ${formatNumber(nextRate)} ₿/s!`,
            color: "green",
          })
        );
      } catch (finalError) {
        console.error("Final fallback error:", finalError);
        dispatch(
          setShowMessage({
            message: `Error: ${error.message || "Please try again!"}`,
            color: "red",
          })
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const addPrecise = (a, b) => {
    return parseFloat((a + b).toFixed(3));
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0,00"; // Handle null/undefined values
    
    // Convert the number to a string with a fixed number of decimal places
    let numStr = num.toFixed(3);
    
    // Split the number into integer and decimal parts
    let [intPart, decPart] = numStr.split(".");
    
    // Add thousand separators to the integer part
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    // If the number is less than 0.01, keep 3 decimal places
    if (num < 0.01) {
      return `${intPart},${decPart}`;
    }
    
    // For other numbers, keep 2 decimal places
    decPart = decPart.slice(0, 2);
    
    // Return the formatted number
    return `${intPart},${decPart}`;
  };

  const getUpgradeStep = (currentRate) => {
    if (currentRate < 0.01) return 0.001;
    if (currentRate < 0.1) return 0.01;
    if (currentRate < 1) return 0.1;
    if (currentRate < 10) return 1;
    return 10;
  };

  const getUpgradePrice = (nextRate) => {
    return Math.ceil(nextRate * 1000);
  };

  const getNextUpgradeRate = () => {
    const step = getUpgradeStep(user.mineRate);
    return Math.min(addPrecise(user.mineRate, step), MAX_MINE_RATE);
  };

  // Default values for user properties if they don't exist
  const isMining = user.isMining || false;
  const mineRate = user.mineRate || 0;
  const balance = user.balance || 0;
  // Create safe defaults for calculate properties
  const canUpgrade = calculate.canUpgrade || false;
  const canClaim = calculate.canClaim || false;
  const progress = calculate.progress || 0;
  const mined = calculate.mined || 0;
  const remainingTime = calculate.remainingTime || { hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className="relative w-full mx-4">
      <div className="absolute -top-12 left-0 text-white text-lg bg-gray-800 p-2 rounded">
        Balance: ₿ {formatNumber(balance)}
      </div>
      {/* Mining tracking display */}
      {isMining && (
        <div className="absolute -top-24 left-0 right-0 text-white text-sm bg-gray-800 p-2 rounded">
          <div className="flex justify-between items-center">
            <span>Mining Speed: ₿ {formatNumber(mineRate)}/s</span>
            <span>Level: {Math.floor(mineRate * 1000)}</span>
          </div>
        </div>
      )}
      {!showUpgrade && !isMining && (
        <button
          onClick={() => setShowUpgrade(true)}
          className={`absolute -top-3 right-0 text-xs text-black font-bold py-1 px-2 rounded ${
            canUpgrade
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!canUpgrade || isProcessing}
        >
          {mineRate < MAX_MINE_RATE ? "Upgrade" : "Max Upgrade"}
        </button>     
      )}  
      {showUpgrade && (
        <div
          className="absolute -bottom-[130px] left-0 w-full bg-gray-900 p-4 rounded-lg transform transition-all duration-300 ease-in-out"
          style={{ transform: "translateY(-100%)" }}
        >
          {mineRate < MAX_MINE_RATE ? (
            <div>
              <p className="text-white mb-2 -mt2 text-center">
                Upgrade to {formatNumber(getNextUpgradeRate())} ₿/s
              </p>
              <button
                onClick={upgradeMinerate}
                disabled={isProcessing}
                className={`w-full ${isProcessing ? 'bg-gray-500' : 'bg-yellow-500 hover:bg-yellow-600'} text-black font-bold py-2 px-4 rounded`}
              >
                {isProcessing ? 'Processing...' : `Cost: ₿ ${formatNumber(getUpgradePrice(getNextUpgradeRate()))}`}
              </button>
            </div>   
          ) : ( 
            <div className="text-white text-center font-bold py-2">
              Maximum upgrade reached!
            </div>           
          )}
          <button
            onClick={() => setShowUpgrade(false)}
            disabled={isProcessing}
            className="w-full mt-2 bg-red-500 text-white font-bold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      )}
      
      {!showUpgrade && !isMining && (
        <button
          onClick={startFarming}
          disabled={isProcessing || isMining}
          className={`w-full ${
            isProcessing || isMining ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"
          } text-white font-bold py-2 px-4 rounded`}
        >
          {isProcessing ? "Processing..." : "Start Mining"}
        </button>
      )}
      
      {!showUpgrade && isMining && (
        <div className="w-full flex flex-col items-center justify-center space-y-2">
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="w-full flex justify-between text-white text-sm">
            <span>Mined: ₿ {formatNumber(mined)}</span>
            <span>
              {remainingTime.hours}h {remainingTime.minutes}m remaining
            </span>
          </div>
          <button
            onClick={claimRewards}
            disabled={!canClaim || claimDisabled || isProcessing}
            className={`w-full mt-2 ${
              canClaim && !claimDisabled && !isProcessing
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gray-500"
            } text-white font-bold py-2 px-4 rounded`}
          >
            {isProcessing
              ? "Processing..."
              : canClaim
              ? "Claim Rewards"
              : "Mining in Progress..."}
          </button>
        </div>
      )}
    </div>
  );
}

export default MiningButton;

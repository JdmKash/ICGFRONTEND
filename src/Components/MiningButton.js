import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser, setUser } from "../features/userSlice";
import { selectCalculate, startMining, stopMining, resetMining } from "../features/calculateSlice";
import { setShowMessage } from "../features/messageSlice";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { setCoinShow } from "../features/coinShowSlice";
import { updateBalance } from "../features/balanceSlice";

function MiningButton() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const calculate = useSelector(selectCalculate);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Log user and calculate data for debugging
    console.log("User data in MiningButton:", user);
    console.log("Calculate data in MiningButton:", calculate);
    console.log("Current mined amount:", calculate ? calculate.mined : 0);
  }, [user, calculate]);

  const handleStartMining = async () => {
    if (!user || !user.uid) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log("Creating user document in Firestore for:", user.uid);
        await setDoc(userRef, {
          ...user,
          isMining: true,
          miningStartedTime: serverTimestamp()
        });
        console.log("User document created successfully");
      } else {
        await updateDoc(userRef, {
          isMining: true,
          miningStartedTime: serverTimestamp()
        });
      }
      
      console.log("Starting mining with timestamp:", serverTimestamp());
      
      // Update Redux state
      dispatch(startMining({
        miningStartedTime: Date.now()
      }));
      
      // Update user in Redux
      dispatch(setUser({
        ...user,
        isMining: true,
        miningStartedTime: Date.now()
      }));
      
      // Show success message
      dispatch(
        setShowMessage({
          message: "Mining started successfully!",
          color: "green",
        })
      );
    } catch (error) {
      console.error("Error starting mining:", error);
      dispatch(
        setShowMessage({
          message: "Error starting mining. Please try again.",
          color: "red",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMining = async () => {
    if (!user || !user.uid) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      
      await updateDoc(userRef, {
        isMining: false,
        miningStartedTime: null
      });
      
      // Update Redux state
      dispatch(stopMining());
      
      // Update user in Redux
      dispatch(setUser({
        ...user,
        isMining: false,
        miningStartedTime: null
      }));
      
      // Show success message
      dispatch(
        setShowMessage({
          message: "Mining stopped successfully!",
          color: "green",
        })
      );
    } catch (error) {
      console.error("Error stopping mining:", error);
      dispatch(
        setShowMessage({
          message: "Error stopping mining. Please try again.",
          color: "red",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!user || !user.uid || !calculate || calculate.mined <= 0) return;
    
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
      const currentBalance = userData.balance || 0;
      const minedAmount = calculate.mined;
      const newBalance = currentBalance + minedAmount;
      
      // Update Firestore
      await updateDoc(userRef, {
        balance: newBalance,
        isMining: false,
        miningStartedTime: null
      });
      
      // Update Redux state - CRITICAL PART
      dispatch(updateBalance(newBalance));
      
      // Also update user object in Redux to maintain consistency
      dispatch(setUser({
        ...user,
        balance: newBalance,
        isMining: false,
        miningStartedTime: null
      }));
      
      // Reset mining state
      dispatch(resetMining());
      
      // Show success message
      dispatch(
        setShowMessage({
          message: `Successfully claimed ${minedAmount.toFixed(3)} coins!`,
          color: "green",
        })
      );
      
      // Show coin animation
      dispatch(setCoinShow(true));
      
      console.log("Mining reward claimed successfully:", minedAmount);
    } catch (error) {
      console.error("Error claiming mining reward:", error);
      dispatch(
        setShowMessage({
          message: "Error claiming reward. Please try again.",
          color: "red",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mining-button-container">
      {isLoading ? (
        <button className="mining-button loading" disabled>
          <div className="loading-spinner"></div>
        </button>
      ) : calculate && calculate.mined > 0 ? (
        <button className="mining-button claim" onClick={handleClaim}>
          Claim {calculate.mined.toFixed(3)} Coins
        </button>
      ) : user.isMining ? (
        <button className="mining-button stop" onClick={handleStopMining}>
          Stop Mining
        </button>
      ) : (
        <button className="mining-button start" onClick={handleStartMining}>
          Start Mining
        </button>
      )}
      
      {calculate && calculate.progress > 0 && (
        <div className="mining-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${Math.min(calculate.progress * 100, 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default MiningButton;

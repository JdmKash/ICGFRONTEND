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

  const MAX_MINE_RATE = 100.0;

  const calculateMinedValue = (minedStartedTime, mineRate) => {
    if (!minedStartedTime || !mineRate) return 0;

    const now = Date.now();
    const totalMiningTime = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    let elapsedTime = now - minedStartedTime;

    elapsedTime = Math.round(elapsedTime / 1000) * 1000;

    if(elapsedTime >= totalMiningTime) {
      // Mining is complete, return maximum possible mined value
      return mineRate * (totalMiningTime / 1000);
    }

    // Calculate mined value based on elapsed time
    const minedValue = mineRate * (elapsedTime / 1000);

    // Round to 3 decimal places to avoid floating point precision issues
    return Math.round(minedValue * 1000) / 1000;
  };

  const startFarming = async () => {
    try {
      dispatch(
        setShowMessage({
          message: "Mining is starting...",
          color: "blue",
        })
      );
      await updateDoc(doc(db, "users", user.uid), {
        isMining: true,
        miningStartedTime: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error starting farming:", error);
      dispatch(
        setShowMessage({
          message: "Error. Please try again!",
          color: "red",
        })
      );
    }
  };

  const claimRewards = async () => {
    try {
      dispatch(
        setShowMessage({
          message: "Claiming coins in progress...",
          color: "green",
        })
      );
      setClaimDisabled(true);
      // Get the current server timestamp
      const getServerTime = async (db,userId) => {
        await updateDoc(doc(db, "users", userId), {
          time: serverTimestamp(),
        });

        const checkTime = async () => {
          const docSnap = await getDoc(doc(db, "users", userId));
          const serverTime = docSnap.data()?.time;

          if (serverTime) {
            return serverTime; 
          } else {
            return new Promise((resolve) => {
              setTimeout(() => resolve(checkTime()), 1000);
            });
          }
        };

        return checkTime();
      };

      // Usage
      const serverNow = await getServerTime(db, user.userId);

      // Calculated the time difference in milliseconds
      const timeDifference = serverNow.tomillis() - user.miningStartedTime;

      // Check if 6 hours (21600000 milliseconds) have passed
      if (timeDifference >= 21600000) {
        dispatch(setCoinShow(true));

        const minedAmount = calculateMinedValue(
          user.miningStartedTime,
          user.mineRate,
          serverNow
        );
        console.log("Mined amount:", minedAmount);

        const newBalance = Number((user.balance + minedAmount).toFixed(2));

        await updateDoc(doc(db, "users", user.userId), {
          balance: newBalance,
          isMining: false,
          miningStartedTime: null,
        });

        if (user.referredBy) {
          const referralBonus = Number((minedAmount * 0.1).toFixed(2));
          const referredDoc = doc(db, "users", user.referredBy);
          const referrerSnapshot = await getDoc(referredDoc);

          if (referrerSnapshot.exists()) {
            const referrerBalance = referrerSnapshot.data().balance;
            const referrerAddedValue =
              referrerSnapshot.data().referrals[user.uid].addedValue;
            const updatedBalance = Number(
              (referrerBalance + referralBonus).toFixed(2)
            );
            const updatedAddedValue = Number(
              (referrerAddedValue + referralBonus).toFixed(2)
            );
            
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
              {merge: true }
            );
          }
        }
        setClaimDisabled(false);
      } else {
        console.log("Not enough time has passed to claim rewards");
        // Optionally, you can show a message to the user
        dispatch(
          setShowMessage({
            message: "error. Please try again!",
            color: "red",
          })
        );
      }
    } catch (error) {
      console.error("Error claiming rewards:", error);
      dispatch(
        setShowMessage({
          message: "Error. Please try again!",
          color: "red", 
        })
      );
      dispatch(setCoinShow(false));
      setClaimDisabled(false);
    }
  };

  const upgradeMinerate = async () => {
    try {
      dispatch(
        setShowMessage({
          message: "Upgrading in progress...",
          color: "blue",
        })
      );

      const nextRate = Math.min(
        addPrecise(user.mineRate, getUpgradeStep(user.mineRate)),
        MAX_MINE_RATE
      );
      const price = getUpgradePrice(getNextUpgradeRate());
      const newBalance = Number((user.balance - price).toFixed(2));

      setShowUpgrade(false);

      if (user.balance >= price) {
        await updateDoc(doc(db, "users", user.userId), {
          balace: newBalance,
          mineRate: nextRate,
        });
      }
    } catch (error) {
      console.error("Error upgrading mine rate:", error);
      dispatch(
        setShowMessage({
          message: "Error. Please try again!",
          color: "red",
        })
      );
    }
  };

  const addPrecise = (a, b) => {
    return parseFloat((a + b).toFixed(3));
  };

  const formatNumber = (num) => {
    //Convert thenumber to a string with a fixed number of decimal places
    let numStr = num.toFixed(3);

    // Split the number into integar and decimal parts
    let [intPart, decPart] = numStr.split(".");

    // Add thousand separators to the integar part
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // If the number is less that 0.01, keep 3 decimal places
    if (num < 0.01) {
      return `${intPart},${decPart}`;
    }

    // For other numbers, keep 2 decimal places
    decPart = decPart.slice(0, 2);

    // Always return the formatted number with 2 decimal places
    return `${intPart},${decPart}`;
  };

  const getUpgradeStep = (rate) => {
    if (rate < 0.01) return 0.001;
    if (rate < 0.1) return 0.01;
    if (rate < 1) return 0.1;
    return Math.pow(10, Math.floor(Math.log10(rate)));
  };

  const getUpgradePrice =(nextRate) => {
    return nextRate * 100000;
  };

  const getNextUpgradeRate = () => {
    const step = getUpgradeStep(user.mineRate);
    return Math.min(addPrecise(user.mineRate, step), MAX_MINE_RATE);
  };

  return (
    <div className="relative w-full mx-4">
      <div className="absolute -top12 left-0 text-white text-lg bg-gray-800 p-2 rounded">
        Balance: ₿ {formatNumber(user.balance)}
      </div>

      {!showUpgrade && !user.isMining && (
        <button
          onClick={() => setShowUpgrade(true)}
          className={`absolute -top-3 right-0 text-xs text-black font-bold py-1 px-2 rounded ${
            calculate.canUpgrade
              ? "bg-greeen-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!calculate.canUpgrade}
        >
          {user.mineRate < MAX_MINE_RATE ? "Upgrade" : "Max Upgrade"}
        </button>     
      )}  
  </div>  
 ); 
}

export default MiningButton;
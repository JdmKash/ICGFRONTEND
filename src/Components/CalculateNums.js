import React, { useState, useEffect } from "react";
import { selectUser } from '../features/userSlice';
import { useDispatch, useSelector } from "react-redux";
import { setCalculated } from "../features/calculateSlice";

function CalculateNums() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);

    const [waiting, setWaiting] = useState(true);
    const [mined, setMined] = useState(0);
    const [remainingTime, setRemainingTime] = useState({
      hours: 6,
      minutes: 0,
      seconds: 0,
    });
    const [progress, setProgress] = useState(0);
    const [canClaim, setCanClaim] = useState(false);

    const MAX_MINE_RATE = 100.0;

    const calculateProgress = (miningStartedTime) => {
        if (!miningStartedTime) return 0;

        const now = Date.now();
        const totalMiningTime = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        const elapsedTime = now - miningStartedTime;

        if (elapsedTime >= totalMiningTime) {
            setCanClaim(true);
            return 100; // Mining is complete
        }

        const progress = (elapsedTime / totalMiningTime) * 100;
        return Math.min(Math.max(progress, 0), 100); // Ensure progress is between
    };

    const calculateMinedValue = (miningStartedTime, mineRate) => {
        if (!miningStartedTime || !mineRate) return 0;

        const now = Date.now();
        const totalMiningTime = 6 * 60 * 60 * 1000; // hours in milliseconds
        let elapsedTime = now - miningStartedTime;

        elapsedTime = Math.round(elapsedTime / 1000) * 1000;

        if (elapsedTime >= totalMiningTime) {
          // Mining is complete, return maximum possible mined value
          return mineRate * (totalMiningTime / 1000);
        }

        // Calculate mined value based on elapsed time
        const minedValue = mineRate * (elapsedTime / 1000);

        // Round to 3 decimal places to avoid floating point precision issues
        return Math.round(minedValue * 1000) /1000;
      };  

    const calculateRemainingTime = (miningStartedTime) => {
        if (!miningStartedTime) {
            return { hours: 6, minutes: 0, seconds: 0 };
        }

        const now = Date.now();
        const totalMiningTime = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        const endTime = miningStartedTime + totalMiningTime;
        const remainingTime = Math.max(endTime - now, 0);

        if (remainingTime === 0) {
            return { hours: 0, minutes: 0, seconds: 0 };
        }

        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor(
            (remainingTime % (60 * 60 * 1000)) / (60 * 1000)
        );
        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

        return { hours, minutes, seconds };
      };

    const addPrecise = (a, b) => {
      return parseFloat((a + b).toFixed(3));
    };

    const getUpgradeStep = (rate) => {
      if (rate < 0.01) return 0.001;
      if (rate < 0.1) return 0.01;
      if (rate < 1) return 0.1;
      return Math.pow(10, Math.floor(Math.log10(rate)));
    };

    const getUpgradePrice = (nextRate) => {
      return nextRate * 100000;
    };

    const getNextUpgradeRate = () => {
      const step = getUpgradeStep(user.mineRate);
      return Math.min(addPrecise(user.mineRate, step), MAX_MINE_RATE);
    };

    const canUpgrade =
      user.balance >= getUpgradePrice(getNextUpgradeRate()) &&
      user.mineRate < MAX_MINE_RATE;

    // Modified to use setInterval instead of Web Worker for better Telegram compatibility
    useEffect(() => {
        let intervalId = null;

        const updateFunction = () => {
            const updateProgress = () => {
                const currentProgress = calculateProgress(user.miningStartedTime);
                setProgress(currentProgress);  
            };
            
            const updateMinedValue = () => {
                const currentMinedValue = calculateMinedValue(
                    user.miningStartedTime,
                    user.mineRate  
                );
                setMined(currentMinedValue);
                setWaiting(false);
            };

            const updateRemainingTime = () => {
                const timeLeft = calculateRemainingTime(user.miningStartedTime);
                setRemainingTime(timeLeft);
                
                if (
                    timeLeft.hours === 0 &&
                    timeLeft.minutes === 0 &&
                    timeLeft.seconds === 0
                ) {
                    setRemainingTime({ hours: 0, minutes: 0, seconds: 0 });
                }
            };

            updateProgress();
            updateMinedValue();
            updateRemainingTime();
        };

        if (user && user.isMining && user.miningStartedTime) {
            // Initial update
            updateFunction();
            
            // Set up interval for updates
            intervalId = setInterval(updateFunction, 1000);
        } else {
            setProgress(0);
            setMined(0);
            setRemainingTime({ hours: 6, minutes: 0, seconds: 0 });
            setCanClaim(false);
            setWaiting(false);  
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [user?.isMining, user?.miningStartedTime, user?.mineRate]); 
    
    // Ensure we don't try to access properties of undefined user
    useEffect(() => {
        if (!waiting && user) {
            dispatch(
                setCalculated({
                    mined: mined,
                    remainingTime: remainingTime,
                    progress: progress,
                    canClaim: canClaim,
                    canUpgrade: canUpgrade,
                })  
            );
        }  
    }, [waiting, mined, remainingTime, progress, canClaim, canUpgrade, dispatch, user]);

    return <></>;
}

export default CalculateNums;

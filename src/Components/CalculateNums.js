import React, { useState, useEffect } from "react";
import { selectUser } from '../features/userSlice';
import { useDispatch, useSelector } from "react-redux";
import { setCalculated } from "../features/calculateSlice";

function CalculateNums() {
    console.log("CalculateNums component initializing");
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    console.log("User from Redux:", user ? "Available" : "Not available");

    const [waiting, setWaiting] = useState(true);
    const [mined, setMined] = useState(0);
    const [remainingTime, setRemainingTime] = useState({
      hours: 6,
      minutes: 0,
      seconds: 0,
    });
    const [progress, setProgress] = useState(0);
    const [canClaim, setCanClaim] = useState(false);
    const [calculationError, setCalculationError] = useState(null);

    const MAX_MINE_RATE = 100.0;

    // Simplified calculation functions with error handling
    const calculateProgress = (miningStartedTime) => {
        try {
            if (!miningStartedTime) return 0;

            const now = Date.now();
            const totalMiningTime = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
            const elapsedTime = now - miningStartedTime;

            if (elapsedTime >= totalMiningTime) {
                setCanClaim(true);
                return 100; // Mining is complete
            }

            const progress = (elapsedTime / totalMiningTime) * 100;
            return Math.min(Math.max(progress, 0), 100); // Ensure progress is between 0-100
        } catch (error) {
            console.error("Error calculating progress:", error);
            setCalculationError("progress");
            return 0;
        }
    };

    const calculateMinedValue = (miningStartedTime, mineRate) => {
        try {
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
            return Math.round(minedValue * 1000) / 1000;
        } catch (error) {
            console.error("Error calculating mined value:", error);
            setCalculationError("mined");
            return 0;
        }
    };  

    const calculateRemainingTime = (miningStartedTime) => {
        try {
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
        } catch (error) {
            console.error("Error calculating remaining time:", error);
            setCalculationError("time");
            return { hours: 6, minutes: 0, seconds: 0 };
        }
    };

    const addPrecise = (a, b) => {
        try {
            return parseFloat((a + b).toFixed(3));
        } catch (error) {
            console.error("Error in addPrecise:", error);
            return a;
        }
    };

    const getUpgradeStep = (rate) => {
        try {
            if (rate < 0.01) return 0.001;
            if (rate < 0.1) return 0.01;
            if (rate < 1) return 0.1;
            return Math.pow(10, Math.floor(Math.log10(rate)));
        } catch (error) {
            console.error("Error in getUpgradeStep:", error);
            return 0.001;
        }
    };

    const getUpgradePrice = (nextRate) => {
        try {
            return nextRate * 100000;
        } catch (error) {
            console.error("Error in getUpgradePrice:", error);
            return 0;
        }
    };

    const getNextUpgradeRate = () => {
        try {
            if (!user || !user.mineRate) return 0;
            const step = getUpgradeStep(user.mineRate);
            return Math.min(addPrecise(user.mineRate, step), MAX_MINE_RATE);
        } catch (error) {
            console.error("Error in getNextUpgradeRate:", error);
            return 0;
        }
    };

    const canUpgrade = user && 
        user.balance >= getUpgradePrice(getNextUpgradeRate()) &&
        user.mineRate < MAX_MINE_RATE;

    // Use direct interval instead of Web Worker for better compatibility
    useEffect(() => {
        console.log("Setting up calculation interval");
        let intervalId = null;

        const updateFunction = () => {
            try {
                console.log("Running calculation update");
                if (!user) {
                    console.log("User not available for calculations");
                    return;
                }

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
            } catch (error) {
                console.error("Error in calculation update:", error);
            }
        };

        if (user && user.isMining && user.miningStartedTime) {
            console.log("User is mining, setting up interval");
            // Initial update
            updateFunction();
            
            // Set up interval for updates
            intervalId = setInterval(updateFunction, 1000);
        } else {
            console.log("User is not mining or missing data");
            setProgress(0);
            setMined(0);
            setRemainingTime({ hours: 6, minutes: 0, seconds: 0 });
            setCanClaim(false);
            setWaiting(false);  
        }

        return () => {
            if (intervalId) {
                console.log("Cleaning up calculation interval");
                clearInterval(intervalId);
            }
        };
    }, [user]); 
    
    // Update Redux state with calculation results
    useEffect(() => {
        try {
            console.log("Updating Redux with calculation results");
            if (!waiting && user) {
                dispatch(
                    setCalculated({
                        mined: mined,
                        remainingTime: remainingTime,
                        progress: progress,
                        canClaim: canClaim,
                        canUpgrade: canUpgrade,
                        calculationError: calculationError,
                    })  
                );
            }
        } catch (error) {
            console.error("Error updating Redux with calculations:", error);
        }
    }, [waiting, mined, remainingTime, progress, canClaim, canUpgrade, calculationError, dispatch, user]);

    // Render nothing, this is just a calculation component
    return <div style={{ display: 'none' }}>Calculation Engine</div>;
}

export default CalculateNums;

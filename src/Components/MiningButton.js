import React, { useState, useEffect } from "react";
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
    const [isLoading, setIsLoading] = useState(true);

    const MAX_MINE_RATE = 100.0;

    // Add loading check
    useEffect(() => {
        if (user !== null) {
            setIsLoading(false);
        }
    }, [user]);

    // Early return if data isn't ready
    if (isLoading || !user || !calculate) {
        return (
            <div className="relative w-full mx-4">
                <div className="bg-gray-800 p-4 rounded-lg w-full">
                    <div className="text-white text-center">Loading...</div>
                </div>
            </div>
        );
    }

    const calculateMinedValue = (miningStartedTime, mineRate) => {
        if (!miningStartedTime || !mineRate) return 0;
        
        const now = Date.now();
        const totalMiningTime = 6 * 60 * 60 * 1000;
        let elapsedTime = now - miningStartedTime;
        elapsedTime = Math.round(elapsedTime / 1000) * 1000;

        if (elapsedTime >= totalMiningTime) {
            return mineRate * (totalMiningTime / 1000);
        }

        const minedValue = mineRate * (elapsedTime / 1000);
        return Math.round(minedValue * 1000) / 1000;
    };

    const startFarming = async () => {
        if (!user?.uid) {
            dispatch(setShowMessage({
                message: "User data not available. Please try again.",
                color: "red",
            }));
            return;
        }

        try {
            dispatch(setShowMessage({
                message: "Mining is starting...",
                color: "blue",
            }));
            
            await updateDoc(doc(db, "users", user.uid), {
                isMining: true,
                miningStartedTime: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error starting farming:', error);
            dispatch(setShowMessage({
                message: "Error starting mining. Please try again!",
                color: "red",
            }));
        }
    };

    const claimRewards = async () => {
        if (!user?.uid || !user?.miningStartedTime) {
            dispatch(setShowMessage({
                message: "Mining data not available. Please try again.",
                color: "red",
            }));
            return;
        }

        try {
            setClaimDisabled(true);
            dispatch(setShowMessage({
                message: "Claiming coins in progress...",
                color: "green",
            }));

            const getServerTime = async (db, userId) => {
                await updateDoc(doc(db, "users", userId), {
                    time: serverTimestamp(),
                });

                const checkTime = async () => {
                    const docSnap = await getDoc(doc(db, "users", userId));
                    const serverTime = docSnap.data()?.time;
                    return serverTime || new Promise((resolve) => {
                        setTimeout(() => resolve(checkTime()), 1000);
                    });
                };

                return checkTime();
            };

            const serverNow = await getServerTime(db, user.uid);
            const timeDifference = serverNow.toMillis() - user.miningStartedTime;

            if (timeDifference >= 21600000) {
                dispatch(setCoinShow(true));
                const minedAmount = calculateMinedValue(
                    user.miningStartedTime,
                    user.mineRate,
                    serverNow
                );

                const newBalance = Number((user.balance + minedAmount).toFixed(2));
                await updateDoc(doc(db, "users", user.uid), {
                    balance: newBalance,
                    isMining: false,
                    miningStartedTime: null,
                });

                if (user.referredBy) {
                    await handleReferralBonus(user, minedAmount);
                }
            } else {
                dispatch(setShowMessage({
                    message: "Not enough time has passed to claim rewards",
                    color: "red",
                }));
            }
        } catch (error) {
            console.error("Error claiming rewards:", error);
            dispatch(setShowMessage({
                message: "Error claiming rewards. Please try again!",
                color: "red",
            }));
            dispatch(setCoinShow(false));
        } finally {
            setClaimDisabled(false);
        }
    };

    // Helper function to handle referral bonus
    const handleReferralBonus = async (user, minedAmount) => {
        const referralBonus = Number((minedAmount * 0.1).toFixed(2));
        const referrerDoc = doc(db, "users", user.referredBy);
        const referrerSnapshot = await getDoc(referrerDoc);

        if (referrerSnapshot.exists()) {
            const referrerData = referrerSnapshot.data();
            const referrerBalance = referrerData.balance;
            const referrerAddedValue = referrerData.referrals[user.uid]?.addedValue || 0;
            
            await setDoc(referrerDoc, {
                referrals: {
                    [user.uid]: {
                        addedValue: Number((referrerAddedValue + referralBonus).toFixed(2)),
                    },
                },
                balance: Number((referrerBalance + referralBonus).toFixed(2)),
            }, { merge: true });
        }
    };

    // Rest of your helper functions remain the same
    const addPrecise = (a, b) => parseFloat((a + b).toFixed(3));
    const formatNumber = (num) => {
        let numStr = num.toFixed(3);
        let [intPart, decPart] = numStr.split(",");
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return num < 0.01 ? `${intPart},${decPart}` : `${intPart},${decPart.slice(0, 2)}`;
    };
    const getUpgradeStep = (rate) => {
        if (rate < 0.01) return 0.001;
        if (rate < 0.1) return 0.01;
        if (rate < 1) return 0.1;
        return Math.pow(10, Math.floor(Math.log10(rate)));
    };
    const getUpgradePrice = (nextRate) => nextRate * 100000;
    const getNextUpgradeRate = () => {
        const step = getUpgradeStep(user.mineRate);
        return Math.min(addPrecise(user.mineRate, step), MAX_MINE_RATE);
    };

    // Your JSX remains largely the same, but now protected by the early return
    return (
        <div className="relative w-full mx-4">
            {/* Rest of your JSX */}
            {/* Your existing render code here */}
        </div>
    );
}

export default MiningButton;
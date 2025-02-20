import React, { useState, useEffect } from "react";
import { selectUser } from '../features/userSlice';
import { useDispatch, useSelector } from "react-redux";
import { setCalculated } from "../features/calculateSlice";

function CalculateNums() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);

    const [waiting, setWaiting] =useState(true);
    const [mined, setMined] =useState(0);
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
        const totalMiningTime = 6 * 60 * 60 * 1000;
        const elapsedTime = now - miningStartedTime;

        if (elapsedTime >= totalMiningTime) {
            setCanClaim(true);
            return 100;
        }

        const progress = (elapsedTime / totalMiningTime) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

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

        return Math.round(minedValue * 1000) /1000;
      };  

    const calculateRemainingTime = (miningStartedTime) => {
        if (!miningStartedTime) {
            return { hours: 6, minutes: 0, seconds: 0 };
        }

        const now = Date.now();
        const totalMiningTime = 6 * 60 * 60 * 1000;
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

          useEffect(() => {
              let worker = null;

              const updateFunction = () => {
                const updateprogress = () => {
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

                updateprogress();
                updateMinedValue();
                updateRemainingTime();
              };

              if (user.isMining && user.miningStartedTime) {
                const workerCode = `
                      let interval = null;
                      self.onmessage = function(e) {
                        if (e.data === 'start') {
                          interval = setInterval(() => {
                            self.postMessage('tick');
                          }, 1000);
                        } else if (e.data === 'stop') {
                          clearInterval(interval);
                        }
                      };
                    `;

                const blob = new Blob([workerCode], { type: "application/javascript"});
                worker = new Worker(URL.createObjectURL(blob));
            
                worker.onmessage = updateFunction;
                worker.postMessage("start");
              } else {
                setProgress(0);
                setMined(0);
                setRemainingTime({ hours: 6, minutes: 0, seconds: 0 });
                setCanClaim(false);
                setWaiting(false);  
              }

              return () => {
                if (worker) {
                  worker.postMessage("stop");
                  worker.terminate();
                } 
              };
            }, [user.isMining, user.miningStartedTime, user.mineRate]); 
            

            useEffect(() => {
              if (!waiting) {
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
            }, [waiting, mined, remainingTime, progress, canClaim, canUpgrade, dispatch]);

  return <></>;
}

export default CalculateNums;
import React, { useEffect } from "react";
import Liders from "../Components/Liders"
import MiningButton from "../Components/MiningButton";
import UserRank from "../Components/userRank";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../features/userSlice";
import LoadingModul from "../Components/LoadingModul";
import { selectCalculated, setCalculated } from "../features/calculateSlice";
import backgroundImage from "../Assets/auction-2.png";

function Home() {
  const user = useSelector(selectUser);
  const calculate = useSelector(selectCalculated);
  const dispatch = useDispatch();
  
  // Ensure calculate state is initialized when Home component mounts
  useEffect(() => {
    if (user && !calculate) {
      console.log("Home: Initializing calculate state with default values");
      dispatch(
        setCalculated({
          mined: 0,
          remainingTime: { hours: 6, minutes: 0, seconds: 0 },
          progress: 0,
          canClaim: false,
          canUpgrade: false,
          updateError: null,
        })
      );
    }
  }, [user, calculate, dispatch]);

  // If user exists but calculate is still null, show a loading state
  if (user && !calculate) {
    return (
      <div
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        className="h-screen relative"
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            top: "0",
          }}
        >
          <div className="text-center">
            <LoadingModul size={60} />
            <p className="mt-4 text-white">Preparing mining data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {user && calculate ? (
        <div className="flex flex-col h-screen relative">
          <div className="flex items-center justify-venter mt-16">
            <MiningButton/>
          </div> 
          <div>
            <UserRank />
          </div> 
          <div>
            <Liders />
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
          className="h-screen relative"
        >
          <div
            style={{
              position: "absolute",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "100%",
              top: "0",
            }}  
          >
            <div className="text-center">
              <LoadingModul size={60} />
              <p className="mt-4 text-white">Loading game data...</p>
            </div>
          </div>
        </div>        
      )}
    </>
  );  
}

export default Home;

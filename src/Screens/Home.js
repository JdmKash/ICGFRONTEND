import React from "react";
import Liders from "../Components/Liders"
import MiningButton from "../Components/MiningButton";
import UserRank from "../Components/userRank";
import { useSelector } from "react-redux";
import { selectUser } from "../features/userSlice";
import LoadingModul from "../Components/LoadingModul";
import backgroundImage from "../Assets/auction-2.png";

function Home() {
  const user = useSelector(selectUser);
  
  // Super simple Home component that doesn't depend on calculate state
  return (
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
  );  
}

export default Home;

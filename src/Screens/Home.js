// Home.js
import React from "react";
import Liders from "../Components/Liders"
import MiningButton from "../Components/MiningButton";
import UserRank from "../Components/userRank";

function Home() {
  // Super simple Home component that doesn't depend on any state
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

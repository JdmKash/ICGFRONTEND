import React from "react";
import MiningButton from "../Components/MiningButton";

function Home() {
    return (
    <div className="flex flex-col h-screen relative">
      <div className="flex items-center justify-venter mt-16">
          <MiningButton/>
        </div> 
    </div>
    );
}

export default Home;
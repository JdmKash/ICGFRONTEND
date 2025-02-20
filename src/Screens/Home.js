import React from "react";
import MiningButton from "../Components/MiningButton";

function Home() {
    return (
    <div classname="flex flex-col h-screen relative">
      <div classname="flex items-center justify-venter mt-16">
          <MiningButton/>
        </div> 
    </div>
    );
}

export default Home;
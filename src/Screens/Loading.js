import React from "react";
import LoadingModule from "../Components/LoadingModule";
import backgroundImage from "../Assets/auction-2.png";

function Loading() {
    return(
      <div
      style={{
        backgroundImage:`url(${backgroundImage})`,
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
        width: "100%",
        bottom: "14%",
      }}
    >
      <LoadingModule size={60} />
    </div>  
  </div>   
 );
}

export default Loading;

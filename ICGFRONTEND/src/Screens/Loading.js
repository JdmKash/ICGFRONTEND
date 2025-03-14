import React from "react";
import LoadingModul from "../Components/LoadingModul";
import backgroundImage from "../Assets/auction-2.png";

function Loading({ stage = "loading" }) {
  // Add error handling for background image loading
  const handleImageError = (e) => {
    console.error("Error loading background image");
    // Set a fallback background color
    e.target.parentElement.style.backgroundColor = "#0b0b0b";
  };

  return(
    <div
      style={{
        backgroundImage:`url(${backgroundImage})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundColor: "#0b0b0b", // Fallback color if image fails to load
      }}
      className="h-screen relative"
      onError={handleImageError}
    >       
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          top: "0",
        }}
      >
        <div className="text-center">
          <LoadingModul size={60} />
          <p className="mt-4 text-white">Loading game...</p>
          
          {/* Debug info - shows current loading stage */}
          <p className="mt-2 text-xs text-gray-400">Stage: {stage}</p>
        </div>
      </div>  
    </div>   
   );
}

export default Loading;

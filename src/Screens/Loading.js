import React from "react";
import LoadingModul from "../Components/LoadingModul";
import backgroundImage from "../Assets/auction-2.png";

function Loading() {
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
          justifyContent: "center",
          alignItems: "center", // Added for better centering
          width: "100%",
          height: "100%", // Changed to full height for better visibility
          top: "0", // Position from top instead of bottom
        }}
      >
        <div className="text-center">
          <LoadingModul size={60} />
          <p className="mt-4 text-white">Loading game...</p> {/* Added loading text */}
        </div>
      </div>  
    </div>   
   );
}

export default Loading;

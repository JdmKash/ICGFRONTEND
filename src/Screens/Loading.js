import React from "react";
import LoadingModul from "../Components/LoadingModul";
import backgroundImage from "../Assets/auction-2.png";

function Loading({ stage = "initializing" }) {
  // Helper function to get user-friendly message based on stage
  const getStageMessage = () => {
    switch (stage) {
      case "initializing":
        return "Initializing...";
      case "telegram-init-start":
        return "Connecting to Telegram...";
      case "telegram-init-success":
        return "Telegram connected!";
      case "telegram-init-fallback":
        return "Running in standalone mode...";
      case "telegram-init-error":
        return "Error connecting to Telegram";
      case "firestore-connect":
        return "Connecting to database...";
      case "user-data-loaded":
        return "Loading your data...";
      case "new-user-created":
        return "Setting up your account...";
      case "user-creation-error":
        return "Error creating account";
      case "doc-processing-error":
        return "Error processing data";
      case "firestore-listener-error":
        return "Connection error";
      case "firestore-setup-error":
        return "Database connection error";
      default:
        return "Loading...";
    }
  };

  // Determine if there's an error based on stage
  const isError = stage && stage.includes("error");
  
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
          <LoadingModul size={60} theme={isError ? "error" : "light"} />
          
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p style={{ 
              fontSize: "16px", 
              fontWeight: "bold",
              color: isError ? "#ff6b6b" : "white" 
            }}>
              {getStageMessage()}
            </p>
            
            {isError && (
              <p style={{ 
                fontSize: "14px", 
                marginTop: "10px",
                maxWidth: "80%",
                margin: "10px auto"
              }}>
                Please try refreshing the page or check your connection
              </p>
            )}
            
            {/* Show stage for debugging - can be removed in production */}
            <p style={{ 
              fontSize: "10px", 
              marginTop: "5px",
              opacity: 0.7 
            }}>
              Stage: {stage}
            </p>
          </div>
        </div>
      </div>  
    </div>   
  );
}

export default Loading;

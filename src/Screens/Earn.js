import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import money from "../Assets/android-chrome-512x512.png";
import LinkButton from "../Components/LinkButton";
import { selectUser, setUser } from "../features/userSlice";

function Earn() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();

  // Verify ad SDK loading
  useEffect(() => {
    if (!window.show_9041692) {
      console.error("Ad SDK not loaded!");
      // Consider loading the SDK dynamically here
      const script = document.createElement('script');
      script.src = "https://correct-ad-provider-url.com/sdk.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleWatchAd = async () => {
    try {
      if (!window.show_9041692) {
        throw new Error("Ad service unavailable");
      }

      await window.show_9041692('pop');
      
      // Update local state first
      const newCoins = user.coins + 1000;
      dispatch(setUser({ ...user, coins: newCoins }));

      // Optional: Sync with backend
      // await fetch('/api/update-coins', {
      //   method: 'POST',
      //   body: JSON.stringify({ coins: newCoins })
      // });

    } catch (error) {
      console.error("Ad error:", error);
      // Handle different error types
      if (error.message.includes("network")) {
        alert("Please check your internet connection");
      } else {
        alert("Failed to load ad. Please try again later.");
      }
    }
  };

  return (
    <div className="text-white mb-24">
      {/* ... existing layout ... */}
      <button 
        onClick={handleWatchAd}
        className="flex items-center justify-between w-full bg-[#2e2e2e] rounded-xl p-4 mb-4 hover:bg-[#3e3e3e] transition-colors"
      >
        <div className="flex items-center space-x-4">
          <img 
            className="w-12 h-12 object-contain" 
            src={money}
            alt="Watch Ad" 
          />
          <span className="text-white font-semibold">Watch an Ad</span>
        </div>
        <span className="text-green-400 font-bold">+1000</span>
      </button>
    </div>
  );
}

export default Earn;
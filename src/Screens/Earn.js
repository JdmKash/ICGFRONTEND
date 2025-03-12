import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import money from "../Assets/android-chrome-512x512.png";
import LinkButton from "../Components/LinkButton";
import { selectUser } from "../features/userSlice";

function Earn() {
  const user = useSelector(selectUser);
  
  const handleWatchAd = () => {
    // Check if the MonetTag function exists in the global scope
    if (typeof window.show_9041692 === 'function') {
      // Rewarded Popup
      window.show_9041692('pop').then(() => {
        // user watch ad till the end or close it in interstitial format
        // your code to reward user for rewarded format
        console.log("Ad completed, user can be rewarded");
        // Add your reward logic here
      }).catch(e => {
        // user get error during playing ad
        // do nothing or whatever you want
        console.error("Ad error:", e);
      });
    } else {
      console.error("MonetTag function is not available");
    }
  };

  return (
    <div className="text-white mb-24">
      <div className="flex items-center justify-center py-8">
        <div className="rounded-full p-4">
          <img className="w-28 h-28 object-contain" src={money} alt="M" />
        </div>
      </div>
      <p className="text-center font-bold text-3x1">Earn coins</p>
      <div className="mx-4 mt-8">
        <p className="text-lg font-bold mb-4">Important tasks</p>
        {/* Referral Task */}
        <LinkButton
          image={'referral'}
          name={
            Object.keys(user.referrals || {}).length >= 10
              ? `You invited ${Object.keys(user.referrals || {}).length} friends!`
              : `Invite ${10 - Object.keys(user.referrals || {}).length} friends!`
          }
          amount={100000}
          link={"referral"}
        />
        
        {/* MonetTag Rewarded Ad Button */}
        <div 
          onClick={handleWatchAd}
          className="flex items-center justify-between bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-700"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 flex items-center justify-center bg-yellow-500 rounded-full mr-4">
              <span className="text-lg font-bold">🎥</span>
            </div>
            <span className="font-medium">Watch Ad to Earn Coins</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold text-yellow-400 mr-1">5000</span>
            <span className="text-xs text-yellow-400">coins</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Earn;
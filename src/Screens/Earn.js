import React from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../features/userSlice";
import RewardedAdsButton from "../Components/RewardedAdsButton";
import InterstitialAdButton from "../Components/InterstitialAdButton";
import "../styles/Earn.css";

function Earn() {
  const user = useSelector(selectUser);

  if (!user) {
    return <div className="text-white p-4">Loading user data...</div>;
  }

  return (
    <div className="earn-container">
      <h2 className="earn-title">Earn Coins</h2>
      
      <div className="earn-section">
        <h3>Watch Ads to Earn</h3>
        <p>Watch rewarded ads to earn coins. Limited to 10 ads every 24 hours.</p>
        <div className="ad-buttons-container">
          <RewardedAdsButton />
          <InterstitialAdButton />
        </div>
      </div>
      
      {/* Other earning methods can be added here */}
      <div className="earn-section">
        <h3>Invite Friends</h3>
        <p>Earn 10% of what your referrals mine!</p>
        {/* Referral component would go here */}
      </div>
    </div>
  );
}

export default Earn;

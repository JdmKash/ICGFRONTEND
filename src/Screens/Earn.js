import React from "react";
import { useSelector } from "react-redux";
import money from "../Assets/android-chrome-512x512.png";
import LinkButton from "../Components/LinkButton";
import { selectUser } from "../features/userSlice";

function Earn() {
  const user = useSelector(selectUser);
  const dailyAdLimit = 5; // Set daily ad view limit

  // Function to handle AdMob button click
  const handleAdMobClick = () => {
    if (user && user.telegramId) {
      const adUrl = `/view-ad?user_id=${user.telegramId}`;
      window.open(adUrl, '_blank', 'width=400,height=600');
    } else {
      alert("User ID not found. Please make sure you're logged in correctly.");
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
        
        {/* Monetag Ad Task */}
        <LinkButton
          image={'monetag'}
          name={
            user.adsWatched >= dailyAdLimit
              ? `Daily limit reached (${dailyAdLimit}/${dailyAdLimit})`
              : `Watch an Ad (${user.adsWatched || 0}/${dailyAdLimit})`
          }
          amount={50000}
          link={"watch-ad"}
          disabled={user.adsWatched >= dailyAdLimit}
        />
        
        {/* New AdMob Ad Task */}
        <LinkButton
          image={'admob'}
          name={
            user.admobAdsWatched >= dailyAdLimit
              ? `AdMob limit reached (${dailyAdLimit}/${dailyAdLimit})`
              : `Watch AdMob Ad (${user.admobAdsWatched || 0}/${dailyAdLimit})`
          }
          amount={75000}
          onClick={handleAdMobClick}
          disabled={user.admobAdsWatched >= dailyAdLimit}
        />

        {/* Referral Task */}
        <LinkButton
          image={'referral'}
          name={
            Object.keys(user.referrals).length >= 10
              ? `You invited ${Object.keys(user.referrals).length} friends!`
              : `Invite ${10 - Object.keys(user.referrals).length} friends!`
          }
          amount={100000}
          link={"referral"}
        />
      </div>
    </div>
  );
}

export default Earn;

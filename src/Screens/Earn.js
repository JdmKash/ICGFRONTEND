import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import { selectUser } from "../features/userSlice";
import money from "../Assets/android-chrome-512x512.png";
import LinkButton from "../Components/LinkButton";
import { RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";

const adUnitId = __DEV__ 
  ? TestIds.REWARDED 
  : "ca-app-pub-6315102990730207/7852992756"; 

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

function Earn() {
  const user = useSelector(selectUser);
  const [adLoaded, setAdLoaded] = useState(false);

  // Load the rewarded ad
  React.useEffect(() => {
    const unsubscribe = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    rewarded.load();

    return () => {
      unsubscribe();
    };
  }, []);

  // Show the rewarded ad
  const showAd = () => {
    if (adLoaded) {
      rewarded.show();
      setAdLoaded(false);
      rewarded.load(); // Preload next ad
    } else {
      alert("Ad is not ready yet. Try again later.");
    }
  };

  return (
    <View className="text-white mb-24">
      <View className="flex items-center justify-center py-8">
        <View className="rounded-full p-4">
          <Image className="w-28 h-28 object-contain" source={money} alt="M" />
        </View>  
      </View>
      <Text className="text-center font-bold text-3xl">Earn coins</Text>  
      <View className="mx-4 mt-8">
        <Text className="text-lg font-bold mb-4">Important tasks</Text>
        
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

        {/* Rewarded Ad Task */}
        <TouchableOpacity 
          onPress={showAd} 
          disabled={!adLoaded}
          style={{
            backgroundColor: adLoaded ? "#4CAF50" : "#888",
            padding: 12,
            borderRadius: 8,
            marginTop: 16,
            alignItems: "center"
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            {adLoaded ? "Watch Ad to Earn Coins" : "Loading Ad..."}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default Earn;

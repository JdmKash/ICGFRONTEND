import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import { useSelector } from "react-redux";
import { selectUser } from "../features/userSlice";
import money from "../Assets/android-chrome-512x512.png";
import LinkButton from "../Components/LinkButton";
import { AdMob, Platforms } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Initialize AdMob
const initializeAdMob = async () => {
  await AdMob.initialize({
    requestTrackingAuthorization: true,
    testingDevices: ['TEST_DEVICE_ID'],
    initializeForTesting: __DEV__,
  });
};

// Platform-specific ad unit IDs
const AD_UNITS = {
  rewarded: {
    android: 'ca-app-pub-6315102990730207/8899077588',
    ios: 'ca-app-pub-6315102990730207/7852992756'
  }
};

function Earn() {
  const user = useSelector(selectUser);
  const [adLoaded, setAdLoaded] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);

  // Initialize AdMob and load rewarded ad
  useEffect(() => {
    const initializeAds = async () => {
      if (Capacitor.isNativePlatform()) {
        await initializeAdMob();
        loadRewardedAd();
      }
    };

    initializeAds();
  }, []);

  // Load rewarded ad
  const loadRewardedAd = async () => {
    try {
      await AdMob.prepareRewardVideoAd({
        adId: getAdUnitId(),
        isTesting: __DEV__,
      });
      setAdLoaded(true);
    } catch (error) {
      console.error('Ad loading failed:', error);
    }
  };

  // Get platform-specific ad unit ID
  const getAdUnitId = () => {
    const platform = Capacitor.getPlatform();
    return AD_UNITS.rewarded[platform] || AD_UNITS.rewarded.android;
  };

  // Show rewarded ad
  const handleShowAd = async () => {
    if (!adLoaded) return;

    try {
      const { value } = await AdMob.showRewardVideoAd();
      if (value) {
        setCoinsEarned(prev => prev + value.amount);
        Alert.alert(`🎉 You earned ${value.amount} coins!`);
        // Add your coin reward logic here (e.g., update Redux store or backend)
      }
      loadRewardedAd(); // Reload for next use
    } catch (error) {
      console.error('Ad display failed:', error);
      setAdLoaded(false);
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
      <Text className="text-center text-lg mt-2">Total Earned from Ads: {coinsEarned} coins</Text>

      <View className="mx-4 mt-8">
        <Text className="text-lg font-bold mb-4">Important tasks</Text>

        {/* Original "Invite Friends" Task */}
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
          onPress={handleShowAd} 
          disabled={!adLoaded}
          className={`mt-4 p-4 rounded-lg ${
            adLoaded ? 'bg-green-500' : 'bg-gray-500'
          }`}
        >
          <Text className="text-white text-center font-bold">
            {adLoaded ? "🎥 Watch Ad & Earn 500 Coins" : "⏳ Loading Ad..."}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default Earn;
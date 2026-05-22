import React from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.BANNER : (Platform.OS === 'ios' ? 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy' : 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy');

export default function AdBanner() {
  return (
    <View
      style={{
        height: 50,
        backgroundColor: "#ddd",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 10,
        top: -10
      }}
    >
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

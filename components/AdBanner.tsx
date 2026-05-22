import { View, Text } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

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
        unitId={TestIds.BANNER}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          networkExtras: {
            collapsible:"bottom",
          },
        }}
      />
    </View>
  );
}
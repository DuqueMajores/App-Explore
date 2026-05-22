import React from 'react';
import { View, Text, Platform } from 'react-native';

// Importação condicional para evitar erros no ambiente Web
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (Platform.OS !== 'web') {
  try {
    const AdMob = require('react-native-google-mobile-ads');
    BannerAd = AdMob.BannerAd;
    BannerAdSize = AdMob.BannerAdSize;
    TestIds = AdMob.TestIds;
  } catch (e) {
    console.warn('Falha ao carregar react-native-google-mobile-ads:', e);
  }
}

// ID de bloco de anúncios fornecido pelo usuário
const adUnitId = __DEV__ 
  ? (TestIds ? TestIds.BANNER : 'ca-app-pub-3940256099942544/6300978111') 
  : 'ca-app-pub-2727232322523464/3370670885';

export default function AdBanner() {
  // Se estiver no ambiente Web ou se a biblioteca não carregou, exibe um placeholder
  if (Platform.OS === 'web' || !BannerAd) {
    return (
      <View
        style={{
          height: 50,
          backgroundColor: "#eee",
          justifyContent: "center",
          alignItems: "center",
          marginVertical: 10,
          top: -10,
          borderWidth: 1,
          borderColor: '#ddd',
          borderStyle: 'dashed'
        }}
      >
        <Text style={{ fontSize: 12, color: '#999' }}>Anúncio (Não disponível na Web)</Text>
      </View>
    );
  }

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

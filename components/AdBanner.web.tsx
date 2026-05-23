import { View, Text } from "react-native";

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
      <Text style={{ color: "#666", fontSize: 12 }}>
        Anúncios não disponíveis na versão Web
      </Text>
    </View>
  );
}
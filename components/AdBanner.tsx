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
      <Text style={{ fontSize: 12 }}>Publicidade</Text>
    </View>
  );
}
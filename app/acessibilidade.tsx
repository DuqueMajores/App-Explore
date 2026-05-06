import { View, Text, Switch } from "react-native";
import { useState } from "react";

export default function Acessibilidade() {
  const [screenReader, setScreenReader] = useState(false);

  return (
    <View>
      <Text>Leitura de Tela</Text>
      <Switch value={screenReader} onValueChange={setScreenReader} />
    </View>
  );
}
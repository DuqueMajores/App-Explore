import { View, Text, StyleSheet } from "react-native";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Notícias</Text>

      <Text style={styles.text}>
        Aplicativo mobile de leitura de notícias em tempo real usando NewsAPI.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  text: {
    fontSize: 18,
    color: "#555",
  },
});

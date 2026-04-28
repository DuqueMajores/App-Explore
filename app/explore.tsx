import { useLocalSearchParams } from "expo-router";
import { View, Text, Image, StyleSheet, Linking, TouchableOpacity } from "react-native";

export default function ExploreScreen() {
  const { title, desc, image, author, source, url } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Image source={{ uri: image as string }} style={styles.image} />

      <Text style={styles.source}>{source}</Text>

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.author}>
        {author || "Redação"}
      </Text>

      <Text style={styles.desc}>
        {desc}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Linking.openURL(url as string)}
      >
        <Text style={{ color: "#fff" }}>
          Ler notícia original
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#fff",
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginBottom: 15,
  },

  source: {
    color: "#007bff",
    fontWeight: "bold",
    marginBottom: 8,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },

  author: {
    color: "#777",
    marginBottom: 15,
  },

  desc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 25,
  },

  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
});
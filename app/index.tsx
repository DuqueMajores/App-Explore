import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
} from "react-native";

import { router } from "expo-router";

export default function HomeScreen() {
  const [search, setSearch] = useState("tecnologia");
  const [articles, setArticles] = useState([]);

  const API_KEY = 'dde2b5709e25424c9d31a5ebd0c60287';

  async function buscarNoticias() {
    const url = `https://newsapi.org/v2/everything?q=${search}&language=pt&sortBy=publishedAt&apiKey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    setArticles(data.articles || []);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>

      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="O que você quer ler hoje?"
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={buscarNoticias}>
          <Text style={{ color: "#fff" }}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/explore",
                params: {
                  title: item.title,
                  desc: item.description,
                  image: item.urlToImage,
                  author: item.author,
                  source: item.source?.name,
                  url: item.url,
                },
              })
            }
          >
            <Image
              source={{
                uri:
                  item.urlToImage ||
                  "https://via.placeholder.com/400x200",
              }}
              style={styles.image}
            />

            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text numberOfLines={3}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 20,
  },

  searchBox: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  button: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 12,
  },

  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 12,
    marginBottom: 15,
  },

  image: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
});
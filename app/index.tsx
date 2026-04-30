import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, StatusBar } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';

let persistenceArticles = [];
let persistenceSearch = "";

export default function HomeScreen() {
  const [search, setSearch] = useState(persistenceSearch);
  const [articles, setArticles] = useState(persistenceArticles);
  const API_KEY = 'dde2b5709e25424c9d31a5ebd0c60287';

  useEffect(() => {
    persistenceArticles = articles;
    persistenceSearch = search;
  }, [articles, search]);

  useEffect(() => {
    if (articles.length === 0) {
      buscarNoticias();
    }
  }, []);

  async function buscarNoticias() {
    const query = search.trim() || "Brasil";
    const url = `https://newsapi.org/v2/everything?q=${query}&language=pt&sortBy=publishedAt&apiKey=${API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.headerTitle}>Explore</Text>

      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar tendências..."
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity style={styles.searchButton} onPress={buscarNoticias}>
          <MaterialIcons name="search" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={articles}
        removeClippedSubviews={true}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.card}
            onPress={() => router.push({ pathname: "/explore", params: { ...item, source: item.source?.name, desc: item.description, image: item.urlToImage } })}
          >
            <Image
              source={{ uri: item.urlToImage || "https://via.placeholder.com/400x200" }}
              style={styles.cardImage}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardCategory}>{item.source?.name || "Notícia"}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:
  {
    flex: 1,
    backgroundColor: "#F8F9FA", paddingHorizontal: 20
  },
  headerTitle: {
    fontSize: 32, fontWeight: "800", color: "#1A1A1A", marginTop: 60, marginBottom: 20

  },
  searchContainer: {
    flexDirection: "row", marginBottom: 25, gap: 10

  },
  input:
  {
    flex: 1, backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 16, fontSize: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4
  },
  searchButton:
  {
    backgroundColor: "#4169E1", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, justifyContent: "center"

  },
  buttonText:
  {
    color: "#FFF", fontWeight: "600", fontSize: 15

  },
  card:
  {
    backgroundColor: "#FFF", borderRadius: 20, marginBottom: 20, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
  },
  cardImage:
  {
    width: "100%", height: 200

  },
  cardContent: { padding: 16 },
  cardCategory: { color: "#E63946", fontWeight: "bold", fontSize: 12, textTransform: "uppercase", marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 8, lineHeight: 24 },
  cardDesc: { fontSize: 14, color: "#666", lineHeight: 20 },
});
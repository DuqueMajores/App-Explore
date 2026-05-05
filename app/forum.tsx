import React, { useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useForum } from "../src/context/ForumContext";

export default function ForumScreen() {
  const { rooms } = useForum();
  const [search, setSearch] = useState("");

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      r.articleTitle.toLowerCase().includes(q)
    );
  }, [rooms, search]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fórum</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar salas..."
          placeholderTextColor="#CCC"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearButton}>
            <MaterialIcons name="close" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              router.push({ pathname: "/forum-room", params: { roomId: item.id } })
            }
          >
            <View style={styles.cardIcon}>
              <MaterialIcons name="forum" size={28} color="#4169E1" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.articleTitle}
              </Text>
              <View style={styles.cardMeta}>
                <MaterialIcons name="chat-bubble-outline" size={14} color="#999" />
                <Text style={styles.cardMetaText}>
                  {item.comments.length}{" "}
                  {item.comments.length === 1 ? "comentário" : "comentários"}
                </Text>
                <Text style={styles.cardMetaDot}>·</Text>
                <Text style={styles.cardMetaText}>
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#CCC" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="forum" size={60} color="#DDD" />
            <Text style={styles.emptyStateText}>
              {search.trim()
                ? "Nenhuma sala encontrada"
                : "Nenhuma sala de fórum criada ainda"}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {search.trim()
                ? "Tente buscar por outro termo"
                : "Acesse uma notícia e crie a primeira sala!"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#212529",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    elevation: 2,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardMetaText: {
    fontSize: 13,
    color: "#999",
    marginLeft: 4,
  },
  cardMetaDot: {
    fontSize: 13,
    color: "#CCC",
    marginHorizontal: 6,
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#CCC",
    marginTop: 5,
    textAlign: "center",
  },
});

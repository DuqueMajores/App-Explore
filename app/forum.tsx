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
import { useForum, ForumRoom } from "../src/context/ForumContext";
import FloatingMenu from "../components/Floatingmenu";

const TOP_ROOMS = 4;

type ListItem =
  | { type: "featured-label" }
  | { type: "all-label" }
  | { type: "room"; room: ForumRoom; isFeatured: boolean };

export default function ForumScreen() {
  const { rooms } = useForum();
  const [search, setSearch] = useState("");

  const { listData, featuredCount } = useMemo(() => {
    const q = search.trim().toLowerCase();

    // When searching, show flat results sorted by most recent
    if (q) {
      const filtered = rooms
        .filter((r) => r.articleTitle.toLowerCase().includes(q))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      return {
        listData: filtered.map((room) => ({
          type: "room" as const,
          room,
          isFeatured: false,
        })),
        featuredCount: 0,
      };
    }

    // Sort by comment count descending to pick top 4
    // Only rooms with more than 1 comment (i.e. beyond the OP's opening comment) qualify
    const byComments = [...rooms]
      .filter((r) => r.comments.length > 1)
      .sort((a, b) => b.comments.length - a.comments.length);
    const featuredIds = new Set(
      byComments.slice(0, TOP_ROOMS).map((r) => r.id)
    );
    const featured = byComments.slice(0, TOP_ROOMS);

    // Remaining sorted by createdAt descending (most recent first)
    const remaining = rooms
      .filter((r) => !featuredIds.has(r.id))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const items: ListItem[] = [];

    if (featured.length > 0) {
      items.push({ type: "featured-label" });
      featured.forEach((room) =>
        items.push({ type: "room", room, isFeatured: true })
      );
    }

    if (remaining.length > 0) {
      items.push({ type: "all-label" });
      remaining.forEach((room) =>
        items.push({ type: "room", room, isFeatured: false })
      );
    }

    return { listData: items, featuredCount: featured.length };
  }, [rooms, search]);

  const isEmpty = rooms.length === 0 || listData.length === 0;

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
        data={listData}
        keyExtractor={(item, idx) =>
          item.type === "room" ? item.room.id : `${item.type}-${idx}`
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.type === "featured-label") {
            return (
              <View style={styles.sectionLabel}>
                <MaterialIcons name="local-fire-department" size={15} color="#E63946" />
                <Text style={styles.sectionLabelText}>Em destaque</Text>
              </View>
            );
          }

          if (item.type === "all-label") {
            return (
              <View style={styles.sectionLabel}>
                <MaterialIcons name="access-time" size={15} color="#999" />
                <Text style={[styles.sectionLabelText, styles.sectionLabelMuted]}>
                  Mais recentes
                </Text>
              </View>
            );
          }

          const { room, isFeatured } = item;
          return (
            <TouchableOpacity
              style={[styles.card, isFeatured && styles.cardFeatured]}
              activeOpacity={0.8}
              onPress={() =>
                router.push({ pathname: "/forum-room", params: { roomId: room.id } })
              }
            >
              <View style={[styles.cardIcon, isFeatured && styles.cardIconFeatured]}>
                {isFeatured ? (
                  <MaterialIcons name="local-fire-department" size={26} color="#E63946" />
                ) : (
                  <MaterialIcons name="forum" size={26} color="#4169E1" />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {room.articleTitle}
                </Text>
                <View style={styles.cardMeta}>
                  <MaterialIcons name="chat-bubble-outline" size={13} color="#999" />
                  <Text style={styles.cardMetaText}>
                    {room.comments.length}{" "}
                    {room.comments.length === 1 ? "comentário" : "comentários"}
                  </Text>
                  <Text style={styles.cardMetaDot}>·</Text>
                  <Text style={styles.cardMetaText}>
                    {new Date(room.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={isFeatured ? "#E63946" : "#CCC"} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isEmpty ? (
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
          ) : null
        }
      />
      <FloatingMenu currentRoute="forum" />
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
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#E63946",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionLabelMuted: {
    color: "#999",
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
  cardFeatured: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
    elevation: 4,
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
  cardIconFeatured: {
    backgroundColor: "#FFE4E6",
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

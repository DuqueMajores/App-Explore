import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../src/context/AuthContext";
import MediaViewer, { detectMedia } from "../components/MediaViewer";

type Article = {
  author?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null };
  title?: string | null;
  url?: string | null;
  urlToImage?: string | null;
};

type ArticleReactions = {
  likes: string[];
  dislikes: string[];
};

const REACTIONS_KEY = "@App:articleReactions";

const safeR = (r: any): ArticleReactions => ({
  likes: Array.isArray(r?.likes) ? r.likes : [],
  dislikes: Array.isArray(r?.dislikes) ? r.dislikes : [],
});

// ── Categorias (Apenas texto agora) ──────────────────────────────────────────
const CATEGORIES = [
  { label: "Brasil", query: "Brasil" },
  { label: "Tecnologia", query: "tecnologia" },
  { label: "Economia", query: "economia" },
  { label: "Esportes", query: "esportes" },
  { label: "Saúde", query: "saúde" },
  { label: "Política", query: "política" },
  { label: "Ciência", query: "ciência" },
  { label: "Entretenimento", query: "entretenimento" },
  { label: "Mundo", query: "mundo" },
];

const AnimatedCard = ({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ArticleReactions>>(
    {}
  );
  const menuAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(REACTIONS_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored);
          const migrated: Record<string, ArticleReactions> = {};
          for (const key of Object.keys(parsed)) {
            migrated[key] = safeR(parsed[key]);
          }
          setReactions(migrated);
        }
      })
      .catch(() => { });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading && !user && hasInitialized) {
        router.replace("/login");
      }
    }, [hasInitialized, loading, user])
  );

  useEffect(() => {
    if (!loading) {
      setHasInitialized(true);
      if (!user) {
        const timer = setTimeout(() => {
          router.replace("/login");
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user]);

  const buscarNoticias = useCallback(
    async (queryOverride?: string) => {
      const queryTerm = queryOverride !== undefined ? queryOverride : search;
      if (!queryTerm.trim() && articles.length > 0) return;

      const resolvedKey = (process.env.EXPO_PUBLIC_NEWS_API_KEY ?? "")
        .replace(/["\s;]/g, "")
        .trim();

      if (!resolvedKey) {
        Alert.alert("Erro", "API Key não configurada.");
        return;
      }

      setLoadingArticles(true);
      const query = queryTerm.trim() || "Brasil";
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        query
      )}&language=pt&sortBy=publishedAt&apiKey=${resolvedKey}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        setArticles(Array.isArray(data.articles) ? data.articles : []);
      } catch (error) {
        Alert.alert("Erro", "Erro ao buscar notícias.");
      } finally {
        setLoadingArticles(false);
      }
    },
    [articles.length, search]
  );

  useEffect(() => {
    if (user && articles.length === 0) {
      buscarNoticias();
    }
  }, [articles.length, buscarNoticias, user]);

  const handleCategoryPress = (cat: { label: string; query: string }) => {
    if (activeCategory === cat.label) {
      setActiveCategory(null);
      setSearch("");
      buscarNoticias("Brasil");
    } else {
      setActiveCategory(cat.label);
      setSearch(cat.query);
      buscarNoticias(cat.query);
    }
  };

  const handleClearSearch = () => {
    setSearch("");
    setActiveCategory(null);
    buscarNoticias("Brasil");
  };

  const toggleMenu = () => {
    const toValue = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
    }).start();
  };

  const handleReaction = useCallback(
    async (articleKey: string, type: "like" | "dislike") => {
      if (!user) return;
      const current: ArticleReactions = safeR(reactions[articleKey]);
      const email = user.email;
      let newLikes = [...current.likes];
      let newDislikes = [...current.dislikes];

      if (type === "like") {
        if (newLikes.includes(email)) {
          newLikes = newLikes.filter((e) => e !== email);
        } else {
          newLikes.push(email);
          newDislikes = newDislikes.filter((e) => e !== email);
        }
      } else {
        if (newDislikes.includes(email)) {
          newDislikes = newDislikes.filter((e) => e !== email);
        } else {
          newDislikes.push(email);
          newLikes = newLikes.filter((e) => e !== email);
        }
      }

      const updated = { ...reactions, [articleKey]: { likes: newLikes, dislikes: newDislikes } };
      setReactions(updated);
      try {
        await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(updated));
      } catch (e) { }
    },
    [reactions, user]
  );

  if (loading || !hasInitialized || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  const firstName = user.name.trim().split(" ")[0] || "Usuário";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Olá, {firstName}!</Text>
          <Text style={styles.headerTitle}>Explore</Text>
        </View>
        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
          <MaterialIcons name={menuOpen ? "close" : "menu"} size={28} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Menu Overlay */}
      {menuOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Menu Suspenso */}
      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        style={[styles.expandedMenu, { opacity: menuAnimation }]}
      >
        {["Perfil", "Rede", "Galeria", "Forum", "Início"].map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.menuOption}
            onPress={() => { toggleMenu(); router.push(item === "Início" ? "/" : `/${item.toLowerCase()}`); }}
          >
            <Text style={styles.menuOptionText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={(text) => { setSearch(text); if (text === "") setActiveCategory(null); }}
          placeholder="Pesquisar notícias..."
          style={styles.input}
          placeholderTextColor="#CCC"
          onSubmitEditing={() => buscarNoticias()}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <MaterialIcons name="close" size={18} color="#999" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchButton} onPress={() => buscarNoticias()}>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Categorias (Sem ícones) */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => handleCategoryPress(cat)}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de Artigos */}
      <FlatList
        data={articles}
        keyExtractor={(item, index) => `${item.url ?? index}`}
        renderItem={({ item, index }) => {
          const key = item.url ?? item.title ?? "";
          const r = safeR(reactions[key]);
          const email = user?.email ?? "";
          const likedByMe = r.likes.includes(email);
          const dislikedByMe = r.dislikes.includes(email);
          const media = detectMedia(item.url ?? undefined, item.urlToImage ?? undefined);

          return (
            <AnimatedCard index={index}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: "/explore", params: { ...item, source: item.source?.name } })}
              >
                <MediaViewer imageUrl={item.urlToImage ?? undefined} articleUrl={item.url ?? undefined} height={200} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardSource}>{item.source?.name || "Fonte"}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("pt-BR") : ""}</Text>
                    <View style={styles.reactionRow}>
                      <TouchableOpacity onPress={() => handleReaction(key, "like")}>
                        <MaterialIcons name={likedByMe ? "favorite" : "favorite-border"} size={20} color={likedByMe ? "#E63946" : "#CCC"} />
                      </TouchableOpacity>
                      <Text style={styles.reactionCount}>{r.likes.length || ""}</Text>
                      <TouchableOpacity onPress={() => handleReaction(key, "dislike")} style={{ marginLeft: 10 }}>
                        <MaterialIcons name="heart-broken" size={20} color={dislikedByMe ? "#6B7280" : "#E0E0E0"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          );
        }}
        ListEmptyComponent={loadingArticles ? <ActivityIndicator size="large" color="#4169E1" style={{ marginTop: 50 }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 50, marginBottom: 20 },
  headerGreeting: { fontSize: 14, color: "#999" },
  headerTitle: { fontSize: 32, fontWeight: "800", color: "#212529" },
  menuButton: { padding: 5 },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  expandedMenu: { position: "absolute", top: 100, right: 20, backgroundColor: "#FFF", borderRadius: 15, padding: 10, zIndex: 11, width: 180, elevation: 5 },
  menuOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  menuOptionText: { fontSize: 16, fontWeight: "600", color: "#333" },
  searchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  searchIcon: { position: "absolute", left: 15, zIndex: 1 },
  input: { flex: 1, backgroundColor: "#FFF", borderRadius: 12, paddingLeft: 45, paddingRight: 40, height: 50, elevation: 2 },
  clearButton: { position: "absolute", right: 65 },
  searchButton: { backgroundColor: "#4169E1", width: 50, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginLeft: 10 },

  // Ajuste das Categorias
  
  categoriesWrapper: { 
    height: 55, 
    marginBottom: 10, 
  },
  categoriesContent: { 
    alignItems: "center",
    paddingRight: 20, 
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categoryChip: {
    backgroundColor: "#FFF",
    paddingHorizontal: 18,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    elevation: 2
  },
  categoryChipActive: { backgroundColor: "#4169E1", borderColor: "#4169E1" },
  categoryChipText: { fontSize: 14, fontWeight: "600", color: "#555" },
  categoryChipTextActive: { color: "#FFF" },

  card: { backgroundColor: "#FFF", borderRadius: 20, marginBottom: 20, overflow: "hidden", elevation: 3 },
  cardContent: { padding: 15 },
  cardSource: { fontSize: 12, color: "#4169E1", fontWeight: "700", marginBottom: 5 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#212529", marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { fontSize: 12, color: "#999" },
  reactionRow: { flexDirection: "row", alignItems: "center" },
  reactionCount: { fontSize: 12, marginLeft: 4, fontWeight: "600", color: "#666" },
});

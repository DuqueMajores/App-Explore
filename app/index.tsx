import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
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

// ── Animated Card Wrapper ──────────────────────────────────────────────────────
const AnimatedCard = ({ children, index }: { children: React.ReactNode; index: number }) => {
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ArticleReactions>>({});
  const menuAnimation = useRef(new Animated.Value(0)).current;

  const apiKey = (process.env.EXPO_PUBLIC_NEWS_API_KEY ?? "")
    .replace(/[";]/g, "")
    .trim();

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
      .catch(() => {});
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

  const buscarNoticias = useCallback(async () => {
    if (!search.trim() && articles.length > 0) return;

    if (!apiKey) {
      Alert.alert("Configuração ausente", "Defina EXPO_PUBLIC_NEWS_API_KEY no ambiente.");
      return;
    }

    setLoadingArticles(true);
    const query = search.trim() || "Brasil";
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=pt&sortBy=publishedAt&apiKey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      setArticles(Array.isArray(data.articles) ? data.articles : []);
    } catch (error) {
      console.error("Erro ao buscar notícias:", error);
      Alert.alert("Erro", "Erro ao buscar notícias. Verifique sua conexão.");
    } finally {
      setLoadingArticles(false);
    }
  }, [apiKey, articles.length, search]);

  useEffect(() => {
    if (user && articles.length === 0) {
      buscarNoticias();
    }
  }, [articles.length, buscarNoticias, user]);

  const toggleMenu = () => {
    const toValue = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  const handleReaction = useCallback(async (articleKey: string, type: "like" | "dislike") => {
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

    const updated = {
      ...reactions,
      [articleKey]: { likes: newLikes, dislikes: newDislikes },
    };
    setReactions(updated);
    try {
      await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar reação:", e);
    }
  }, [reactions, user]);

  if (loading || !hasInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Redirecionando...</Text>
      </View>
    );
  }

  const firstName = user.name.trim().split(" ")[0] || "Usuário";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Olá, {firstName}!</Text>
          <Text style={styles.headerTitle}>Explore</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <MaterialIcons
              name={menuOpen ? "close" : "menu"}
              size={28}
              color="#4169E1"
            />
          </TouchableOpacity>
        </View>
      </View>

      {menuOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        style={[styles.expandedMenu, { opacity: menuAnimation }]}
      >
        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => { toggleMenu(); router.push("/perfil"); }}
        >
          <MaterialIcons name="account-circle" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Meu Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => { toggleMenu(); router.push('/rede'); }}
        >
          <MaterialIcons name="groups" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Rede</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => { toggleMenu(); router.push("/forum"); }}
        >
          <MaterialIcons name="forum" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Forum</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => { toggleMenu(); router.replace("/"); }}
        >
          <MaterialIcons name="home" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Início</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar notícias..."
          style={styles.input}
          placeholderTextColor="#CCC"
          editable={!loadingArticles}
          returnKeyType="search"
          onSubmitEditing={buscarNoticias}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={buscarNoticias}
          disabled={loadingArticles}
        >
          {loadingArticles ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Lista de artigos ── */}
      <FlatList
        data={articles}
        keyExtractor={(item, index) => `${item.url ?? "article"}-${index}`}
        renderItem={({ item, index }) => {
          const key = item.url ?? item.title ?? "";
          const r = safeR(reactions[key]);
          const email = user?.email ?? "";
          const likedByMe = email ? r.likes.includes(email) : false;
          const dislikedByMe = email ? r.dislikes.includes(email) : false;

          // Detecta se o artigo tem mídia de vídeo
          const media = detectMedia(item.url ?? undefined, item.urlToImage ?? undefined);
          const isVideo = media.type !== "image";

          return (
            <AnimatedCard index={index}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/explore",
                    params: {
                      title: item.title ?? "Sem título",
                      author: item.author ?? "Redação",
                      source: item.source?.name ?? "Fonte",
                      desc: item.description ?? "Sem descrição disponível.",
                      image: item.urlToImage ?? "https://via.placeholder.com/400x200",
                      url: item.url ?? "",
                    },
                  })
                }
              >
                {/* ── Mídia (imagem ou vídeo) ── */}
                <MediaViewer
                  imageUrl={item.urlToImage ?? undefined}
                  articleUrl={item.url ?? undefined}
                  height={200}
                  showBadge={isVideo}
                  style={styles.cardMediaContainer}
                />

                <View style={styles.cardContent}>
                  <View style={styles.cardSourceRow}>
                    <Text style={styles.cardSource}>{item.source?.name || "Fonte"}</Text>
                    {isVideo && (
                      <View style={styles.videoChip}>
                        <MaterialIcons name="videocam" size={11} color="#4169E1" />
                        <Text style={styles.videoChipText}>Vídeo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title || "Sem título"}
                  </Text>

                  {/* ── Rodapé do card ── */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString("pt-BR")
                        : "Data indisponível"}
                    </Text>

                    <View style={styles.reactionRow}>
                      <TouchableOpacity
                        style={styles.reactionButton}
                        onPress={() => handleReaction(key, "like")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                      >
                        <MaterialIcons
                          name={likedByMe ? "favorite" : "favorite-border"}
                          size={20}
                          color={likedByMe ? "#E63946" : "#CCC"}
                        />
                      </TouchableOpacity>
                      {r.likes.length > 0 && (
                        <Text style={[styles.reactionCount, likedByMe && styles.reactionCountLike]}>
                          {r.likes.length}
                        </Text>
                      )}

                      <View style={styles.reactionSeparator} />

                      <TouchableOpacity
                        style={styles.reactionButton}
                        onPress={() => handleReaction(key, "dislike")}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                      >
                        <MaterialIcons
                          name="heart-broken"
                          size={20}
                          color={dislikedByMe ? "#6B7280" : "#E0E0E0"}
                        />
                      </TouchableOpacity>
                      {r.dislikes.length > 0 && (
                        <Text style={[styles.reactionCount, dislikedByMe && styles.reactionCountDislike]}>
                          {r.dislikes.length}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          );
        }}
        ListEmptyComponent={
          loadingArticles ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#4169E1" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="newspaper" size={60} color="#DDD" />
              <Text style={styles.emptyStateText}>Nenhuma notícia encontrada</Text>
              <Text style={styles.emptyStateSubtext}>
                Tente buscar por um termo diferente
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerGreeting: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#212529",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  expandedMenu: {
    position: "absolute",
    top: 110,
    right: 20,
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 10,
    zIndex: 11,
    width: 200,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuOptionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 25,
    gap: 10,
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 15,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 12,
    elevation: 2,
    fontSize: 16,
    color: "#333",
  },
  searchButton: {
    backgroundColor: "#4169E1",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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
  },
  card: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 3,
  },
  cardMediaContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
    backgroundColor: "#FFF",
  },
  cardSourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardSource: {
    fontSize: 12,
    color: "#4169E1",
    fontWeight: "600",
  },
  videoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  videoChipText: {
    fontSize: 10,
    color: "#4169E1",
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: {
    fontSize: 12,
    color: "#999",
  },
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reactionButton: {
    padding: 2,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
  },
  reactionCountLike: {
    color: "#E63946",
  },
  reactionCountDislike: {
    color: "#6B7280",
  },
  reactionSeparator: {
    width: 8,
  },
});

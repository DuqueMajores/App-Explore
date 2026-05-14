import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useForum } from "../src/context/ForumContext";
import { useAuth } from "../src/context/AuthContext";
import MediaViewer from "../components/MediaViewer";

const REACTIONS_KEY = "@App:articleReactions";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 100;

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";
const GROQ_MODEL = "llama-3.1-8b-instant";
const groqHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${GROQ_API_KEY}`,
};

type Article = {
  author?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null };
  title?: string | null;
  url?: string | null;
  urlToImage?: string | null;
};

async function callGroq(content: string, jsonMode = false): Promise<string> {
  const body: any = {
    model: GROQ_MODEL,
    max_tokens: 1000,
    messages: [{ role: "user", content }],
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    { method: "POST", headers: groqHeaders, body: JSON.stringify(body) }
  );
  if (!response.ok) throw new Error(`Groq error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): { favor: string; contra: string } {
  try { return JSON.parse(text.trim()); } catch {}
  const stripped = text.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, (m) =>
    m.replace(/```json|```/g, "")
  );
  try { return JSON.parse(stripped.trim()); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  throw new Error("JSON parse failed");
}

async function saveReaction(
  articleKey: string,
  userEmail: string,
  type: "like" | "dislike",
  meta: { title?: string; category?: string }
) {
  try {
    const stored = await AsyncStorage.getItem(REACTIONS_KEY);
    const all = stored ? JSON.parse(stored) : {};
    const cur = all[articleKey] ?? { likes: [], dislikes: [], accessCount: 0 };
    let likes: string[] = Array.isArray(cur.likes) ? [...cur.likes] : [];
    let dislikes: string[] = Array.isArray(cur.dislikes) ? [...cur.dislikes] : [];
    if (type === "like") {
      if (!likes.includes(userEmail)) likes.push(userEmail);
      dislikes = dislikes.filter((e) => e !== userEmail);
    } else {
      if (!dislikes.includes(userEmail)) dislikes.push(userEmail);
      likes = likes.filter((e) => e !== userEmail);
    }
    all[articleKey] = {
      ...cur, likes, dislikes,
      title: meta.title ?? cur.title,
      category: meta.category ?? cur.category,
    };
    await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Erro ao salvar reacao:", e);
  }
}

function ArticleContent({
  article,
  existingRoomId,
  onForumPress,
}: {
  article: Article;
  existingRoomId?: string;
  onForumPress: () => void;
}) {
  const articleUrl = article.url ?? "";
  const imageUrl = article.urlToImage ?? "https://via.placeholder.com/400x200";
  const { user } = useAuth();

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [debateContent, setDebateContent] = useState<{ favor: string; contra: string } | null>(null);
  const [loadingDebate, setLoadingDebate] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "debate" | null>(null);

  const handleAiSummary = async () => {
    if (aiSummary) { setActiveTab("summary"); return; }
    setLoadingSummary(true);
    setActiveTab("summary");
    try {
      const text = await callGroq(
        `Resuma esta noticia em exatamente 3 pontos objetivos em portugues, usando bullet points (•). Seja direto e informativo.\n\nTitulo: ${article.title}\n\nDescricao: ${article.description}`
      );
      setAiSummary(text || "Nao foi possivel gerar o resumo.");
    } catch {
      setAiSummary("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDebate = async () => {
    if (loadingDebate) return;
    setDebateContent(null);
    setLoadingDebate(true);
    setActiveTab("debate");
    try {
      const text = await callGroq(
        `Voce e um gerador de debates. Sobre a noticia abaixo, gere exatamente dois argumentos em portugues.\nResponda com um objeto JSON com as chaves "favor" e "contra", cada uma com 2 a 3 frases.\n\nTitulo: ${article.title}\nDescricao: ${article.description}`,
        true
      );
      setDebateContent(extractJson(text));
    } catch {
      setDebateContent({ favor: "Nao foi possivel gerar o debate.", contra: "Tente novamente em instantes." });
    } finally {
      setLoadingDebate(false);
    }
  };

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <MediaViewer imageUrl={imageUrl} articleUrl={articleUrl} height={300} showBadge autoPlay={false} />
      <View style={styles.content}>
        <Text style={styles.sourceBadge}>{article.source?.name || "Fonte"}</Text>
        <Text style={styles.headline}>{article.title || "Sem titulo"}</Text>
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar} />
          <Text style={styles.authorName}>Por {article.author || "Redacao"}</Text>
        </View>

        {user && (
          <View style={styles.swipeHint}>
            <MaterialIcons name="swipe" size={15} color="#AAA" />
            <Text style={styles.swipeHintText}>Arraste para curtir 👉 ou ignorar 👈</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.aiButtonsRow}>
          <TouchableOpacity
            style={[styles.aiButton, activeTab === "summary" && styles.aiButtonActive]}
            onPress={handleAiSummary} activeOpacity={0.8}
          >
            {loadingSummary
              ? <ActivityIndicator size="small" color="#4169E1" />
              : <MaterialIcons name="auto-awesome" size={16} color={activeTab === "summary" ? "#FFF" : "#4169E1"} />}
            <Text style={[styles.aiButtonText, activeTab === "summary" && styles.aiButtonTextActive]}>Resumo IA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aiButton, activeTab === "debate" && styles.aiButtonActive]}
            onPress={handleDebate} activeOpacity={0.8}
          >
            {loadingDebate
              ? <ActivityIndicator size="small" color="#4169E1" />
              : <MaterialIcons name="balance" size={16} color={activeTab === "debate" ? "#FFF" : "#4169E1"} />}
            <Text style={[styles.aiButtonText, activeTab === "debate" && styles.aiButtonTextActive]}>Modo Debate</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "summary" && (
          <View style={styles.aiPanel}>
            <View style={styles.aiPanelHeader}>
              <MaterialIcons name="auto-awesome" size={16} color="#4169E1" />
              <Text style={styles.aiPanelTitle}>Resumo gerado por IA</Text>
            </View>
            {loadingSummary
              ? <View style={{ gap: 8 }}>{[1,2,3].map(i => <View key={i} style={styles.aiSkeletonLine} />)}</View>
              : <Text style={styles.aiPanelText}>{aiSummary}</Text>}
          </View>
        )}

        {activeTab === "debate" && (
          <View style={{ gap: 12, marginBottom: 20 }}>
            <View style={[styles.aiPanel, styles.aiPanelFavor]}>
              <View style={styles.aiPanelHeader}>
                <MaterialIcons name="thumb-up" size={16} color="#2E7D32" />
                <Text style={[styles.aiPanelTitle, { color: "#2E7D32" }]}>A favor</Text>
                <TouchableOpacity onPress={handleDebate} disabled={loadingDebate} style={styles.refreshButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="refresh" size={16} color="#2E7D32" />
                </TouchableOpacity>
              </View>
              {loadingDebate
                ? <View style={{ gap: 8 }}>{[1,2,3].map(i => <View key={i} style={styles.aiSkeletonLine} />)}</View>
                : <Text style={styles.aiPanelText}>{debateContent?.favor}</Text>}
            </View>
            <View style={[styles.aiPanel, styles.aiPanelContra]}>
              <View style={styles.aiPanelHeader}>
                <MaterialIcons name="thumb-down" size={16} color="#C62828" />
                <Text style={[styles.aiPanelTitle, { color: "#C62828" }]}>Contra</Text>
              </View>
              {loadingDebate
                ? <View style={{ gap: 8 }}>{[1,2,3].map(i => <View key={i} style={styles.aiSkeletonLine} />)}</View>
                : <Text style={styles.aiPanelText}>{debateContent?.contra}</Text>}
            </View>
          </View>
        )}

        <Text style={styles.description}>{article.description || "Sem descricao disponivel."}</Text>

        <TouchableOpacity activeOpacity={0.8} disabled={!articleUrl} style={styles.primaryButton}
          onPress={() => { if (articleUrl) Linking.openURL(articleUrl); }}>
          <Text style={styles.buttonLabel}>Ler artigo completo</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} disabled={!user}
          style={[styles.forumButton, !user && styles.forumButtonDisabled]}
          onPress={onForumPress}>
          <MaterialIcons name="forum" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonLabel}>
            {!user ? "Faca login para acessar o forum" : existingRoomId ? "Entrar no Forum" : "Criar Sala de Forum"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    title?: string; desc?: string; image?: string; author?: string;
    source?: string; url?: string; category?: string;
    articlesJson?: string; startIndex?: string;
  }>();

  const articles: Article[] = React.useMemo(() => {
    try { if (params.articlesJson) return JSON.parse(params.articlesJson); } catch {}
    return [{
      title: params.title ?? null, description: params.desc ?? null,
      urlToImage: params.image ?? null, author: params.author ?? null,
      source: { name: params.source ?? null }, url: params.url ?? null,
    }];
  }, []);

  const startIdx = React.useMemo(() => {
    const n = parseInt(params.startIndex ?? "0", 10);
    return isNaN(n) ? 0 : n;
  }, []);

  const category = params.category ?? "";
  const [currentIndex, setCurrentIndex] = useState(startIdx);
  const article = articles[currentIndex] ?? articles[0];
  const nextArticle = articles[currentIndex + 1] ?? null;

  const { getRoomByArticleUrl, createRoom } = useForum();
  const { user } = useAuth();
  const router = useRouter();
  const existingRoom = getRoomByArticleUrl(article.url ?? "");

  const translateX = useRef(new Animated.Value(0)).current;
  const translateXNext = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const isAnimating = useRef(false);

  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-6deg", "0deg", "6deg"],
    extrapolate: "clamp",
  });
  const likeOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
    outputRange: [0, 0.6, 1], extrapolate: "clamp",
  });
  const dislikeOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0.6, 0], extrapolate: "clamp",
  });

  const advance = useCallback(async (type: "like" | "dislike") => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    if (user) {
      const key = article.url ?? article.title ?? "";
      if (key) await saveReaction(key, user.email, type, { title: article.title ?? undefined, category });
    }

    const toValue = type === "like" ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    const nextIdx = currentIndex + 1;
    const hasNext = nextIdx < articles.length;

    if (!hasNext) {
      Animated.timing(translateX, { toValue, duration: 260, useNativeDriver: true })
        .start(() => router.back());
      return;
    }

    // Slide current out, next in from opposite side
    translateXNext.setValue(type === "like" ? SCREEN_WIDTH : -SCREEN_WIDTH);
    Animated.parallel([
      Animated.timing(translateX, { toValue, duration: 280, useNativeDriver: true }),
      Animated.timing(translateXNext, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      translateX.setValue(0);
      translateXNext.setValue(SCREEN_WIDTH);
      setCurrentIndex(nextIdx);
      isAnimating.current = false;
    });
  }, [user, article, category, currentIndex, articles.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        !isAnimating.current && Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 12,
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
        const nextVal = g.dx > 0 ? SCREEN_WIDTH - g.dx : -SCREEN_WIDTH - g.dx;
        translateXNext.setValue(nextVal);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) advance("like");
        else if (g.dx < -SWIPE_THRESHOLD) advance("dislike");
        else {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 6, tension: 80 }),
            Animated.spring(translateXNext, { toValue: SCREEN_WIDTH, useNativeDriver: true, friction: 6, tension: 80 }),
          ]).start();
        }
      },
    })
  ).current;

  const handleForumPress = async () => {
    if (!user) return;
    const articleUrl = article.url ?? "";
    const imageUrl = article.urlToImage ?? "https://via.placeholder.com/400x200";
    if (existingRoom) {
      router.push(`/forum-room?roomId=${existingRoom.id}`);
    } else {
      const newRoom = await createRoom(
        article.title || "Sem titulo", articleUrl, user.email || "",
        imageUrl, article.description || ""
      );
      router.push(`/forum-room?roomId=${newRoom.id}`);
    }
  };

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      {/* Next card behind */}
      {nextArticle && (
        <Animated.View
          style={[styles.cardWrapper, styles.cardWrapperNext, { transform: [{ translateX: translateXNext }] }]}
          pointerEvents="none"
        >
          <ArticleContent article={nextArticle} onForumPress={() => {}} />
        </Animated.View>
      )}

      {/* Like badge */}
      <Animated.View pointerEvents="none"
        style={[styles.swipeBadge, styles.swipeBadgeLike, { opacity: likeOpacity }]}>
        <MaterialIcons name="favorite" size={34} color="#FFF" />
        <Text style={styles.swipeBadgeText}>CURTIR</Text>
      </Animated.View>

      {/* Dislike badge */}
      <Animated.View pointerEvents="none"
        style={[styles.swipeBadge, styles.swipeBadgeDislike, { opacity: dislikeOpacity }]}>
        <MaterialIcons name="heart-broken" size={34} color="#FFF" />
        <Text style={styles.swipeBadgeText}>IGNORAR</Text>
      </Animated.View>

      {/* Current card */}
      <Animated.View style={[styles.cardWrapper, { transform: [{ translateX }, { rotate }] }]}>
        <ArticleContent
          key={currentIndex}
          article={article}
          existingRoomId={existingRoom?.id}
          onForumPress={handleForumPress}
        />
      </Animated.View>

      {/* Progress bar */}
      {articles.length > 1 && (
        <View style={styles.progressBar} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / articles.length) * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#DDE3F0", overflow: "hidden" },
  cardWrapper: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFF" },
  cardWrapperNext: { zIndex: 0 },
  scrollView: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 24, marginTop: -30, backgroundColor: "#FFF", borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  swipeBadge: {
    position: "absolute", top: "38%", zIndex: 20,
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 3,
  },
  swipeBadgeLike: { left: 20, backgroundColor: "#2E7D32", borderColor: "#A5D6A7" },
  swipeBadgeDislike: { right: 20, backgroundColor: "#C62828", borderColor: "#EF9A9A" },
  swipeBadgeText: { color: "#FFF", fontSize: 17, fontWeight: "900", letterSpacing: 1 },
  swipeHint: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F8F9FA", borderRadius: 10,
  },
  swipeHintText: { fontSize: 12, color: "#AAA", fontWeight: "500" },
  progressBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: "rgba(0,0,0,0.08)", zIndex: 30 },
  progressFill: { height: "100%", backgroundColor: "#4169E1", borderRadius: 2 },
  sourceBadge: { color: "#E63946", fontWeight: "bold", fontSize: 13, marginBottom: 12 },
  headline: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", lineHeight: 36, marginBottom: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#EEE", marginRight: 8 },
  authorName: { color: "#888", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 },
  description: { fontSize: 17, lineHeight: 28, color: "#444", marginBottom: 24 },
  primaryButton: { backgroundColor: "#1A1A1A", paddingVertical: 18, borderRadius: 16, alignItems: "center", marginBottom: 12 },
  forumButton: { backgroundColor: "#4169E1", paddingVertical: 18, borderRadius: 16, alignItems: "center", marginBottom: 50, flexDirection: "row", justifyContent: "center" },
  forumButtonDisabled: { backgroundColor: "#9DB3E8" },
  buttonLabel: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  aiButtonsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  aiButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#4169E1", backgroundColor: "#FFF" },
  aiButtonActive: { backgroundColor: "#4169E1" },
  aiButtonText: { fontSize: 13, fontWeight: "700", color: "#4169E1" },
  aiButtonTextActive: { color: "#FFF" },
  aiPanel: { backgroundColor: "#F0F4FF", borderRadius: 16, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: "#4169E1" },
  aiPanelFavor: { backgroundColor: "#F1F8E9", borderLeftColor: "#2E7D32" },
  aiPanelContra: { backgroundColor: "#FFEBEE", borderLeftColor: "#C62828" },
  aiPanelHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  refreshButton: { marginLeft: "auto", padding: 2 },
  aiPanelTitle: { fontSize: 13, fontWeight: "700", color: "#4169E1" },
  aiPanelText: { fontSize: 15, lineHeight: 23, color: "#333" },
  aiSkeletonLine: { height: 12, backgroundColor: "#DDE3F0", borderRadius: 6, marginBottom: 8 },
});

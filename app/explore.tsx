import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useForum } from "../src/context/ForumContext";
import { useAuth } from "../src/context/AuthContext";
import { useReactions } from "../src/context/ReactionsContext";
import MediaViewer from "../components/MediaViewer";
import FloatingMenu from "../components/Floatingmenu";
import { notifyFollowersForumRoom } from "../src/context/GalleryContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = 80;

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";
const GROQ_MODEL   = "llama-3.1-8b-instant";
const groqHeaders  = {
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
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: groqHeaders, body: JSON.stringify(body),
  });
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

async function shareArticle(
  title: string | null | undefined,
  url: string | null | undefined
) {
  const articleUrl = url ?? "";
  const deepLink = articleUrl
    ? `explore://article?url=${encodeURIComponent(articleUrl)}`
    : "";
  const message = [
    title ?? "Confira esta notícia",
    deepLink || articleUrl,
    deepLink && articleUrl
      ? `\nAinda não tem o app? Baixe e abra a notícia diretamente:\n${articleUrl}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  try { await Share.share({ message, url: articleUrl }); } catch (_) {}
}

// ── ArticleContent ─────────────────────────────────────────────────────────────
function ArticleContent({
  article,
  category,
  existingRoomId,
  onForumPress,
}: {
  article: Article;
  category: string;
  existingRoomId?: string;
  onForumPress: () => void;
}) {
  const articleUrl = article.url ?? "";
  const imageUrl   = article.urlToImage ?? "https://via.placeholder.com/400x200";
  const articleKey = articleUrl || article.title || "";

  const { user }                        = useAuth();
  const { reactions, handleReaction }   = useReactions();

  const r            = reactions[articleKey];
  const likedByMe    = user?.email ? (r?.likes    ?? []).includes(user.email) : false;
  const dislikedByMe = user?.email ? (r?.dislikes ?? []).includes(user.email) : false;

  const [aiSummary, setAiSummary]           = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [debateContent, setDebateContent]   = useState<{ favor: string; contra: string } | null>(null);
  const [loadingDebate, setLoadingDebate]   = useState(false);
  const [activeTab, setActiveTab]           = useState<"summary" | "debate" | null>(null);
  const [debateVote, setDebateVote]         = useState<"like" | "dislike" | null>(null);

  const handleAiSummary = async () => {
    if (aiSummary) { setActiveTab("summary"); return; }
    setLoadingSummary(true); setActiveTab("summary");
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
    setDebateContent(null); setDebateVote(null);
    setLoadingDebate(true); setActiveTab("debate");
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

  // Voto no debate → persiste via ReactionsContext (Firestore)
  const handleDebateVote = (type: "like" | "dislike") => {
    if (!user || !articleKey) return;
    if (debateVote === type) { setDebateVote(null); return; }
    setDebateVote(type);
    handleReaction(articleKey, user.email, type, {
      title:    article.title    ?? undefined,
      category: category || undefined,
    });
  };

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
      {/* Imagem */}
      <View style={{ position: "relative" }}>
        <MediaViewer imageUrl={imageUrl} articleUrl={articleUrl} height={300} showBadge autoPlay={false} />
        <TouchableOpacity
          style={styles.shareOverlayBtn}
          activeOpacity={0.8}
          onPress={() => shareArticle(article.title, articleUrl)}
        >
          <MaterialIcons name="share" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sourceBadge}>{article.source?.name || "Fonte"}</Text>
        <Text style={styles.headline}>{article.title || "Sem titulo"}</Text>
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar} />
          <Text style={styles.authorName}>Por {article.author || "Redacao"}</Text>
        </View>

        {/* Reações diretas na tela de artigo */}
        {user && articleKey && (
          <View style={styles.directReactionRow}>
            <TouchableOpacity
              style={[styles.directReactionBtn, likedByMe && styles.directReactionBtnLiked]}
              onPress={() =>
                handleReaction(articleKey, user.email, "like", {
                  title: article.title ?? undefined, category: category || undefined,
                })
              }
              activeOpacity={0.8}
            >
              <MaterialIcons name={likedByMe ? "favorite" : "favorite-border"} size={18} color={likedByMe ? "#FFF" : "#E63946"} />
              <Text style={[styles.directReactionCount, likedByMe && { color: "#FFF" }]}>
                {r?.likes?.length ?? 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.directReactionBtn, dislikedByMe && styles.directReactionBtnDisliked]}
              onPress={() =>
                handleReaction(articleKey, user.email, "dislike", {
                  title: article.title ?? undefined, category: category || undefined,
                })
              }
              activeOpacity={0.8}
            >
              <MaterialIcons name="heart-broken" size={18} color={dislikedByMe ? "#FFF" : "#6B7280"} />
              <Text style={[styles.directReactionCount, dislikedByMe && { color: "#FFF" }]}>
                {r?.dislikes?.length ?? 0}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        {/* Botões IA */}
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
            {/* A FAVOR */}
            <View style={[styles.aiPanel, styles.aiPanelFavor]}>
              <View style={styles.aiPanelHeader}>
                <MaterialIcons name="thumb-up" size={16} color="#2E7D32" />
                <Text style={[styles.aiPanelTitle, { color: "#2E7D32" }]}>A favor</Text>
                <TouchableOpacity
                  onPress={handleDebate} disabled={loadingDebate}
                  style={styles.refreshButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="refresh" size={16} color="#2E7D32" />
                </TouchableOpacity>
              </View>
              {loadingDebate
                ? <View style={{ gap: 8 }}>{[1,2,3].map(i => <View key={i} style={styles.aiSkeletonLine} />)}</View>
                : <Text style={styles.aiPanelText}>{debateContent?.favor}</Text>}
              {!loadingDebate && debateContent && (
                <TouchableOpacity
                  style={[styles.debateVoteBtn, styles.debateVoteBtnFavor, debateVote === "like" && styles.debateVoteBtnFavorActive]}
                  onPress={() => handleDebateVote("like")}
                  disabled={!user} activeOpacity={0.8}
                >
                  <MaterialIcons name="thumb-up" size={18} color={debateVote === "like" ? "#FFF" : "#2E7D32"} />
                  <Text style={[styles.debateVoteBtnText, { color: debateVote === "like" ? "#FFF" : "#2E7D32" }]}>
                    {debateVote === "like" ? "Concordo!" : ""}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* CONTRA */}
            <View style={[styles.aiPanel, styles.aiPanelContra]}>
              <View style={styles.aiPanelHeader}>
                <MaterialIcons name="thumb-down" size={16} color="#C62828" />
                <Text style={[styles.aiPanelTitle, { color: "#C62828" }]}>Contra</Text>
              </View>
              {loadingDebate
                ? <View style={{ gap: 8 }}>{[1,2,3].map(i => <View key={i} style={styles.aiSkeletonLine} />)}</View>
                : <Text style={styles.aiPanelText}>{debateContent?.contra}</Text>}
              {!loadingDebate && debateContent && (
                <TouchableOpacity
                  style={[styles.debateVoteBtn, styles.debateVoteBtnContra, debateVote === "dislike" && styles.debateVoteBtnContraActive]}
                  onPress={() => handleDebateVote("dislike")}
                  disabled={!user} activeOpacity={0.8}
                >
                  <MaterialIcons name="thumb-up" size={18} color={debateVote === "dislike" ? "#FFF" : "#C62828"} />
                  <Text style={[styles.debateVoteBtnText, { color: debateVote === "dislike" ? "#FFF" : "#C62828" }]}>
                    {debateVote === "dislike" ? "Concordo!" : ""}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <Text style={styles.description}>{article.description || "Sem descricao disponivel."}</Text>

        <TouchableOpacity
          activeOpacity={0.8} disabled={!articleUrl} style={styles.primaryButton}
          onPress={() => { if (articleUrl) Linking.openURL(articleUrl); }}
        >
          <Text style={styles.buttonLabel}>Ler artigo completo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8} disabled={!user}
          style={[styles.forumButton, !user && styles.forumButtonDisabled]}
          onPress={onForumPress}
        >
          <MaterialIcons name="forum" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonLabel}>
            {!user ? "Faca login para acessar o forum" : existingRoomId ? "Entrar no Forum" : "Criar Sala de Forum"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── ExploreScreen ──────────────────────────────────────────────────────────────
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
  const article     = articles[currentIndex] ?? articles[0];
  const nextArticle = articles[currentIndex + 1] ?? null;
  const prevArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;

  const { getRoomByArticleUrl, createRoom } = useForum();
  const { user }    = useAuth();
  const { trackAccess } = useReactions();
  const router      = useRouter();
  const existingRoom = getRoomByArticleUrl(article.url ?? "");

  // Registra acesso ao artigo ao montar/trocar
  React.useEffect(() => {
    const key = article.url ?? article.title ?? "";
    if (key && user) {
      trackAccess(key, { title: article.title ?? undefined, category: category || undefined });
    }
  }, [currentIndex]);

  // ── Animações verticais ────────────────────────────────────────────────────
  const translateY     = useRef(new Animated.Value(0)).current;
  const translateYNext = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const translateYPrev = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const isAnimating    = useRef(false);

  const nextOpacity = translateY.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0.5, 0], extrapolate: "clamp",
  });
  const prevOpacity = translateY.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
    outputRange: [0, 0.5, 1], extrapolate: "clamp",
  });

  const goNext = useCallback(async () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= articles.length) {
      Animated.timing(translateY, { toValue: -SCREEN_HEIGHT * 1.2, duration: 260, useNativeDriver: true })
        .start(() => router.back());
      return;
    }
    translateYNext.setValue(SCREEN_HEIGHT);
    Animated.parallel([
      Animated.timing(translateY,     { toValue: -SCREEN_HEIGHT, duration: 320, useNativeDriver: true }),
      Animated.timing(translateYNext, { toValue: 0,              duration: 320, useNativeDriver: true }),
    ]).start(() => {
      translateY.setValue(0); translateYNext.setValue(SCREEN_HEIGHT);
      setCurrentIndex(nextIdx); isAnimating.current = false;
    });
  }, [currentIndex, articles.length]);

  const goPrev = useCallback(async () => {
    if (isAnimating.current || currentIndex === 0) return;
    isAnimating.current = true;
    const prevIdx = currentIndex - 1;
    translateYPrev.setValue(-SCREEN_HEIGHT);
    Animated.parallel([
      Animated.timing(translateY,     { toValue: SCREEN_HEIGHT,  duration: 320, useNativeDriver: true }),
      Animated.timing(translateYPrev, { toValue: 0,              duration: 320, useNativeDriver: true }),
    ]).start(() => {
      translateY.setValue(0); translateYPrev.setValue(-SCREEN_HEIGHT);
      setCurrentIndex(prevIdx); isAnimating.current = false;
    });
  }, [currentIndex]);

  const goNextRef = useRef(goNext);
  const goPrevRef = useRef(goPrev);
  goNextRef.current = goNext;
  goPrevRef.current = goPrev;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        !isAnimating.current && Math.abs(g.dy) > Math.abs(g.dx) * 1.5 && Math.abs(g.dy) > 12,
      onPanResponderMove: (_, g) => {
        translateY.setValue(g.dy);
        if (g.dy < 0) translateYNext.setValue(SCREEN_HEIGHT + g.dy);
        else           translateYPrev.setValue(-SCREEN_HEIGHT + g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_THRESHOLD)     goNextRef.current();
        else if (g.dy > SWIPE_THRESHOLD) goPrevRef.current();
        else {
          Animated.parallel([
            Animated.spring(translateY,     { toValue: 0,              useNativeDriver: true, friction: 6, tension: 80 }),
            Animated.spring(translateYNext, { toValue: SCREEN_HEIGHT,  useNativeDriver: true, friction: 6, tension: 80 }),
            Animated.spring(translateYPrev, { toValue: -SCREEN_HEIGHT, useNativeDriver: true, friction: 6, tension: 80 }),
          ]).start();
        }
      },
    })
  ).current;

  const handleForumPress = async () => {
    if (!user) return;
    const articleUrl = article.url ?? "";
    const imageUrl   = article.urlToImage ?? "https://via.placeholder.com/400x200";
    if (existingRoom) {
      router.push(`/forum-room?roomId=${existingRoom.id}`);
    } else {
      const newRoom = await createRoom(
        article.title || "Sem titulo", articleUrl, user.email || "",
        imageUrl, article.description || ""
      );
      await notifyFollowersForumRoom(user.email, user.name, newRoom.id);
      router.push(`/forum-room?roomId=${newRoom.id}`);
    }
  };

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      {prevArticle && (
        <Animated.View
          style={[styles.cardWrapper, styles.cardWrapperBehind, { transform: [{ translateY: translateYPrev }] }]}
          pointerEvents="none"
        >
          <ArticleContent article={prevArticle} category={category} onForumPress={() => {}} />
        </Animated.View>
      )}

      {nextArticle && (
        <Animated.View
          style={[styles.cardWrapper, styles.cardWrapperBehind, { transform: [{ translateY: translateYNext }] }]}
          pointerEvents="none"
        >
          <ArticleContent article={nextArticle} category={category} onForumPress={() => {}} />
        </Animated.View>
      )}

      <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.swipeBadgeNext, { opacity: nextOpacity }]}>
        <MaterialIcons name="keyboard-arrow-up" size={28} color="#FFF" />
        <Text style={styles.swipeBadgeText}>PRÓXIMA</Text>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.swipeBadgePrev, { opacity: prevOpacity }]}>
        <MaterialIcons name="keyboard-arrow-down" size={28} color="#FFF" />
        <Text style={styles.swipeBadgeText}>ANTERIOR</Text>
      </Animated.View>

      <Animated.View style={[styles.cardWrapper, { transform: [{ translateY }] }]}>
        <ArticleContent
          key={currentIndex}
          article={article}
          category={category}
          existingRoomId={existingRoom?.id}
          onForumPress={handleForumPress}
        />
      </Animated.View>

      {articles.length > 1 && (
        <View style={styles.progressBar} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / articles.length) * 100}%` }]} />
        </View>
      )}

      {articles.length > 1 && (
        <View style={styles.counterPill} pointerEvents="none">
          <Text style={styles.counterText}>{currentIndex + 1} / {articles.length}</Text>
        </View>
      )}

      <FloatingMenu currentRoute="index" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#DDE3F0", overflow: "hidden" },
  cardWrapper: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFF" },
  cardWrapperBehind: { zIndex: 0 },
  scrollView: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 24, marginTop: -30, backgroundColor: "#FFF", borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  swipeBadge: { position: "absolute", zIndex: 20, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 3, alignSelf: "center", left: "50%", marginLeft: -80 },
  swipeBadgeNext: { top: 24, backgroundColor: "#2E7D32", borderColor: "#A5D6A7" },
  swipeBadgePrev: { bottom: 100, backgroundColor: "#1565C0", borderColor: "#90CAF9" },
  swipeBadgeText: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  progressBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: "rgba(0,0,0,0.08)", zIndex: 30 },
  progressFill: { height: "100%", backgroundColor: "#4169E1", borderRadius: 2 },
  counterPill: { position: "absolute", top: 10, right: 16, zIndex: 30, backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  counterText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  shareOverlayBtn: { position: "absolute", top: 220, bottom: 12, right: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  sourceBadge: { color: "#E63946", fontWeight: "bold", fontSize: 13, marginBottom: 12 },
  headline: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", lineHeight: 36, marginBottom: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#EEE", marginRight: 8 },
  authorName: { color: "#888", fontSize: 14 },
  directReactionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  directReactionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: "#E0E0E0", backgroundColor: "#F8F9FA" },
  directReactionBtnLiked: { backgroundColor: "#E63946", borderColor: "#E63946" },
  directReactionBtnDisliked: { backgroundColor: "#6B7280", borderColor: "#6B7280" },
  directReactionCount: { fontSize: 13, fontWeight: "700", color: "#666" },
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
  aiPanelText: { fontSize: 15, lineHeight: 23, color: "#333", marginBottom: 12 },
  aiSkeletonLine: { height: 12, backgroundColor: "#DDE3F0", borderRadius: 6, marginBottom: 8 },
  debateVoteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", margin: "auto", gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 2, marginTop: 4, width: 125 },
  debateVoteBtnFavor: { borderColor: "#2E7D32", backgroundColor: "rgba(46,125,50,0.08)" },
  debateVoteBtnFavorActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  debateVoteBtnContra: { borderColor: "#C62828", backgroundColor: "rgba(198,40,40,0.08)" },
  debateVoteBtnContraActive: { backgroundColor: "#C62828", borderColor: "#C62828" },
  debateVoteBtnText: { fontSize: 14, fontWeight: "700" },
});

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useForum } from "../src/context/ForumContext";
import { useAuth } from "../src/context/AuthContext";

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";
const GROQ_MODEL = "llama-3.1-8b-instant";

const groqHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${GROQ_API_KEY}`,
};

async function callGroq(content: string, jsonMode = false): Promise<string> {
  const body: any = {
    model: GROQ_MODEL,
    max_tokens: 1000,
    messages: [{ role: "user", content }],
  };

  // Ativa o modo JSON nativo do Groq quando pedido
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: groqHeaders,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("Groq API error:", response.status, err);
    throw new Error(`Erro ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Extrai o primeiro objeto JSON encontrado na string, mesmo com texto ao redor
function extractJson(text: string): { favor: string; contra: string } {
  // 1. Tenta parsear direto
  try {
    return JSON.parse(text.trim());
  } catch {}

  // 2. Remove blocos de markdown ```json ... ```
  const stripped = text.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, (match) =>
    match.replace(/```json|```/g, "")
  );
  try {
    return JSON.parse(stripped.trim());
  } catch {}

  // 3. Extrai o primeiro { ... } encontrado na resposta
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  throw new Error("Não foi possível extrair JSON da resposta.");
}

export default function ExploreScreen() {
  const { title, desc, image, author, source, url } = useLocalSearchParams<{
    title?: string;
    desc?: string;
    image?: string;
    author?: string;
    source?: string;
    url?: string;
  }>();

  const articleUrl = typeof url === "string" ? url : "";
  const imageUrl =
    typeof image === "string" && image
      ? image
      : "https://via.placeholder.com/400x200";

  const { getRoomByArticleUrl, createRoom } = useForum();
  const { user } = useAuth();
  const router = useRouter();
  const existingRoom = getRoomByArticleUrl(articleUrl);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [debateContent, setDebateContent] = useState<{ favor: string; contra: string } | null>(null);
  const [loadingDebate, setLoadingDebate] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'debate' | null>(null);

  const handleForumPress = async () => {
    if (!user) return;
    if (existingRoom) {
      router.push(`/forum-room?roomId=${existingRoom.id}`);
    } else {
      const newRoom = await createRoom(
        title || "Sem título",
        articleUrl,
        user.email || "",
        imageUrl,
        desc || ""
      );
      router.push(`/forum-room?roomId=${newRoom.id}`);
    }
  };

  const handleAiSummary = async () => {
    if (aiSummary) { setActiveTab('summary'); return; }
    setLoadingSummary(true);
    setActiveTab('summary');
    try {
      const text = await callGroq(
        `Resuma esta notícia em exatamente 3 pontos objetivos em português, usando bullet points (•). Seja direto e informativo.\n\nTítulo: ${title}\n\nDescrição: ${desc}`
      );
      setAiSummary(text || "Não foi possível gerar o resumo.");
    } catch (e: any) {
      setAiSummary("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDebate = async () => {
    if (loadingDebate) return;
    setDebateContent(null);
    setLoadingDebate(true);
    setActiveTab('debate');
    try {
      const text = await callGroq(
        `Você é um gerador de debates. Sobre a notícia abaixo, gere exatamente dois argumentos em português.\nResponda com um objeto JSON com as chaves "favor" e "contra", cada uma com 2 a 3 frases.\n\nTítulo: ${title}\nDescrição: ${desc}`,
        true
      );
      const parsed = extractJson(text);
      setDebateContent(parsed);
    } catch (e: any) {
      console.error("Debate error:", e);
      setDebateContent({
        favor: "Não foi possível gerar o debate.",
        contra: "Tente novamente em instantes.",
      });
    } finally {
      setLoadingDebate(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: imageUrl }} style={styles.mainImage} />

      <View style={styles.content}>
        <Text style={styles.sourceBadge}>{source || "Fonte"}</Text>
        <Text style={styles.headline}>{title || "Sem título"}</Text>

        <View style={styles.authorRow}>
          <View style={styles.authorAvatar} />
          <Text style={styles.authorName}>Por {author || "Redação"}</Text>
        </View>

        <View style={styles.divider} />

        {/* Botões de IA */}
        <View style={styles.aiButtonsRow}>
          <TouchableOpacity
            style={[styles.aiButton, activeTab === 'summary' && styles.aiButtonActive]}
            onPress={handleAiSummary}
            activeOpacity={0.8}
          >
            {loadingSummary
              ? <ActivityIndicator size="small" color="#4169E1" />
              : <MaterialIcons name="auto-awesome" size={16} color={activeTab === 'summary' ? "#FFF" : "#4169E1"} />
            }
            <Text style={[styles.aiButtonText, activeTab === 'summary' && styles.aiButtonTextActive]}>
              Resumo IA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aiButton, activeTab === 'debate' && styles.aiButtonActive]}
            onPress={handleDebate}
            activeOpacity={0.8}
          >
            {loadingDebate
              ? <ActivityIndicator size="small" color="#4169E1" />
              : <MaterialIcons name="balance" size={16} color={activeTab === 'debate' ? "#FFF" : "#4169E1"} />
            }
            <Text style={[styles.aiButtonText, activeTab === 'debate' && styles.aiButtonTextActive]}>
              Modo Debate
            </Text>
          </TouchableOpacity>
        </View>

        {/* Painel de Resumo */}
        {activeTab === 'summary' && (
          <View style={styles.aiPanel}>
            <View style={styles.aiPanelHeader}>
              <MaterialIcons name="auto-awesome" size={16} color="#4169E1" />
              <Text style={styles.aiPanelTitle}>Resumo gerado por IA</Text>
            </View>
            {loadingSummary ? (
              <View style={{ gap: 8 }}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={styles.aiSkeletonLine} />
                ))}
              </View>
            ) : (
              <Text style={styles.aiPanelText}>{aiSummary}</Text>
            )}
          </View>
        )}

        {/* Painel de Debate */}
        {activeTab === 'debate' && (
          <View style={{ gap: 12, marginBottom: 20 }}>
            <View style={[styles.aiPanel, styles.aiPanelFavor]}>
              <View style={styles.aiPanelHeader}>
                <MaterialIcons name="thumb-up" size={16} color="#2E7D32" />
                <Text style={[styles.aiPanelTitle, { color: "#2E7D32" }]}>A favor</Text>
                <TouchableOpacity
                  onPress={handleDebate}
                  disabled={loadingDebate}
                  style={styles.refreshButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="refresh" size={16} color="#2E7D32" />
                </TouchableOpacity>
              </View>
              {loadingDebate
                ? <View style={{ gap: 8 }}>{[1,2,3].map(i => <View key={i} style={styles.aiSkeletonLine} />)}</View>
                : <Text style={styles.aiPanelText}>{debateContent?.favor}</Text>
              }
            </View>
            <View style={[styles.aiPanel, styles.aiPanelContra]}>
              <View style={styles.aiPanelHeader}>
                <MaterialIcons name="thumb-down" size={16} color="#C62828" />
                <Text style={[styles.aiPanelTitle, { color: "#C62828" }]}>Contra</Text>
              </View>
              {loadingDebate
                ? <View style={{ gap: 8 }}>{[1,2,3].map(i => <View key={i} style={styles.aiSkeletonLine} />)}</View>
                : <Text style={styles.aiPanelText}>{debateContent?.contra}</Text>
              }
            </View>
          </View>
        )}

        <Text style={styles.description}>
          {desc || "Sem descrição disponível."}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!articleUrl}
          style={styles.primaryButton}
          onPress={() => {
            if (articleUrl) {
              Linking.openURL(articleUrl);
            }
          }}
        >
          <Text style={styles.buttonLabel}>Ler artigo completo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!user}
          style={[styles.forumButton, !user && styles.forumButtonDisabled]}
          onPress={handleForumPress}
        >
          <MaterialIcons name="forum" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonLabel}>
            {!user
              ? "Faça login para acessar o fórum"
              : existingRoom
                ? "Entrar no Fórum"
                : "Criar Sala de Fórum"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  mainImage: { width: "100%", height: 300 },
  content: {
    padding: 24,
    marginTop: -30,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  sourceBadge: {
    color: "#E63946",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 12,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    lineHeight: 36,
    marginBottom: 16,
  },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EEE",
    marginRight: 8,
  },
  authorName: { color: "#888", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 },
  description: { fontSize: 17, lineHeight: 28, color: "#444", marginBottom: 40 },
  primaryButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  forumButton: {
    backgroundColor: "#4169E1",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 50,
    flexDirection: "row",
    justifyContent: "center",
  },
  forumButtonDisabled: {
    backgroundColor: "#9DB3E8",
  },
  buttonLabel: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  aiButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  aiButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#4169E1",
    backgroundColor: "#FFF",
  },
  aiButtonActive: {
    backgroundColor: "#4169E1",
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4169E1",
  },
  aiButtonTextActive: {
    color: "#FFF",
  },
  aiPanel: {
    backgroundColor: "#F0F4FF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#4169E1",
  },
  aiPanelFavor: {
    backgroundColor: "#F1F8E9",
    borderLeftColor: "#2E7D32",
  },
  aiPanelContra: {
    backgroundColor: "#FFEBEE",
    borderLeftColor: "#C62828",
  },
  aiPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  refreshButton: {
    marginLeft: "auto",
    padding: 2,
  },
  aiPanelTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4169E1",
  },
  aiPanelText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#333",
  },
  aiSkeletonLine: {
    height: 12,
    backgroundColor: "#DDE3F0",
    borderRadius: 6,
    marginBottom: 8,
  },
});

import { useLocalSearchParams, useRouter } from "expo-router";
import {
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
});

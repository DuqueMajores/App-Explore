import { useLocalSearchParams } from "expo-router";
import { View, Text, Image, StyleSheet, Linking, TouchableOpacity, ScrollView } from "react-native";

export default function ExploreScreen() {
  const { title, desc, image, author, source, url } = useLocalSearchParams();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: image as string }} style={styles.mainImage} />
      
      <View style={styles.content}>
        <Text style={styles.sourceBadge}>{source}</Text>
        <Text style={styles.headline}>{title}</Text>
        
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar} />
          <Text style={styles.authorName}>Por {author || "Redação"}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.description}>{desc}</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.primaryButton}
          onPress={() => Linking.openURL(url as string)}
        >
          <Text style={styles.buttonLabel}>Ler artigo completo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  mainImage: { width: "100%", height: 300 },
  content: { padding: 24, marginTop: -30, backgroundColor: "#FFF", borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sourceBadge: { color: "#E63946", fontWeight: "bold", fontSize: 13, marginBottom: 12 },
  headline: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", lineHeight: 36, marginBottom: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#EEE", marginRight: 8 },
  authorName: { color: "#888", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 },
  description: { fontSize: 17, lineHeight: 28, color: "#444", marginBottom: 40 },
  primaryButton: { backgroundColor: "#1A1A1A", paddingVertical: 18, borderRadius: 16, alignItems: "center", marginBottom: 50 },
  buttonLabel: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
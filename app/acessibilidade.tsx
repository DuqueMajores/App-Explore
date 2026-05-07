import React from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function AcessibilidadeScreen() {
  const { user, toggleTTS, toggleTheme } = useAuth();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Acessibilidade</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TTS */}
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <MaterialIcons name="record-voice-over" size={26} color="#4169E1" />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Leitura de Tela (TTS)</Text>
              <Text style={styles.cardSubtitle}>
                Ativa a leitura em voz alta dos textos do app
              </Text>
            </View>
          </View>
          <Switch
            value={user?.ttsEnabled ?? false}
            onValueChange={toggleTTS}
            trackColor={{ false: "#DDD", true: "#A0B4F0" }}
            thumbColor={user?.ttsEnabled ? "#4169E1" : "#FFF"}
          />
        </View>

        {/* Dark Mode */}
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <MaterialIcons
              name={user?.darkMode ? "light-mode" : "dark-mode"}
              size={26}
              color="#4169E1"
            />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Modo Escuro</Text>
              <Text style={styles.cardSubtitle}>
                Reduz o brilho da tela para ambientes escuros
              </Text>
            </View>
          </View>
          <Switch
            value={user?.darkMode ?? false}
            onValueChange={toggleTheme}
            trackColor={{ false: "#DDD", true: "#A0B4F0" }}
            thumbColor={user?.darkMode ? "#4169E1" : "#FFF"}
          />
        </View>

        <Text style={styles.hint}>
          As preferências de acessibilidade são salvas automaticamente na sua conta.
        </Text>
      </ScrollView>
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
    backgroundColor: "#FFF",
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#212529",
  },
  content: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#999",
    lineHeight: 17,
  },
  hint: {
    fontSize: 12,
    color: "#BBB",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
});
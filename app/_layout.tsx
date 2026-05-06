import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { ForumProvider } from "../src/context/ForumContext";
import { StatusBar, View, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity, Text } from "react-native";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AdBanner />
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            opacity: 0.5,
          }}
          onPress={() => navigation.navigate("acessibilidade")}
        >
          <Text style={{ fontSize: 10 }}>?</Text>
        </TouchableOpacity>
        <ForumProvider>
          <StatusBar barStyle="light-content" backgroundColor="black" />

          <View style={styles.externalContainer}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#F8F9FA" }
                }}
              >
                <Stack.Screen name="index" options={{ title: "Explore Notícias" }} />
                <Stack.Screen name="login" options={{ title: "Autenticação" }} />
                <Stack.Screen name="perfil" options={{ title: "Meu Perfil" }} />
                <Stack.Screen name="explore" options={{ title: "Notícia" }} />
                <Stack.Screen name="forum" options={{ title: "Forum" }} />
                <Stack.Screen name="forum-room" options={{ title: "Sala do Forum" }} />
              </Stack>
            </SafeAreaView>
          </View>
        </ForumProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  externalContainer: {
    flex: 1,
    backgroundColor: "black", // Aqui nasce a barra preta de cima e de baixo
  },
  safeArea: {
    flex: 1,
  },
});

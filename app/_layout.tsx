import { Stack } from "expo-router";
import { useState } from "react";
import { StatusBar, View, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import IntroScreen from "../components/IntroScreen";
import AdBanner from "../components/AdBanner";

import { AuthProvider } from "../src/context/AuthContext";
import { ForumProvider } from "../src/context/ForumContext";
import { NotificationProvider } from "../src/context/NotificationContext";

export default function RootLayout() {
  const [introFinished, setIntroFinished] = useState(false);

  if (!introFinished) {
    return (
      <>
        <StatusBar hidden />
        <IntroScreen onFinish={() => setIntroFinished(true)} />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <AuthProvider>
          <ForumProvider>
            <View style={styles.container}>
              <SafeAreaView style={styles.safe}>
                <StatusBar barStyle="light-content" />

                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="login" />
                  <Stack.Screen name="perfil" />
                  <Stack.Screen name="rede" options={{ title: "Rede" }} />
                  <Stack.Screen name="explore" />
                  <Stack.Screen name="forum" />
                  <Stack.Screen name="forum-room" />
                  <Stack.Screen name="acessibilidade" />
                </Stack>

                <AdBanner />
              </SafeAreaView>
            </View>
          </ForumProvider>
        </AuthProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safe: {
    flex: 1,
  },
});

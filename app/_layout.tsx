import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#F8F9FA" },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Explore Notícias" }} />
        <Stack.Screen name="login" options={{ title: "Autenticação" }} />
        <Stack.Screen name="perfil" options={{ title: "Meu Perfil" }} />
        <Stack.Screen name="explore" options={{ title: "Notícia" }} />
      </Stack>
    </AuthProvider>
  );
}
import { Stack } from "expo-router";
import { AuthProvider } from "./AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ 
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: '#F8F9FA' },
        headerShown: false // Vamos gerenciar o cabeçalho ou menu dentro das telas
      }}>
        <Stack.Screen name="index" options={{ title: "Explore Notícias" }} />
        <Stack.Screen name="login" options={{ title: "Autenticação" }} />
        <Stack.Screen name="perfil" options={{ title: "Meu Perfil" }} />
      </Stack>
    </AuthProvider>
  );
}

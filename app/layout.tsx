import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Explore Notícias",
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="explore"
        options={{
          title: "Detalhes",
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          title: "Sobre",
        }}
      />
    </Stack>
  );
}
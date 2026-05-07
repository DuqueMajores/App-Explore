import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

// ── Configuração de exibição das notificações em foreground ──────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Tipos de notificação ─────────────────────────────────────────────────────
export type NotificationPayload =
  | { type: "profile_like"; fromName: string }
  | { type: "profile_dislike"; fromName: string }
  | { type: "comment_like"; fromName: string; roomId: string }
  | { type: "comment_reply"; fromName: string; roomId: string };

// ── Contexto ──────────────────────────────────────────────────────────────────
interface NotificationContextData {
  sendNotification: (payload: NotificationPayload) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextData>(
  {} as NotificationContextData
);

// ── Provider ──────────────────────────────────────────────────────────────────
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // ── Pede permissão ao montar ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;

      // Canal Android obrigatório
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Notificações",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4169E1",
        });
      }
    })();

    // ── Listener: toque na notificação navega para o destino ────────────────
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as NotificationPayload;
        handleNavigation(data);
      });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // ── Navega de acordo com o tipo ──────────────────────────────────────────
  function handleNavigation(payload: NotificationPayload) {
    switch (payload.type) {
      case "profile_like":
      case "profile_dislike":
        router.push("/perfil");
        break;
      case "comment_like":
      case "comment_reply":
        router.push({
          pathname: "/forum-room",
          params: { roomId: payload.roomId },
        });
        break;
    }
  }

  // ── Conteúdo das notificações ────────────────────────────────────────────
  function buildContent(payload: NotificationPayload): {
    title: string;
    body: string;
  } {
    switch (payload.type) {
      case "profile_like":
        return {
          title: "👍 Novo like no seu perfil!",
          body: `${payload.fromName} curtiu o seu perfil.`,
        };
      case "profile_dislike":
        return {
          title: "👎 Novo dislike no seu perfil",
          body: `${payload.fromName} deu dislike no seu perfil.`,
        };
      case "comment_like":
        return {
          title: "❤️ Seu comentário foi curtido!",
          body: `${payload.fromName} curtiu um dos seus comentários.`,
        };
      case "comment_reply":
        return {
          title: "💬 Nova resposta no seu comentário!",
          body: `${payload.fromName} respondeu ao seu comentário.`,
        };
    }
  }

  // ── Dispara a notificação local ──────────────────────────────────────────
  const sendNotification = useCallback(async (payload: NotificationPayload) => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;

      const { title, body } = buildContent(payload);

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: payload,
          sound: true,
        },
        trigger: null, // disparo imediato
      });
    } catch (e) {
      console.error("Erro ao enviar notificação:", e);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ sendNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
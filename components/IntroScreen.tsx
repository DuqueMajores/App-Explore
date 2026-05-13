import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";

interface Props {
  onFinish: () => void;
}

const { width, height } = Dimensions.get("window");

// Tenta carregar o asset — se não existir na build, retorna null
let introVideo: any = null;
try {
  introVideo = require("../assets/videos/intro.mp4");
} catch (_) {}

export default function IntroScreen({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // Mostra o botão "Pular" após 700ms
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    // Fallback: encerra após 8s mesmo que o vídeo falhe
    timerRef.current = setTimeout(() => finalizar(), 8000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function finalizar() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: 900,
      useNativeDriver: true,
    }).start(() => onFinish());
  }

  function handlePlaybackStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    // Avança automaticamente quando o vídeo termina
    if (status.didJustFinish) {
      finalizar();
    }
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.videoBox}>
        {introVideo && !videoError ? (
          <Video
            source={introVideo}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
            isMuted={false}
            onPlaybackStatusUpdate={handlePlaybackStatus}
            onError={() => setVideoError(true)}
          />
        ) : (
          // Fallback visual caso o vídeo não carregue
          <View style={styles.fallback}>
            <Text style={styles.fallbackTitle}>Explore</Text>
            <Text style={styles.fallbackSub}>Notícias em tempo real</Text>
          </View>
        )}
      </View>

      <Animated.View style={[styles.skipWrap, { opacity: buttonOpacity }]}>
        <TouchableOpacity style={styles.button} onPress={finalizar}>
          <Text style={styles.text}>Pular</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  videoBox: {
    width: width * 0.78,
    height: height * 0.52,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  fallbackTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: "#4169E1",
    letterSpacing: -1,
  },
  fallbackSub: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
  skipWrap: {
    position: "absolute",
    bottom: 45,
    right: 25,
  },
  button: {
    backgroundColor: "rgba(0,0,0,0.60)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

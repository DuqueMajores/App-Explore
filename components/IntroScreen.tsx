import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Audio, Video, ResizeMode } from "expo-av";

interface Props {
  onFinish: () => void;
}

const { width, height } = Dimensions.get("window");

export default function IntroScreen({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    iniciarIntro();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  async function iniciarIntro() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/news.mp3"),
        {
          shouldPlay: false,
          isMuted: true,
          volume: 0,
        }
      );

      soundRef.current = sound;
      await sound.playAsync();

      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();

      setTimeout(() => finalizar(), 7000);
    } catch (error) {
      finalizar();
    }
  }

  function finalizar() {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 900,
      useNativeDriver: true,
    }).start(() => onFinish());
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.videoBox}>
        <Video
          source={require("../assets/videos/intro.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
          isMuted={false}
        />
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
    backgroundColor: "#ffff",
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

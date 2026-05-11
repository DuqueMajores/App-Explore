import React from "react";
import {
  View,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";

type MediaType = "image" | "video-direct" | "youtube" | "vimeo" | "unknown-video";

interface MediaInfo {
  type: MediaType;
  url: string;
  videoId?: string;
  embedUrl?: string;
}

// Mantida para não quebrar imports em index.tsx e outros arquivos
export function detectMedia(_articleUrl?: string, imageUrl?: string): MediaInfo {
  return {
    type: "image",
    url: imageUrl || "https://via.placeholder.com/400x220",
  };
}

interface MediaViewerProps {
  imageUrl?: string;
  articleUrl?: string;
  directVideoUrl?: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
  autoPlay?: boolean;
  showBadge?: boolean;
}

export default function MediaViewer({
  imageUrl,
  style,
  height = 220,
}: MediaViewerProps) {
  const uri =
    imageUrl && imageUrl.trim()
      ? imageUrl
      : "https://via.placeholder.com/400x220";

  return (
    <View style={[{ height }, style]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});

/**
 * FollowingStories.tsx — migrado para Firestore
 * Lê dados dos usuários seguidos diretamente do Firestore
 * via onSnapshot, eliminando AsyncStorage.getItem("@App:users").
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { db, collection } from "../src/services/firebaseConfig";
import { onSnapshot }     from "firebase/firestore";
import { useFollow }      from "../src/context/FollowContext";
import { useGallery }     from "../src/context/GalleryContext";
import StoryRing          from "./StoryRing";
import * as ImagePicker   from "expo-image-picker";

interface PublicUser {
  name: string;
  email: string;
  photo?: string;
}

interface FollowingStoriesProps {
  currentUser: { email: string; name: string; photo?: string };
  onAddPhoto?: () => void;
}

export default function FollowingStories({
  currentUser,
  onAddPhoto,
}: FollowingStoriesProps) {
  const { getFollowing }                        = useFollow();
  const { getPhotosByUser, getActivePhotos, addPhoto } = useGallery();

  // Todos os usuários vindos do Firestore em tempo real
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const users: PublicUser[] = snapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            name:  data.name  ?? "",
            email: data.email ?? d.id,
            photo: data.photo ?? undefined,
          };
        });
        setAllUsers(users);
      },
      (error) => console.error("Erro ao ouvir usuários (stories):", error)
    );
    return () => unsub();
  }, []);

  const following    = getFollowing(currentUser.email);
  const activePhotos = getActivePhotos();

  // Filtra apenas seguidos que têm stories ativos
  const usersWithStories = allUsers.filter(
    (u) =>
      following.includes(u.email) &&
      getPhotosByUser(u.email).length > 0
  );

  const ownPhotos  = getPhotosByUser(currentUser.email);
  const hasOwnStory = ownPhotos.length > 0;

  if (usersWithStories.length === 0 && !hasOwnStory && !onAddPhoto) return null;

  const handleAddStory = async () => {
    if (onAddPhoto) { onAddPhoto(); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à sua galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 5], quality: 0.85,
    });
    if (!result.canceled) {
      await addPhoto(currentUser.email, currentUser.name, currentUser.photo, result.assets[0].uri);
      Alert.alert("✅ Foto publicada!", "Sua foto ficará visível por 24 horas.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Próprio usuário sempre primeiro */}
        <View style={styles.storyItem}>
          <StoryRing
            userEmail={currentUser.email}
            userName={currentUser.name}
            userPhoto={currentUser.photo}
            size={42}
            isOwn
            onAddPhoto={handleAddStory}
            currentUserEmail={currentUser.email}
          />
          <Text style={styles.storyLabel} numberOfLines={1}>Você</Text>
        </View>

        {/* Usuários seguidos com stories */}
        {usersWithStories.map((u) => (
          <View key={u.email} style={styles.storyItem}>
            <StoryRing
              userEmail={u.email}
              userName={u.name}
              userPhoto={u.photo}
              size={42}
              currentUserEmail={currentUser.email}
            />
            <Text style={styles.storyLabel} numberOfLines={1}>
              {u.name.split(" ")[0]}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 10,
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  storyItem: { alignItems: "center", gap: 3, width: 48 },
  storyLabel: {
    fontSize: 10, fontWeight: "600", color: "#555",
    textAlign: "center", maxWidth: 48,
  },
});

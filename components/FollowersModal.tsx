/**
 * FollowersModal.tsx — migrado para Firestore
 * Lê usuários da coleção "users" via onSnapshot ao abrir o modal,
 * eliminando AsyncStorage.getItem("@App:users").
 */

import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity,
  Modal, StyleSheet, ActivityIndicator,
} from "react-native";
import { MaterialIcons }  from "@expo/vector-icons";
import { router }         from "expo-router";
import { db, collection } from "../src/services/firebaseConfig";
import { onSnapshot }     from "firebase/firestore";
import { useFollow }      from "../src/context/FollowContext";
import { useAuth }        from "../src/context/AuthContext";

interface PublicUser {
  name: string;
  email: string;
  photo?: string;
  profession?: string;
}

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  targetEmail: string;
  mode: "followers" | "following";
}

export default function FollowersModal({
  visible, onClose, targetEmail, mode,
}: FollowersModalProps) {
  const { getFollowers, getFollowing, isFollowing, toggleFollow } = useFollow();
  const { user } = useAuth();

  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading]   = useState(true);

  // Listener em tempo real — ativo apenas enquanto o modal está visível
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const users: PublicUser[] = snapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            name:       data.name       ?? "",
            email:      data.email      ?? d.id,
            photo:      data.photo      ?? undefined,
            profession: data.profession ?? undefined,
          };
        });
        setAllUsers(users);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao ouvir usuários (modal):", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [visible]);

  const targetEmails =
    mode === "followers" ? getFollowers(targetEmail) : getFollowing(targetEmail);

  const displayedUsers = allUsers.filter((u) => targetEmails.includes(u.email));

  const title =
    mode === "followers"
      ? `${targetEmails.length} Seguidor${targetEmails.length !== 1 ? "es" : ""}`
      : `${targetEmails.length} Seguindo`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4169E1" />
          </View>
        ) : displayedUsers.length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="people-outline" size={56} color="#DDD" />
            <Text style={styles.emptyText}>
              {mode === "followers" ? "Nenhum seguidor ainda" : "Não segue ninguém ainda"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedUsers}
            keyExtractor={(u) => u.email}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const following = user ? isFollowing(user.email, item.email) : false;
              const isSelf    = user?.email === item.email;

              return (
                <View style={styles.userRow}>
                  <TouchableOpacity
                    style={styles.userInfo}
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      router.push({ pathname: "/perfil", params: { viewUserEmail: item.email } });
                    }}
                  >
                    {item.photo ? (
                      <Image source={{ uri: item.photo }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.nameCol}>
                      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                      {!!item.profession && (
                        <Text style={styles.profession} numberOfLines={1}>{item.profession}</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {!isSelf && user && (
                    <TouchableOpacity
                      style={[styles.followBtn, following && styles.followingBtn]}
                      onPress={() => toggleFollow(user.email, item.email)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                        {following ? "Seguindo" : "Seguir"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: "#FFF", elevation: 2 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F8F9FA", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#212529" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15, color: "#BBB", fontWeight: "600" },
  list: { padding: 16, gap: 10 },
  userRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, padding: 14, elevation: 1, gap: 12 },
  userInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#4169E1", justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#FFF", fontWeight: "700", fontSize: 18 },
  nameCol: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: "#212529" },
  profession: { fontSize: 12, color: "#999", marginTop: 2 },
  followBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "#4169E1" },
  followingBtn: { backgroundColor: "#F0F0F0", borderWidth: 1, borderColor: "#DDD" },
  followBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
  followingBtnText: { color: "#666" },
});

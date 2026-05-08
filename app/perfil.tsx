import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

const PRESET_AVATARS = [
  "https://imagetourl.cloud/usr5cr0j.png",
  "https://imagetourl.cloud/h62kr4bl.png",
  "https://imagetourl.cloud/h5m0esya.png",
];

interface PublicUser {
  name: string;
  email: string;
  photo?: string;
  profession?: string;
  likes: string[];
  dislikes: string[];
}

// ── Perfil de outro usuário (somente leitura) ─────────────────────────────────
function OtherUserProfile({ targetEmail }: { targetEmail: string }) {
  const { user: loggedUser, handleProfileReaction } = useAuth();
  const [target, setTarget] = useState<PublicUser | null>(null);
  const [loadingTarget, setLoadingTarget] = useState(true);

  const loadTarget = async () => {
    setLoadingTarget(true);
    try {
      const all = await AsyncStorage.getItem("@App:users");
      const users: any[] = all ? JSON.parse(all) : [];
      const found = users.find((u) => u.email === targetEmail);
      if (found) {
        const { passwordHash, ...pub } = found;
        setTarget(pub as PublicUser);
      }
    } catch (e) {
      console.error("Erro ao carregar usuário:", e);
    } finally {
      setLoadingTarget(false);
    }
  };

  useEffect(() => {
    loadTarget();
  }, [targetEmail]);

  const handleReact = async (type: "like" | "dislike") => {
    if (!loggedUser) return;
    await handleProfileReaction(targetEmail, type);
    await loadTarget();
  };

  if (loadingTarget) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!target) {
    return (
      <View style={styles.containerCenter}>
        <MaterialIcons name="person-off" size={60} color="#DDD" />
        <Text style={styles.notLoggedText}>Usuário não encontrado.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.back()}>
          <Text style={styles.loginButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSelf = loggedUser?.email === target.email;
  const likedByMe = loggedUser ? (target.likes ?? []).includes(loggedUser.email) : false;
  const dislikedByMe = loggedUser ? (target.dislikes ?? []).includes(loggedUser.email) : false;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Avatar + info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
          {target.photo ? (
            <Image source={{ uri: target.photo }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {target.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.userName}>{target.name}</Text>

        {/* Profissão (abaixo do nome, acima do email) */}
        {!!target.profession && (
          <View style={styles.professionRow}>
            <MaterialIcons name="work-outline" size={14} color="#4169E1" />
            <Text style={styles.professionText}>{target.profession}</Text>
          </View>
        )}

        <Text style={styles.userEmail}>{target.email}</Text>

        {/* Reações */}
        <View style={styles.reactionContainer}>
          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => handleReact("like")}
            disabled={isSelf || !loggedUser}
          >
            <MaterialIcons
              name="thumb-up"
              size={26}
              color={likedByMe ? "#4169E1" : "#CCC"}
            />
          </TouchableOpacity>
          <Text style={styles.reactionCount}>{target.likes?.length ?? 0}</Text>

          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => handleReact("dislike")}
            disabled={isSelf || !loggedUser}
          >
            <MaterialIcons
              name="thumb-down"
              size={26}
              color={dislikedByMe ? "#E63946" : "#CCC"}
            />
          </TouchableOpacity>
          <Text style={styles.reactionCount}>{target.dislikes?.length ?? 0}</Text>
        </View>

        {isSelf && (
          <Text style={styles.selfNote}>Este é o seu próprio perfil</Text>
        )}
        {!loggedUser && (
          <Text style={styles.selfNote}>Faça login para reagir</Text>
        )}
      </View>

      {/* Info card */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <MaterialIcons name="verified-user" size={24} color="#4169E1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>Conta Ativa</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Perfil próprio ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { viewUserEmail } = useLocalSearchParams<{ viewUserEmail?: string }>();
  const { user, signOut, updateProfile, handleProfileReaction, loading } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editProfession, setEditProfession] = useState("");
  const [photoPreviewError, setPhotoPreviewError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Redireciona para perfil do outro usuário se o param veio preenchido
  // e não é o próprio usuário logado
  if (viewUserEmail && viewUserEmail !== user?.email) {
    return <OtherUserProfile targetEmail={viewUserEmail} />;
  }

  useFocusEffect(
    React.useCallback(() => {
      if (!loading && !user) {
        const timer = setTimeout(() => router.replace("/login"), 100);
        return () => clearTimeout(timer);
      }
    }, [user, loading])
  );

  const openEditModal = () => {
    setEditName(user?.name ?? "");
    setEditPhotoUrl(user?.photo ?? "");
    setEditProfession(user?.profession ?? "");
    setPhotoPreviewError(false);
    setEditModalVisible(true);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à sua galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setEditPhotoUrl(result.assets[0].uri);
      setPhotoPreviewError(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert("Nome inválido", "O nome deve ter no mínimo 2 caracteres.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(
        editName.trim(),
        editPhotoUrl.trim() || undefined,
        editProfession.trim()
      );
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    setEditPhotoUrl("");
    setPhotoPreviewError(false);
  };

  const handleLogout = () => {
    Alert.alert("Sair da Conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await signOut();
            router.replace("/login");
          } catch (error: any) {
            Alert.alert("Erro", error.message || "Erro ao fazer logout");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.containerCenter}>
        <MaterialIcons name="lock" size={60} color="#DDD" />
        <Text style={styles.notLoggedText}>Você não está logado.</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.loginButtonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const previewUrl = editPhotoUrl.trim();
  const showPreview = previewUrl.length > 0 && !photoPreviewError;
  const isDark = user.darkMode;

  return (
    <ScrollView
      style={[styles.container, isDark && styles.darkBg]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Meu Perfil</Text>
        <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
          <MaterialIcons name="edit" size={20} color="#4169E1" />
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Profile Section ── */}
      <View style={[styles.profileSection, isDark && styles.darkCard]}>
        <View style={styles.avatarWrapper}>
          {user.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.userName, isDark && styles.darkText]}>{user.name}</Text>

        {/* Profissão (abaixo do nome, acima do email) */}
        {!!user.profession && (
          <View style={styles.professionRow}>
            <MaterialIcons name="work-outline" size={14} color="#4169E1" />
            <Text style={styles.professionText}>{user.profession}</Text>
          </View>
        )}

        <Text style={styles.userEmail}>{user.email}</Text>

        <View style={styles.reactionContainer}>
          <TouchableOpacity
            onPress={() => handleProfileReaction(user.email, "like")}
            style={styles.reactionButton}
          >
            <MaterialIcons
              name="thumb-up"
              size={24}
              color={(user.likes ?? []).includes(user.email) ? "#4169E1" : "#999"}
            />
          </TouchableOpacity>
          <Text style={[styles.reactionCount, isDark && styles.darkText]}>
            {user.likes?.length ?? 0}
          </Text>
          <TouchableOpacity
            onPress={() => handleProfileReaction(user.email, "dislike")}
            style={styles.reactionButton}
          >
            <MaterialIcons
              name="thumb-down"
              size={24}
              color={(user.dislikes ?? []).includes(user.email) ? "#E63946" : "#999"}
            />
          </TouchableOpacity>
          <Text style={[styles.reactionCount, isDark && styles.darkText]}>
            {user.dislikes?.length ?? 0}
          </Text>
        </View>
      </View>

      {/* ── Info Section ── */}
      <View style={styles.infoSection}>
        <View style={[styles.infoCard, isDark && styles.darkCard]}>
          <MaterialIcons name="verified-user" size={24} color="#4169E1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, isDark && styles.darkText]}>Conta Ativa</Text>
          </View>
        </View>
        <View style={[styles.infoCard, isDark && styles.darkCard]}>
          <MaterialIcons name="calendar-today" size={24} color="#4169E1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Membro desde</Text>
            <Text style={[styles.infoValue, isDark && styles.darkText]}>
              {new Date().toLocaleDateString("pt-BR")}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={styles.logoutItem}
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator color="#E63946" size="small" />
        ) : (
          <MaterialIcons name="logout" size={22} color="#E63946" />
        )}
        <Text style={styles.logoutText}>
          {isLoggingOut ? "Saindo..." : "Sair da Conta"}
        </Text>
        {!isLoggingOut && (
          <MaterialIcons name="chevron-right" size={22} color="#E63946" />
        )}
      </TouchableOpacity>

      {/* ── Footer ── */}
      <Text style={styles.footerText}>Versão 1.0.0</Text>

      {/* ── Modal de Edição ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !isSaving && setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <TouchableOpacity
                onPress={() => !isSaving && setEditModalVisible(false)}
                disabled={isSaving}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalAvatarArea}>
                {showPreview ? (
                  <Image
                    source={{ uri: previewUrl }}
                    style={styles.modalAvatarImage}
                    onError={() => setPhotoPreviewError(true)}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarInitial}>
                      {(editName || user.name).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
                <MaterialIcons name="photo-library" size={20} color="#FFF" />
                <Text style={styles.galleryBtnText}>Escolher da Galeria</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Ou escolha um personagem:</Text>
              <View style={styles.presetRow}>
                {PRESET_AVATARS.map((url) => (
                  <TouchableOpacity
                    key={url}
                    onPress={() => {
                      setEditPhotoUrl(url);
                      setPhotoPreviewError(false);
                    }}
                  >
                    <Image
                      source={{ uri: url }}
                      style={[
                        styles.presetImg,
                        editPhotoUrl === url && styles.presetImgSelected,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Nome */}
              <Text style={styles.inputLabel}>Nome</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#999" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Seu nome"
                  placeholderTextColor="#CCC"
                  maxLength={50}
                  editable={!isSaving}
                />
              </View>

              {/* Profissão */}
              <Text style={styles.inputLabel}>Profissão / O que você faz</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="work-outline" size={20} color="#999" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  value={editProfession}
                  onChangeText={setEditProfession}
                  placeholder="Ex: Desenvolvedor, Designer, Estudante..."
                  placeholderTextColor="#CCC"
                  maxLength={60}
                  editable={!isSaving}
                />
              </View>

              {/* Foto URL */}
              <Text style={styles.inputLabel}>Foto de perfil (URL)</Text>
              <View style={[styles.inputContainer, { alignItems: "flex-start", paddingTop: 14 }]}>
                <MaterialIcons name="link" size={20} color="#999" style={{ marginRight: 10, marginTop: 2 }} />
                <TextInput
                  style={[styles.textInput, { minHeight: 44 }]}
                  value={editPhotoUrl}
                  onChangeText={(v) => {
                    setEditPhotoUrl(v);
                    setPhotoPreviewError(false);
                  }}
                  placeholder="https://exemplo.com/foto.jpg"
                  placeholderTextColor="#CCC"
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!isSaving}
                  multiline
                />
              </View>

              {photoPreviewError && editPhotoUrl.trim().length > 0 && (
                <Text style={styles.photoErrorText}>
                  URL inválida ou imagem não carregou.
                </Text>
              )}

              {editPhotoUrl.trim().length > 0 && (
                <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemovePhoto}>
                  <MaterialIcons name="delete-outline" size={16} color="#E63946" />
                  <Text style={styles.removePhotoText}>Remover foto</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar alterações</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { paddingBottom: 40 },
  darkBg: { backgroundColor: "#121212" },
  darkCard: { backgroundColor: "#1E1E1E" },
  darkText: { color: "#FFF" },
  containerCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: { fontSize: 16, color: "#666", marginTop: 10 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#212529" },
  backButton: { padding: 8 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
  },
  editButtonText: { color: "#4169E1", fontWeight: "700", fontSize: 14 },
  profileSection: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    elevation: 2,
  },
  avatarWrapper: { marginBottom: 16 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4169E1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFF", fontSize: 40, fontWeight: "bold" },
  userName: { fontSize: 24, fontWeight: "800", color: "#212529", marginBottom: 6 },
  professionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  professionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4169E1",
  },
  userEmail: { color: "#666", fontSize: 14, marginBottom: 16 },
  reactionContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  reactionButton: { padding: 6 },
  reactionCount: { fontWeight: "bold", color: "#333", fontSize: 15 },
  selfNote: { marginTop: 12, fontSize: 12, color: "#AAA", fontStyle: "italic" },
  notLoggedText: { fontSize: 16, color: "#666", marginTop: 15, marginBottom: 20 },
  loginButton: {
    backgroundColor: "#4169E1",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  loginButtonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  infoSection: { paddingHorizontal: 20, marginTop: 20, gap: 12 },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 1,
  },
  infoContent: { marginLeft: 16, flex: 1 },
  infoLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#212529" },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 12,
    elevation: 1,
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#E63946",
    fontWeight: "bold",
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#212529" },
  modalAvatarArea: { alignItems: "center", marginBottom: 20 },
  modalAvatarImage: { width: 90, height: 90, borderRadius: 45 },
  modalAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#4169E1",
    justifyContent: "center",
    alignItems: "center",
  },
  modalAvatarInitial: { color: "#FFF", fontSize: 36, fontWeight: "bold" },
  galleryBtn: {
    flexDirection: "row",
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  galleryBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  presetRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  presetImg: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: "#EEE" },
  presetImgSelected: { borderColor: "#4169E1", borderWidth: 3 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 16,
  },
  textInput: { flex: 1, fontSize: 15, color: "#333" },
  photoErrorText: { fontSize: 12, color: "#E63946", marginBottom: 10, marginLeft: 4 },
  removePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E63946",
  },
  removePhotoText: { color: "#E63946", fontSize: 13, fontWeight: "600" },
  saveButton: {
    backgroundColor: "#4169E1",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

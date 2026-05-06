import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
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
  'https://cdn-icons-png.flaticon.com/512/6840/6840478.png', // Ex: Personagem 1
  'https://cdn-icons-png.flaticon.com/512/6840/6840422.png', // Ex: Personagem 2
];

export default function ProfileScreen() 
export default function HomeScreen() {
  const { user, toggleTTS } = useAuth();
  const [showMostLiked, setShowMostLiked] = useState(true);

  // Lógica de ordenação inicial
  const displayedArticles = useMemo(() => {
    if (showMostLiked) {
      return [...articles].sort((a, b) => (reactions[b.url]?.like ? 1 : 0) - (reactions[a.url]?.like ? 1 : 0));
    }
    return articles;
  }, [articles, showMostLiked]);

  const handleAccessibilityPress = () => {
    const msg = user?.ttsEnabled ? "Leitura de tela desativada" : "Leitura de tela ativada";
    toggleTTS();
    Alert.alert("Acessibilidade", msg);
    if (!user?.ttsEnabled) Speech.speak(msg, { language: 'pt-BR' });
  };

  return (
    <View style={[styles.container, user?.darkMode && styles.darkBg]}>
      {/* Sistema de Anúncio Discreto */}
      <View style={styles.adBanner}><Text style={styles.adText}>Anúncio Patrocinado</Text></View>

      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={handleAccessibilityPress} style={styles.qMarkButton}>
            <Text style={styles.qMarkText}>?</Text>
          </TouchableOpacity>
          <Text style={styles.headerGreeting}>Olá, {firstName}!</Text>
          <Text style={styles.headerTitle}>Explore</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme}>
             <MaterialIcons name={user?.darkMode ? "light-mode" : "dark-mode"} size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>
      
      {/* ... Restante da FlatList usando displayedArticles ... */}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... estilos anteriores ...
  qMarkButton: { position: 'absolute', top: -15, left: 0, opacity: 0.3 },
  qMarkText: { fontSize: 12, color: 'gray' },
  darkBg: { backgroundColor: '#121212' },
  adBanner: { height: 50, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginVertical: 10, borderRadius: 8 },
  adText: { fontSize: 10, color: '#999' }
});{
  const { user, signOut, updateProfile, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [photoPreviewError, setPhotoPreviewError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user, updateProfile, handleReaction } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      if (!loading && !user) {
        const timer = setTimeout(() => {
          router.replace("/login");
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [user, loading])
  );

  const openEditModal = () => {
    setEditName(user?.name ?? '');
    setEditPhotoUrl(user?.photo ?? '');
    setPhotoPreviewError(false);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert("Nome inválido", "O nome deve ter no mínimo 2 caracteres.");
      return;
    }
    setIsSaving(true);
    try {
      const photo = editPhotoUrl.trim() || undefined;
      await updateProfile(editName.trim(), photo);
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    setEditPhotoUrl('');
    setPhotoPreviewError(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setEditPhotoUrl(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sair da Conta",
      "Tem certeza que deseja sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await signOut();
              Alert.alert("Logout", "Você saiu da sua conta com sucesso.");
              router.replace("/login");
            } catch (error: any) {
              Alert.alert("Erro", error.message || "Erro ao fazer logout");
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScrollView style={user?.darkMode && styles.darkBg}>
        <View style={styles.profileSection}>
          <Image source={{ uri: user.photo }} style={styles.avatarImage} />
          <Text style={styles.userName}>{user.name}</Text>

          {/* Sistema de Like/Dislike no Perfil */}
          <View style={styles.reactionRow}>
            <TouchableOpacity onPress={() => handleReaction(user.email, 'like')}>
              <MaterialIcons name="thumb-up" size={24} color={user.likedByMe ? "blue" : "gray"} />
            </TouchableOpacity>
            <Text>{user.likesCount}</Text>
          </View>
        </View>

        {/* Dentro do Modal de Edição */}
        <TouchableOpacity onPress={pickImage} style={styles.galleryButton}>
          <Text>Escolher da Galeria</Text>
        </TouchableOpacity>

        <Text>Ou escolha um Personagem:</Text>
        <ScrollView horizontal>
          {PRESET_AVATARS.map(url => (
            <TouchableOpacity key={url} onPress={() => setEditPhotoUrl(url)}>
              <Image source={{ uri: url }} style={styles.presetAvatar} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    );
  }
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

return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
        <MaterialIcons name="edit" size={20} color="#4169E1" />
        <Text style={styles.editButtonText}>Editar</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.profileSection}>
      <View style={styles.avatarWrapper}>
        {user.photo ? (
          <Image
            source={{ uri: user.photo }}
            style={styles.avatarImage}
            onError={() => {/* ignora erro silenciosamente */ }}
          />
        ) : (
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.userName}>{user.name}</Text>
      <Text style={styles.userEmail}>{user.email}</Text>
    </View>

    <View style={styles.infoSection}>
      <View style={styles.infoCard}>
        <MaterialIcons name="verified-user" size={24} color="#4169E1" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>Conta Ativa</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <MaterialIcons name="calendar-today" size={24} color="#4169E1" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Membro desde</Text>
          <Text style={styles.infoValue}>
            {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
    </View>

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
      {!isLoggingOut && <MaterialIcons name="chevron-right" size={22} color="#E63946" />}
    </TouchableOpacity>

    <View style={styles.footer}>
      <Text style={styles.footerText}>Versão 1.0.0</Text>
    </View>

    {/* ── Modal de edição ── */}
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => !isSaving && setEditModalVisible(false)}
    >
    <ScrollView style={user?.darkMode && styles.darkBg}>
        <View style={styles.profileSection}>
          <Image source={{ uri: user.photo }} style={styles.avatarImage} />
          <Text style={styles.userName}>{user.name}</Text>

          {/* Sistema de Like/Dislike no Perfil */}
          <View style={styles.reactionRow}>
            <TouchableOpacity onPress={() => handleReaction(user.email, 'like')}>
              <MaterialIcons name="thumb-up" size={24} color={user.likedByMe ? "blue" : "gray"} />
            </TouchableOpacity>
            <Text>{user.likesCount}</Text>
          </View>
        </View>

        {/* Dentro do Modal de Edição */}
        <TouchableOpacity onPress={pickImage} style={styles.galleryButton}>
          <Text>Escolher da Galeria</Text>
        </TouchableOpacity>

        <Text>Ou escolha um Personagem:</Text>
        <ScrollView horizontal>
          {PRESET_AVATARS.map(url => (
            <TouchableOpacity key={url} onPress={() => setEditPhotoUrl(url)}>
              <Image source={{ uri: url }} style={styles.presetAvatar} />
            </TouchableOpacity>
          ))}
        </ScrollView>
    </ScrollView> 
      );
      }

      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              disabled={isSaving}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Preview do avatar */}
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

            {/* Campo nome */}
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

            {/* Campo URL da foto */}
            <Text style={styles.inputLabel}>Foto de perfil (URL)</Text>
            <View style={[styles.inputContainer, { alignItems: 'flex-start', paddingTop: 14 }]}>
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

            {/* Erro de preview */}
            {photoPreviewError && editPhotoUrl.trim().length > 0 && (
              <Text style={styles.photoErrorText}>
                URL inválida ou imagem não carregou. Verifique o link.
              </Text>
            )}

            {/* Remover foto */}
            {editPhotoUrl.trim().length > 0 && (
              <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemovePhoto}>
                <MaterialIcons name="delete-outline" size={16} color="#E63946" />
                <Text style={styles.removePhotoText}>Remover foto</Text>
              </TouchableOpacity>
            )}

            {/* Salvar */}
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
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#4169E1',
    fontWeight: '700',
    fontSize: 14,
  },
  profileSection: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    elevation: 2,
  },
  avatarWrapper: {
    marginBottom: 20,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4169E1",
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#212529",
    marginBottom: 4,
  },
  userEmail: {
    color: "#666",
    fontSize: 14,
    marginBottom: 4,
  },
  notLoggedText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#4169E1",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  loginButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
  // ── Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#212529',
  },
  modalAvatarArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  modalAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarInitial: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  photoErrorText: {
    fontSize: 12,
    color: '#E63946',
    marginBottom: 10,
    marginLeft: 4,
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E63946',
  },
  removePhotoText: {
    color: '#E63946',
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../src/context/AuthContext";

const PRESET_AVATARS = [
  'https://cdn-icons-png.flaticon.com/512/6840/6840478.png',
  'https://cdn-icons-png.flaticon.com/512/6840/6840422.png',
  'https://cdn-icons-png.flaticon.com/512/6840/6840455.png'
];

export default function ProfileScreen() {
  const { user, updateProfile, handleProfileReaction } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [tempName, setTempName] = useState(user?.name || "");
  const [tempPhoto, setTempPhoto] = useState(user?.photo || "");

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setTempPhoto(result.assets[0].uri);
  };

  const handleSave = () => {
    updateProfile(tempName, tempPhoto);
    setModalVisible(false);
  };

  const isDark = user?.darkMode;

  return (
    <ScrollView style={[styles.container, isDark && styles.darkBg]}>
      <View style={[styles.profileCard, isDark && styles.darkCard]}>
        <Image source={{ uri: user?.photo || 'https://via.placeholder.com/100' }} style={styles.avatar} />
        <Text style={[styles.name, isDark && styles.darkText]}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.reactionContainer}>
          <TouchableOpacity onPress={() => handleProfileReaction(user!.email, 'like')}>
            <MaterialIcons name="thumb-up" size={24} color={user?.likes.includes(user.email) ? "#4169E1" : "#999"} />
          </TouchableOpacity>
          <Text style={[styles.count, isDark && styles.darkText]}>{user?.likes.length}</Text>
          
          <TouchableOpacity onPress={() => handleProfileReaction(user!.email, 'dislike')}>
            <MaterialIcons name="thumb-down" size={24} color={user?.dislikes.includes(user.email) ? "#E63946" : "#999"} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.editBtnText}>Editar Perfil</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Editar Perfil</Text>
          
          <Image source={{ uri: tempPhoto || 'https://via.placeholder.com/100' }} style={styles.previewAvatar} />
          
          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
            <MaterialIcons name="photo-library" size={20} color="#FFF" />
            <Text style={{color: '#FFF', marginLeft: 10}}>Galeria</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Escolha um Personagem:</Text>
          <View style={styles.presetRow}>
            {PRESET_AVATARS.map(url => (
              <TouchableOpacity key={url} onPress={() => setTempPhoto(url)}>
                <Image source={{ uri: url }} style={styles.presetImg} />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} value={tempName} onChangeText={setTempName} placeholder="Nome" />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{color: '#FFF'}}>Salvar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{marginTop: 15}}>Cancelar</Text></TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },
  darkBg: { backgroundColor: "#121212" },
  profileCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 30, alignItems: 'center', elevation: 4 },
  darkCard: { backgroundColor: "#1E1E1E" },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15 },
  name: { fontSize: 22, fontWeight: '800' },
  email: { color: '#999', marginBottom: 15 },
  reactionContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  count: { fontWeight: 'bold' },
  darkText: { color: "#FFF" },
  editBtn: { backgroundColor: "#4169E1", padding: 15, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  editBtnText: { color: '#FFF', fontWeight: '700' },
  modalContent: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  previewAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  galleryBtn: { flexDirection: 'row', backgroundColor: '#333', padding: 12, borderRadius: 8, marginBottom: 20 },
  presetRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  presetImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#EEE' },
  input: { width: '100%', borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 20 },
  saveBtn: { backgroundColor: "#4169E1", width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' }
});

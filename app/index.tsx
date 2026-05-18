import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../src/context/AuthContext";
import MediaViewer, { detectMedia } from "../components/MediaViewer";
import InfoDashboard from "../components/infodashboard";
import FloatingMenu from "../components/Floatingmenu";
import FollowingStories from "../components/FollowingStories";

type Article = {
  author?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null };
  title?: string | null;
  url?: string | null;
  urlToImage?: string | null;
};

// ── ArticleReactions agora inclui title, category e accessCount ───────────────
export type ArticleReactions = {
  likes: string[];
  dislikes: string[];
  title?: string;
  category?: string;
  accessCount?: number;
};

const REACTIONS_KEY = "@App:articleReactions";
const CUSTOM_CATEGORIES_KEY = "@App:customCategories";

const safeR = (r: any): ArticleReactions => ({
  likes: Array.isArray(r?.likes) ? r.likes : [],
  dislikes: Array.isArray(r?.dislikes) ? r.dislikes : [],
  title: r?.title ?? undefined,
  category: r?.category ?? undefined,
  accessCount: typeof r?.accessCount === "number" ? r.accessCount : 0,
});

// ── Categorias padrão ─────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { label: "Brasil", query: "Brasil", icon: "🇧🇷", isDefault: true },
  { label: "Tecnologia", query: "tecnologia", icon: "💻", isDefault: true },
  { label: "Economia", query: "economia", icon: "📈", isDefault: true },
  { label: "Esportes", query: "esportes", icon: "⚽", isDefault: true },
  { label: "Saúde", query: "saúde", icon: "❤️", isDefault: true },
  { label: "Política", query: "política", icon: "🏛️", isDefault: true },
  { label: "Ciência", query: "ciência", icon: "🔬", isDefault: true },
  { label: "Entretenimento", query: "entretenimento", icon: "🎬", isDefault: true },
  { label: "Mundo", query: "mundo", icon: "🌍", isDefault: true },
];

type Category = { label: string; query: string; icon: string; isDefault: boolean };

// ── Animated Card ──────────────────────────────────────────────────────────────
const AnimatedCard = ({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ArticleReactions>>({});

  // ── Dashboard #info ────────────────────────────────────────────────────────
  const [showDashboard, setShowDashboard] = useState(false);

  // ── Categorias personalizadas ──────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const ICON_OPTIONS = [
    "🔍","🌐","📰","⭐","🔥","💡","🎯","🚀","📊","🗺️",
    "🇧🇷","🌍","🏛️","⚖️","🧭","🗞️","📡","📢","🔔","💬",
    "💻","📱","🤖","🧠","🔬","🧪","⚗️","🛰️","🔭","💾",
    "📈","💰","🏦","💳","🪙","💹","🏪","📦","🤝","🏭",
    "⚽","🏀","🎾","🏊","🚴","🥇","🏋️","⛷️","🎮","🏆",
    "❤️","🩺","💊","🏥","🧬","🦠","🩻","🧘","🥗","🏃",
    "🎬","🎵","🎭","📚","🖼️","🎨","📷","🎤","🎧","🎪",
    "✈️","🚂","🚗","🚢","🌅","🏔️","🏖️","🌿","🌊","🗼",
  ];

  const menuAnimation = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // ── Menu flutuante inferior ────────────────────────────────────────────────
  // Gerenciado pelo componente FloatingMenu

  // ── Carrega categorias salvas e reações do storage ─────────────────────────
  useEffect(() => {
    // Carrega reações
    AsyncStorage.getItem(REACTIONS_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored);
          const migrated: Record<string, ArticleReactions> = {};
          for (const key of Object.keys(parsed)) {
            migrated[key] = safeR(parsed[key]);
          }
          setReactions(migrated);
        }
      })
      .catch(() => {});

    // Carrega categorias — storage é a fonte da verdade
    AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY)
      .then((stored) => {
        if (stored) {
          // Já foi salvo antes: usa exatamente o que está no storage
          setCategories(JSON.parse(stored) as Category[]);
        } else {
          // Primeira execução: persiste os defaults e usa eles
          AsyncStorage.setItem(
            CUSTOM_CATEGORIES_KEY,
            JSON.stringify(DEFAULT_CATEGORIES)
          ).catch(() => {});
          setCategories(DEFAULT_CATEGORIES);
        }
      })
      .catch(() => {
        setCategories(DEFAULT_CATEGORIES);
      });
  }, []);

  // ── Persiste categorias ────────────────────────────────────────────────────
  const persistCategories = useCallback(async (cats: Category[]) => {
    try {
      await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
    } catch (e) {
      console.error("Erro ao salvar categorias:", e);
    }
  }, []);

  // ── Adiciona categoria personalizada ──────────────────────────────────────
  const handleAddCategory = useCallback(() => {
    const label = newCatLabel.trim();
    if (!label) {
      Alert.alert("Nome inválido", "Digite um nome para a categoria.");
      return;
    }
    if (categories.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
      Alert.alert("Duplicada", "Já existe uma categoria com esse nome.");
      return;
    }
    const newCat: Category = {
      label,
      query: label,
      icon: newCatIcon.trim() || "🔍",
      isDefault: false,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    persistCategories(updated);
    setNewCatLabel("");
    setNewCatIcon("");
  }, [newCatLabel, newCatIcon, categories, persistCategories]);

  // ── Remove categoria ───────────────────────────────────────────────────────
  const handleRemoveCategory = useCallback(
    (label: string) => {
      Alert.alert(
        "Remover categoria",
        `Remover "${label}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: () => {
              const updated = categories.filter((c) => c.label !== label);
              setCategories(updated);
              persistCategories(updated);
              if (activeCategory === label) {
                setActiveCategory(null);
                setSearch("");
              }
            },
          },
        ]
      );
    },
    [categories, persistCategories, activeCategory]
  );

  // ── Restaura categorias padrão ─────────────────────────────────────────────
  const handleRestoreDefaults = useCallback(() => {
    Alert.alert(
      "Restaurar padrões",
      "Isso removerá suas categorias personalizadas e restaurará as originais.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: async () => {
            setCategories(DEFAULT_CATEGORIES);
            await AsyncStorage.setItem(
              CUSTOM_CATEGORIES_KEY,
              JSON.stringify(DEFAULT_CATEGORIES)
            );
            setActiveCategory(null);
            setSearch("");
          },
        },
      ]
    );
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading && !user && hasInitialized) {
        router.replace("/login");
      }
      // Reload reactions from storage every time screen is focused
      // so swipe-reactions from explore.tsx appear immediately
      AsyncStorage.getItem(REACTIONS_KEY)
        .then((stored) => {
          if (stored) {
            const parsed = JSON.parse(stored);
            const migrated: Record<string, ArticleReactions> = {};
            for (const key of Object.keys(parsed)) {
              migrated[key] = safeR(parsed[key]);
            }
            setReactions(migrated);
          }
        })
        .catch(() => {});
    }, [hasInitialized, loading, user])
  );

  useEffect(() => {
    if (!loading) {
      setHasInitialized(true);
      if (!user) {
        const timer = setTimeout(() => {
          router.replace("/login");
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user]);

  // ── Busca notícias ─────────────────────────────────────────────────────────
  const buscarNoticias = useCallback(
    async (queryOverride?: string) => {
      const queryTerm = queryOverride !== undefined ? queryOverride : search;
      if (!queryTerm.trim() && articles.length > 0) return;

      const resolvedKey = (process.env.EXPO_PUBLIC_NEWS_API_KEY ?? "")
        .replace(/["\s;]/g, "")
        .trim();

      if (!resolvedKey) {
        Alert.alert(
          "Configuração ausente",
          "Defina EXPO_PUBLIC_NEWS_API_KEY no ambiente."
        );
        return;
      }

      setLoadingArticles(true);
      const query = queryTerm.trim() || "Brasil";
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        query
      )}&language=pt&sortBy=publishedAt&apiKey=${resolvedKey}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        setArticles(Array.isArray(data.articles) ? data.articles : []);
      } catch (error) {
        console.error("Erro ao buscar notícias:", error);
        Alert.alert("Erro", "Erro ao buscar notícias. Verifique sua conexão.");
      } finally {
        setLoadingArticles(false);
      }
    },
    [articles.length, search]
  );

  useEffect(() => {
    if (user && articles.length === 0) {
      buscarNoticias();
    }
  }, [articles.length, buscarNoticias, user]);

  // ── Detecta #info na busca ─────────────────────────────────────────────────
  const handleSearchSubmit = useCallback(() => {
    if (search.trim().toLowerCase() === "#info") {
      setShowDashboard(true);
      return;
    }
    buscarNoticias();
  }, [search, buscarNoticias]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (text === "") setActiveCategory(null);
    if (text.trim().toLowerCase() === "#info") {
      setShowDashboard(true);
    }
  };

  // ── Limpa busca ───────────────────────────────────────────────────────────
  const handleClearSearch = () => {
    setSearch("");
    setActiveCategory(null);
    buscarNoticias("Brasil");
  };

  // ── Rastreia acesso ao artigo completo ─────────────────────────────────────
  const trackArticleAccess = useCallback(
    async (article: Article, category?: string) => {
      if (!user) return;
      const key = article.url ?? article.title ?? "";
      if (!key) return;

      const current = safeR(reactions[key]);
      const updated: Record<string, ArticleReactions> = {
        ...reactions,
        [key]: {
          ...current,
          title: article.title ?? current.title,
          category: category ?? current.category,
          accessCount: (current.accessCount ?? 0) + 1,
        },
      };
      setReactions(updated);
      try {
        await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao salvar acesso:", e);
      }
    },
    [reactions, user]
  );

  const handleCategoryPress = (cat: Category) => {
    if (activeCategory === cat.label) {
      setActiveCategory(null);
      setSearch("");
      buscarNoticias("Brasil");
    } else {
      setActiveCategory(cat.label);
      setSearch(cat.query);
      buscarNoticias(cat.query);
    }
  };

  const toggleMenu = () => {
    const toValue = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  // ── Reações nos artigos ────────────────────────────────────────────────────
  const handleReaction = useCallback(
    async (article: Article, type: "like" | "dislike") => {
      if (!user) return;

      const key = article.url ?? article.title ?? "";
      const current: ArticleReactions = safeR(reactions[key]);
      const email = user.email;

      let newLikes = [...current.likes];
      let newDislikes = [...current.dislikes];

      if (type === "like") {
        if (newLikes.includes(email)) {
          newLikes = newLikes.filter((e) => e !== email);
        } else {
          newLikes.push(email);
          newDislikes = newDislikes.filter((e) => e !== email);
        }
      } else {
        if (newDislikes.includes(email)) {
          newDislikes = newDislikes.filter((e) => e !== email);
        } else {
          newDislikes.push(email);
          newLikes = newLikes.filter((e) => e !== email);
        }
      }

      const updated: Record<string, ArticleReactions> = {
        ...reactions,
        [key]: {
          ...current,
          likes: newLikes,
          dislikes: newDislikes,
          title: article.title ?? current.title,
          category: activeCategory ?? current.category,
        },
      };
      setReactions(updated);
      try {
        await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao salvar reação:", e);
      }
    },
    [reactions, user, activeCategory]
  );

  // ── Loading / redirect ─────────────────────────────────────────────────────
  if (loading || !hasInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Redirecionando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Dashboard Modal ── */}
      <Modal
        visible={showDashboard}
        animationType="slide"
        onRequestClose={() => {
          setShowDashboard(false);
          setSearch("");
        }}
      >
        <InfoDashboard
          reactions={reactions}
          onClose={() => {
            setShowDashboard(false);
            setSearch("");
          }}
        />
      </Modal>

      {/* ── Modal de Gerenciar Categorias ── */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowCategoryModal(false);
          setEditMode(false);
          setNewCatLabel("");
          setNewCatIcon("");
          setShowIconPicker(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setShowCategoryModal(false);
            setEditMode(false);
            setNewCatLabel("");
            setNewCatIcon("");
            setShowIconPicker(false);
          }}
        >
          <View style={styles.catModalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.catModalContainer}>
          {/* Header do modal */}
          <View style={styles.catModalHeader}>
            <Text style={styles.catModalTitle}>Categorias</Text>
            <View style={styles.catModalHeaderActions}>
              <TouchableOpacity
                onPress={() => setEditMode((v) => !v)}
                style={[styles.catModalEditBtn, editMode && styles.catModalEditBtnActive]}
              >
                <MaterialIcons
                  name={editMode ? "check" : "edit"}
                  size={18}
                  color={editMode ? "#FFF" : "#4169E1"}
                />
                <Text style={[styles.catModalEditText, editMode && styles.catModalEditTextActive]}>
                  {editMode ? "Concluir" : "Editar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowCategoryModal(false);
                  setEditMode(false);
                  setNewCatLabel("");
                  setNewCatIcon("");
                  setShowIconPicker(false);
                }}
                style={styles.catModalCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de categorias */}
          <ScrollView
            style={styles.catModalList}
            showsVerticalScrollIndicator={false}
          >
            {categories.map((cat) => (
              <View key={cat.label} style={styles.catModalItem}>
                <Text style={styles.catModalItemIcon}>{cat.icon}</Text>
                <Text style={styles.catModalItemLabel}>{cat.label}</Text>
                {editMode && (
                  <TouchableOpacity
                    onPress={() => handleRemoveCategory(cat.label)}
                    style={styles.catModalRemoveBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="remove-circle" size={22} color="#E63946" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Adicionar nova categoria */}
          <View style={styles.catModalAddSection}>
            <Text style={styles.catModalAddTitle}>Adicionar categoria</Text>
            <View style={styles.catModalAddRow}>
              {/* Botão de ícone — abre picker */}
              <TouchableOpacity
                style={styles.catModalIconBtn}
                onPress={() => setShowIconPicker((v) => !v)}
                activeOpacity={0.75}
              >
                <Text style={styles.catModalIconBtnText}>
                  {newCatIcon || "🔍"}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.catModalLabelInput}
                value={newCatLabel}
                onChangeText={setNewCatLabel}
                placeholder="Nome da categoria..."
                placeholderTextColor="#CCC"
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleAddCategory}
              />
              <TouchableOpacity
                onPress={handleAddCategory}
                style={[
                  styles.catModalAddBtn,
                  !newCatLabel.trim() && styles.catModalAddBtnDisabled,
                ]}
                disabled={!newCatLabel.trim()}
              >
                <MaterialIcons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Picker de ícones */}
            {showIconPicker && (
              <ScrollView
                style={styles.iconPickerScroll}
                contentContainerStyle={styles.iconPickerGrid}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {ICON_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.iconPickerItem,
                      newCatIcon === emoji && styles.iconPickerItemActive,
                    ]}
                    onPress={() => {
                      setNewCatIcon(emoji);
                      setShowIconPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.iconPickerEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Restaurar padrões */}
            <TouchableOpacity
              onPress={handleRestoreDefaults}
              style={styles.catModalRestoreBtn}
            >
              <MaterialIcons name="restore" size={16} color="#999" />
              <Text style={styles.catModalRestoreText}>Restaurar categorias padrão</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Topbar: stories + actions em uma linha ── */}
      <View style={styles.topBar}>
        {/* Stories (scroll horizontal ocupa o espaço restante) */}
        <View style={styles.topBarStories}>
          {user && (
            <FollowingStories
              currentUser={{
                email: user.email,
                name: user.name,
                photo: user.photo,
              }}
              onAddPhoto={() => router.push("/perfil")}
            />
          )}
        </View>

        {/* Botões à direita */}
        <View style={styles.topBarActions}>
          <TouchableOpacity
            onPress={() => setShowDashboard(true)}
            style={styles.infoButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="insights" size={22} color="#4169E1" />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <MaterialIcons
              name={menuOpen ? "close" : "menu"}
              size={26}
              color="#4169E1"
            />
          </TouchableOpacity>
        </View>
      </View>

      {menuOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        style={[styles.expandedMenu, { opacity: menuAnimation }]}
      >
        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => {
            toggleMenu();
            router.push("/perfil");
          }}
        >
          <MaterialIcons name="account-circle" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Meu Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => {
            toggleMenu();
            router.push("/rede");
          }}
        >
          <MaterialIcons name="groups" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Rede</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => {
            toggleMenu();
            router.push("/galeria");
          }}
        >
          <MaterialIcons name="photo-library" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Galerias</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOption}
          onPress={() => {
            toggleMenu();
            router.push("/forum");
          }}
        >
          <MaterialIcons name="forum" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Forum</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          value={search}
          onChangeText={handleSearchChange}
          placeholder='Pesquisar notícias… ou "#info"'
          style={styles.input}
          placeholderTextColor="#CCC"
          editable={!loadingArticles}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={handleClearSearch}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={loadingArticles}
          >
            <View style={styles.clearButtonInner}>
              <MaterialIcons name="close" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchSubmit}
          disabled={loadingArticles}
        >
          {loadingArticles ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Categorias ── */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesRow}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.75}
              >
                {cat.icon ? (
                  <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                ) : null}
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Botão de gerenciar categorias */}
          <TouchableOpacity
            style={styles.manageCategoriesBtn}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.75}
          >
            <MaterialIcons name="tune" size={16} color="#4169E1" />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Lista de artigos ── */}
      <FlatList
        ref={flatListRef}
        data={articles}
        keyExtractor={(item, index) => `${item.url ?? "article"}-${index}`}
        renderItem={({ item, index }) => {
          const key = item.url ?? item.title ?? "";
          const r = safeR(reactions[key]);
          const email = user?.email ?? "";
          const likedByMe = email ? r.likes.includes(email) : false;
          const dislikedByMe = email ? r.dislikes.includes(email) : false;

          const media = detectMedia(
            item.url ?? undefined,
            item.urlToImage ?? undefined
          );
          const isVideo = media.type !== "image";

          return (
            <AnimatedCard index={index}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => {
                  trackArticleAccess(item, activeCategory ?? undefined);
                  router.push({
                    pathname: "/explore",
                    params: {
                      title: item.title ?? "Sem título",
                      author: item.author ?? "Redação",
                      source: item.source?.name ?? "Fonte",
                      desc: item.description ?? "Sem descrição disponível.",
                      image:
                        item.urlToImage ??
                        "https://via.placeholder.com/400x200",
                      url: item.url ?? "",
                      category: activeCategory ?? "",
                      articlesJson: JSON.stringify(articles),
                      startIndex: String(index),
                    },
                  });
                }}
              >
                <MediaViewer
                  imageUrl={item.urlToImage ?? undefined}
                  articleUrl={item.url ?? undefined}
                  height={200}
                  showBadge={isVideo}
                  style={styles.cardMediaContainer}
                />

                <View style={styles.cardContent}>
                  <View style={styles.cardSourceRow}>
                    <Text style={styles.cardSource}>
                      {item.source?.name || "Fonte"}
                    </Text>
                    {isVideo && (
                      <View style={styles.videoChip}>
                        <MaterialIcons
                          name="videocam"
                          size={11}
                          color="#4169E1"
                        />
                        <Text style={styles.videoChipText}>Vídeo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title || "Sem título"}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString("pt-BR")
                        : "Data indisponível"}
                    </Text>

                    <View style={styles.reactionRow}>
                      <TouchableOpacity
                        style={styles.reactionButton}
                        onPress={() => handleReaction(item, "like")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                      >
                        <MaterialIcons
                          name={likedByMe ? "favorite" : "favorite-border"}
                          size={20}
                          color={likedByMe ? "#E63946" : "#CCC"}
                        />
                      </TouchableOpacity>
                      {r.likes.length > 0 && (
                        <Text
                          style={[
                            styles.reactionCount,
                            likedByMe && styles.reactionCountLike,
                          ]}
                        >
                          {r.likes.length}
                        </Text>
                      )}

                      <View style={styles.reactionSeparator} />

                      <TouchableOpacity
                        style={styles.reactionButton}
                        onPress={() => handleReaction(item, "dislike")}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                      >
                        <MaterialIcons
                          name="heart-broken"
                          size={20}
                          color={dislikedByMe ? "#6B7280" : "#E0E0E0"}
                        />
                      </TouchableOpacity>
                      {r.dislikes.length > 0 && (
                        <Text
                          style={[
                            styles.reactionCount,
                            dislikedByMe && styles.reactionCountDislike,
                          ]}
                        >
                          {r.dislikes.length}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          );
        }}
        ListEmptyComponent={
          loadingArticles ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#4169E1" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="newspaper" size={60} color="#DDD" />
              <Text style={styles.emptyStateText}>
                Nenhuma notícia encontrada
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Tente buscar por um termo diferente
              </Text>
            </View>
          )
        }
      />

      {/* ── Botão flutuante: scroll para o topo ── */}
      <TouchableOpacity
        style={styles.floatingHomeBtn}
        onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="keyboard-arrow-up" size={24} color="#4169E1" />
      </TouchableOpacity>

      {/* ── Menu flutuante ── */}
      <FloatingMenu currentRoute="index" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: { fontSize: 16, color: "#666", marginTop: 10 },
  // ── Topbar compacta (stories + botões em uma linha) ───────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
    gap: 8,
  },
  topBarStories: {
    flex: 1,
    overflow: "hidden"
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  infoButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  expandedMenu: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 10,
    zIndex: 11,
    width: 200,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuOptionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  // ── Search ─────────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 10,
    alignItems: "center",
  },
  searchIcon: { position: "absolute", left: 15, zIndex: 1 },
  input: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingLeft: 42,
    paddingRight: 42,
    paddingVertical: 12,
    elevation: 2,
    fontSize: 15,
    color: "#333",
  },
  clearButton: {
    position: "absolute",
    right: 62,
    zIndex: 2,
  },
  clearButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
  },
  searchButton: {
    backgroundColor: "#4169E1",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Categories ─────────────────────────────────────────────────────────────
  categoriesWrapper: {
    marginBottom: 16,
  },
  categoriesRow: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingRight: 4,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: "#4169E1",
    borderColor: "#4169E1",
    elevation: 3,
  },
  categoryChipIcon: { fontSize: 14 },
  categoryChipText: { fontSize: 13, fontWeight: "600", color: "#555" },
  categoryChipTextActive: { color: "#FFF" },
  manageCategoriesBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },

  // ── Category Modal ─────────────────────────────────────────────────────────
  catModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  catModalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 34,
  },
  catModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  catModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#212529",
  },
  catModalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  catModalEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#4169E1",
    backgroundColor: "#FFF",
  },
  catModalEditBtnActive: {
    backgroundColor: "#4169E1",
    borderColor: "#4169E1",
  },
  catModalEditText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4169E1",
  },
  catModalEditTextActive: {
    color: "#FFF",
  },
  catModalCloseBtn: {
    padding: 4,
  },
  catModalList: {
    paddingHorizontal: 20,
    maxHeight: 280,
  },
  catModalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 12,
  },
  catModalItemIcon: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  catModalItemLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
    flex: 1,
  },
  catModalRemoveBtn: {
    padding: 2,
  },
  catModalDefaultBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catModalDefaultText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4169E1",
  },
  catModalAddSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  catModalAddTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  catModalAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  catModalIconBtn: {
    width: 48,
    height: 48,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  catModalIconBtnText: {
    fontSize: 22,
  },
  iconPickerScroll: {
    maxHeight: 180,
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 12,
  },
  iconPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 10,
  },
  iconPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  iconPickerItemActive: {
    borderColor: "#4169E1",
    backgroundColor: "#EEF2FF",
  },
  iconPickerEmoji: {
    fontSize: 20,
  },
  catModalLabelInput: {
    flex: 1,
    height: 48,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
  },
  catModalAddBtn: {
    width: 48,
    height: 48,
    backgroundColor: "#4169E1",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  catModalAddBtnDisabled: {
    backgroundColor: "#A0B4F0",
  },
  catModalRestoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingVertical: 8,
  },
  catModalRestoreText: {
    fontSize: 13,
    color: "#999",
    fontWeight: "600",
  },

  // ── Articles ───────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 15,
  },
  emptyStateSubtext: { fontSize: 14, color: "#CCC", marginTop: 5 },
  card: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 3,
  },
  cardMediaContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  cardContent: { padding: 16, backgroundColor: "#FFF" },
  cardSourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardSource: { fontSize: 12, color: "#4169E1", fontWeight: "600" },
  videoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  videoChipText: { fontSize: 10, color: "#4169E1", fontWeight: "700" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: { fontSize: 12, color: "#999" },
  reactionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  reactionButton: { padding: 2 },
  reactionCount: { fontSize: 12, fontWeight: "700", color: "#999" },
  reactionCountLike: { color: "#E63946" },
  reactionCountDislike: { color: "#6B7280" },
  reactionSeparator: { width: 8 },
  floatingHomeBtn: {
    position: "absolute",
    bottom: 82,
    right: 24,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderColor: "rgba(65,105,225,0.25)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    zIndex: 15,
  },
})

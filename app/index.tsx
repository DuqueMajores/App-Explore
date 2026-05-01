import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, StatusBar, Animated, TouchableWithoutFeedback, Dimensions } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from "./AuthContext";

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  
  const API_KEY = 'dde2b5709e25424c9d31a5ebd0c60287';

  useEffect(() => {
    // Se não está carregando e não há usuário, redirecionar para login
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      buscarNoticias();
    }
  }, [user]);

  async function buscarNoticias() {
    if (!search.trim() && articles.length > 0) {
      return; // Não buscar novamente se já tem artigos
    }

    setLoadingArticles(true);
    const query = search.trim() || "Brasil";
    const url = `https://newsapi.org/v2/everything?q=${query}&language=pt&sortBy=publishedAt&apiKey=${API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Erro ao buscar notícias:', error);
      // Mostrar mensagem de erro ao usuário
      alert('Erro ao buscar notícias. Verifique sua conexão.');
    } finally {
      setLoadingArticles(false);
    }
  }

  const toggleMenu = () => {
    const toValue = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnimation, { toValue, useNativeDriver: true, friction: 5, tension: 40 }).start();
  };

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Se não há usuário, não renderizar (será redirecionado pelo useEffect)
  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Olá, {user.name.split(' ')[0]}!</Text>
          <Text style={styles.headerTitle}>Explore</Text>
        </View>
        <TouchableOpacity onPress={toggleMenu}>
          <MaterialIcons name={menuOpen ? "close" : "menu"} size={30} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
      )}
      
      <Animated.View style={[styles.expandedMenu, { opacity: menuAnimation }]}>
        <TouchableOpacity 
          style={styles.menuOption} 
          onPress={() => { toggleMenu(); router.push("/perfil"); }}
        >
          <MaterialIcons name="account-circle" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Meu Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuOption} 
          onPress={() => { toggleMenu(); router.push("/"); }}
        >
          <MaterialIcons name="home" size={22} color="#4169E1" />
          <Text style={styles.menuOptionText}>Início</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput 
          value={search} 
          onChangeText={setSearch} 
          placeholder="Pesquisar notícias..." 
          style={styles.input}
          placeholderTextColor="#CCC"
          editable={!loadingArticles}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={buscarNoticias}
          disabled={loadingArticles}
        >
          {loadingArticles ? (
            <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
              <MaterialIcons name="refresh" size={20} color="#FFF" />
            </Animated.View>
          ) : (
            <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {articles.length === 0 && !loadingArticles && (
        <View style={styles.emptyState}>
          <MaterialIcons name="newspaper" size={60} color="#DDD" />
          <Text style={styles.emptyStateText}>Nenhuma notícia encontrada</Text>
          <Text style={styles.emptyStateSubtext}>Tente buscar por um termo diferente</Text>
        </View>
      )}

      <FlatList
        data={articles}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push({ 
              pathname: "/explore", 
              params: { 
                ...item, 
                source: item.source?.name, 
                desc: item.description, 
                image: item.urlToImage 
              } 
            })}
          >
            <Image 
              source={{ uri: item.urlToImage || "https://via.placeholder.com/400x200" }} 
              style={styles.cardImage} 
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardSource}>{item.source?.name || "Fonte"}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loadingArticles ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="newspaper" size={60} color="#DDD" />
              <Text style={styles.emptyStateText}>Nenhuma notícia encontrada</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA", 
    paddingHorizontal: 20 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 60, 
    marginBottom: 20 
  },
  headerGreeting: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: "800", 
    color: "#212529" 
  },
  menuOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 10 
  },
  expandedMenu: { 
    position: 'absolute', 
    top: 110, 
    right: 20, 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    padding: 10, 
    zIndex: 11, 
    width: 200, 
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  menuOptionText: { 
    marginLeft: 12, 
    fontSize: 16, 
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: { 
    flexDirection: "row", 
    marginBottom: 25, 
    gap: 10,
    alignItems: "center",
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  input: { 
    flex: 1, 
    backgroundColor: "#FFF", 
    borderRadius: 12, 
    paddingHorizontal: 40,
    paddingVertical: 12,
    elevation: 2,
    fontSize: 16,
    color: '#333',
  },
  searchButton: { 
    backgroundColor: "#4169E1", 
    padding: 12, 
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
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
  emptyStateSubtext: {
    fontSize: 14,
    color: "#CCC",
    marginTop: 5,
  },
  card: { 
    backgroundColor: "#FFF", 
    borderRadius: 20, 
    marginBottom: 20, 
    overflow: "hidden", 
    elevation: 3 
  },
  cardImage: { 
    width: "100%", 
    height: 200 
  },
  cardContent: { 
    padding: 16 
  },
  cardSource: {
    fontSize: 12,
    color: "#4169E1",
    fontWeight: "600",
    marginBottom: 4,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: "700",
    color: "#212529",
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: "#999",
  },
});

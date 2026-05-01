import { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  StyleSheet, 
  StatusBar, 
  Animated, 
  TouchableWithoutFeedback,
  Dimensions
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from "./AuthContext";

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  
  const API_KEY = 'dde2b5709e25424c9d31a5ebd0c60287';

  useEffect(() => {
    buscarNoticias();
  }, []);

  async function buscarNoticias() {
    const query = search.trim() || "Brasil";
    const url = `https://newsapi.org/v2/everything?q=${query}&language=pt&sortBy=publishedAt&apiKey=${API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error(error);
    }
  }

  const toggleMenu = () => {
    const toValue = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 40
    }).start();
  };

  const menuTranslateY = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 0]
  });

  const menuOpacity = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header com Menu */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity onPress={toggleMenu} style={styles.menuIconButton}>
          <MaterialIcons name={menuOpen ? "close" : "menu"} size={30} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Menu Expansível */}
      {menuOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
      )}
      
      <Animated.View style={[
        styles.expandedMenu, 
        { 
          transform: [{ translateY: menuTranslateY }],
          opacity: menuOpacity
        }
      ]}>
        {!user ? (
          <>
            <TouchableOpacity style={styles.menuOption} onPress={() => { toggleMenu(); router.push("/login"); }}>
              <MaterialIcons name="login" size={22} color="#4169E1" />
              <Text style={styles.menuOptionText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { toggleMenu(); router.push("/login"); }}>
              <MaterialIcons name="person-add" size={22} color="#4169E1" />
              <Text style={styles.menuOptionText}>Criar Conta</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.menuOption} onPress={() => { toggleMenu(); router.push("/perfil"); }}>
            <MaterialIcons name="account-circle" size={22} color="#4169E1" />
            <Text style={styles.menuOptionText}>Meu Perfil ({user.name.split(' ')[0]})</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar tendências..."
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity style={styles.searchButton} onPress={buscarNoticias}>
          <MaterialIcons name="search" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Lista de Notícias */}
      <FlatList
        data={articles}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.card}
            onPress={() => router.push({ pathname: "/explore", params: { ...item, source: item.source?.name, desc: item.description, image: item.urlToImage } })}
          >
            <Image
              source={{ uri: item.urlToImage || "https://via.placeholder.com/400x200" }}
              style={styles.cardImage}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardCategory}>{item.source?.name || "Notícia"}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32, 
    fontWeight: "800", 
    color: "#212529", 
    letterSpacing: 1
  },
  menuIconButton: {
    padding: 5,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    gap: 10
  },
  input: {
    flex: 1, 
    backgroundColor: "#FFF", 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    fontSize: 16, 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4
  },
  searchButton: {
    backgroundColor: "#4169E1", 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 12, 
    justifyContent: "center"
  },
  card: {
    backgroundColor: "#FFF", 
    borderRadius: 20, 
    marginBottom: 20, 
    overflow: "hidden", 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8
  },
  cardImage: {
    width: "100%", 
    height: 200
  },
  cardContent: { padding: 16 },
  cardCategory: { color: "#E63946", fontWeight: "bold", fontSize: 12, textTransform: "uppercase", marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 8, lineHeight: 24 },
  cardDesc: { fontSize: 14, color: "#666", lineHeight: 20 },
});

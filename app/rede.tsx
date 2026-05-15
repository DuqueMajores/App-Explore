import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FloatingMenu from "../components/Floatingmenu";

const PAGE_SIZE = 20;
const TOP_LIKED_COUNT = 10;
const TOP_DISLIKED_COUNT = 10;

interface StoredUser {
  name: string;
  email: string;
  photo?: string;
  likes: string[];
  dislikes: string[];
}

type ListItem =
  | { type: 'top-liked-label' }
  | { type: 'top-disliked-label' }
  | { type: 'all-label' }
  | { type: 'user'; user: StoredUser; badge: 'liked' | 'disliked' | 'none' }
  | { type: 'show-more' };

function UserAvatar({ user, size = 42 }: { user: StoredUser; size?: number }) {
  if (user.photo) {
    return (
      <Image
        source={{ uri: user.photo }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarFallbackText, { fontSize: size * 0.4 }]}>
        {user.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function UserCard({
  user,
  badge,
  rank,
}: {
  user: StoredUser;
  badge: 'liked' | 'disliked' | 'none';
  rank?: number;
}) {
  const isFeaturedLiked = badge === 'liked';
  const isFeaturedDisliked = badge === 'disliked';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isFeaturedLiked && styles.cardLiked,
        isFeaturedDisliked && styles.cardDisliked,
      ]}
      activeOpacity={0.8}
      onPress={() =>
        router.push({ pathname: '/perfil', params: { viewUserEmail: user.email } })
      }
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <View
          style={[
            styles.rankBadge,
            isFeaturedLiked ? styles.rankBadgeLiked : styles.rankBadgeDisliked,
          ]}
        >
          <Text style={styles.rankBadgeText}>#{rank}</Text>
        </View>
      )}

      {/* Avatar */}
      <View
        style={[
          styles.cardIcon,
          isFeaturedLiked && styles.cardIconLiked,
          isFeaturedDisliked && styles.cardIconDisliked,
        ]}
      >
        <UserAvatar user={user} size={42} />
      </View>

      {/* Nome + email */}
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.cardEmail} numberOfLines={1}>
          {user.email}
        </Text>
      </View>

      {/* Contadores — dislike primeiro, like depois, alinhados à direita */}
      <View style={styles.cardMeta}>
        <MaterialIcons name="thumb-down" size={13} color="#E63946" />
        <Text style={styles.cardMetaText}>{user.dislikes?.length ?? 0}</Text>
        <Text style={styles.cardMetaDot}>·</Text>
        <MaterialIcons name="thumb-up" size={13} color="#4169E1" />
        <Text style={styles.cardMetaText}>{user.likes?.length ?? 0}</Text>
      </View>

    </TouchableOpacity>
  );
}

export default function RedeScreen() {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('@App:users');
      const parsed: any[] = raw ? JSON.parse(raw) : [];
      const clean: StoredUser[] = parsed.map(({ passwordHash, ...u }) => ({
        ...u,
        likes: Array.isArray(u.likes) ? u.likes : [],
        dislikes: Array.isArray(u.dislikes) ? u.dislikes : [],
      }));
      setUsers(clean);
    })();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    setVisibleCount(PAGE_SIZE);
  };

  const { listData, hiddenCount } = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (q) {
      const filtered = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
      const visible = filtered.slice(0, visibleCount);
      const items: ListItem[] = visible.map((user) => ({
        type: 'user',
        user,
        badge: 'none',
      }));
      if (visibleCount < filtered.length) items.push({ type: 'show-more' });
      return { listData: items, hiddenCount: filtered.length - visibleCount };
    }

    const byLikes = [...users].sort(
      (a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0)
    );
    const topLiked = byLikes
      .filter((u) => (u.likes?.length ?? 0) > 0)
      .slice(0, TOP_LIKED_COUNT);
    const topLikedIds = new Set(topLiked.map((u) => u.email));

    const byDislikes = [...users]
      .filter((u) => !topLikedIds.has(u.email))
      .sort((a, b) => (b.dislikes?.length ?? 0) - (a.dislikes?.length ?? 0));
    const topDisliked = byDislikes
      .filter((u) => (u.dislikes?.length ?? 0) > 0)
      .slice(0, TOP_DISLIKED_COUNT);
    const topDislikedIds = new Set(topDisliked.map((u) => u.email));

    const remaining = users.filter(
      (u) => !topLikedIds.has(u.email) && !topDislikedIds.has(u.email)
    );
    const visibleRemaining = remaining.slice(0, visibleCount);

    const items: ListItem[] = [];

    if (topLiked.length > 0) {
      items.push({ type: 'top-liked-label' });
      topLiked.forEach((user) =>
        items.push({ type: 'user', user, badge: 'liked' })
      );
    }
    if (topDisliked.length > 0) {
      items.push({ type: 'top-disliked-label' });
      topDisliked.forEach((user) =>
        items.push({ type: 'user', user, badge: 'disliked' })
      );
    }
    if (remaining.length > 0) {
      items.push({ type: 'all-label' });
      visibleRemaining.forEach((user) =>
        items.push({ type: 'user', user, badge: 'none' })
      );
      if (visibleCount < remaining.length) {
        items.push({ type: 'show-more' });
      }
    }

    return {
      listData: items,
      hiddenCount: Math.max(0, remaining.length - visibleCount),
    };
  }, [users, search, visibleCount]);

  const isEmpty = users.length === 0;

  const getRank = (item: ListItem & { type: 'user' }): number | undefined => {
    if (item.badge === 'none') return undefined;
    let rank = 1;
    for (const d of listData) {
      if (d === item) break;
      if (d.type === 'user' && d.badge === item.badge) rank++;
    }
    return rank;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rede</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar usuários..."
          placeholderTextColor="#CCC"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
            <MaterialIcons name="close" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, idx) => {
          if (item.type === 'user') return `user-${item.user.email}`;
          return `${item.type}-${idx}`;
        }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.type === 'top-liked-label') {
            return (
              <View style={styles.sectionLabel}>
                <MaterialIcons name="thumb-up" size={15} color="#4169E1" />
                <Text style={styles.sectionLabelText}>Mais curtidos</Text>
              </View>
            );
          }
          if (item.type === 'top-disliked-label') {
            return (
              <View style={styles.sectionLabel}>
                <MaterialIcons name="thumb-down" size={15} color="#E63946" />
                <Text style={[styles.sectionLabelText, styles.sectionLabelDisliked]}>
                  Mais rejeitados
                </Text>
              </View>
            );
          }
          if (item.type === 'all-label') {
            return (
              <View style={styles.sectionLabel}>
                <MaterialIcons name="people" size={15} color="#999" />
                <Text style={[styles.sectionLabelText, styles.sectionLabelMuted]}>
                  Todos os usuários
                </Text>
              </View>
            );
          }
          if (item.type === 'user') {
            return <UserCard user={item.user} badge={item.badge} rank={getRank(item)} />;
          }
          if (item.type === 'show-more') {
            const next = Math.min(PAGE_SIZE, hiddenCount);
            return (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="expand-more" size={20} color="#4169E1" />
                <Text style={styles.showMoreText}>
                  Mostrar mais {next} usuário{next !== 1 ? 's' : ''}
                  {hiddenCount > PAGE_SIZE ? ` (${hiddenCount} restantes)` : ''}
                </Text>
              </TouchableOpacity>
            );
          }
          return null;
        }}
        ListEmptyComponent={
          isEmpty ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="people-outline" size={60} color="#DDD" />
              <Text style={styles.emptyStateText}>Nenhum usuário encontrado</Text>
              <Text style={styles.emptyStateSubtext}>
                {search.trim()
                  ? 'Tente buscar por outro nome ou e-mail'
                  : 'Nenhum usuário cadastrado ainda'}
              </Text>
            </View>
          ) : null
        }
      />
      <FloatingMenu currentRoute="rede" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#212529' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    elevation: 2,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 0 },
  clearButton: { padding: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4169E1',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionLabelDisliked: { color: '#E63946' },
  sectionLabelMuted: { color: '#999' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  cardLiked: {
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    elevation: 4,
  },
  cardDisliked: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    elevation: 4,
  },
  rankBadge: {
    position: 'absolute',
    top: 10,
    right: 20,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankBadgeLiked: { backgroundColor: '#C7D2FE' },
  rankBadgeDisliked: { backgroundColor: '#FECACA' },
  rankBadgeText: { fontSize: 11, fontWeight: '800', color: '#444' },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  cardIconLiked: { backgroundColor: '#C7D2FE' },
  cardIconDisliked: { backgroundColor: '#FECACA' },
  cardContent: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 2 },
  cardEmail: { fontSize: 13, color: '#999' },
  /* contadores à direita, antes do chevron */
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 6,
    marginTop: 30,
  },
  cardMetaText: { fontSize: 13, color: '#999' },
  cardMetaDot: { fontSize: 13, color: '#CCC', marginHorizontal: 2 },
  avatarFallback: {
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: { color: '#FFF', fontWeight: '700' },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  showMoreText: { fontSize: 14, color: '#4169E1', fontWeight: '700' },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 15 },
  emptyStateSubtext: { fontSize: 14, color: '#CCC', marginTop: 5, textAlign: 'center' },
});

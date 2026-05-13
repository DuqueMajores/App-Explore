/**
 * InfoDashboard.tsx
 * Dashboard de analytics exibido quando o usuário digita "#info" na busca.
 *
 * Mostra:
 *  - Total de likes e dislikes de todas as notícias
 *  - Gráfico de barras: likes vs dislikes por categoria
 *  - Top 5 notícias mais curtidas
 *  - Top 5 notícias mais acessadas ("Ler artigo completo")
 *  - Sugestões de métricas extras
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 40 - 32; // padding da tela + card padding

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface ArticleReactions {
  likes: string[];
  dislikes: string[];
  title?: string;
  category?: string;
  accessCount?: number;
}

interface InfoDashboardProps {
  reactions: Record<string, ArticleReactions>;
  onClose: () => void;
}

// Categorias conhecidas (mesmas do index.tsx)
const CATEGORIES = [
  "Brasil",
  "Tecnologia",
  "Economia",
  "Esportes",
  "Saúde",
  "Política",
  "Ciência",
  "Entretenimento",
  "Mundo",
];

const CAT_COLORS: Record<string, string> = {
  Brasil: "#009c3b",
  Tecnologia: "#4169E1",
  Economia: "#F59E0B",
  Esportes: "#E63946",
  Saúde: "#10B981",
  Política: "#8B5CF6",
  Ciência: "#06B6D4",
  Entretenimento: "#F97316",
  Mundo: "#6B7280",
  Geral: "#94A3B8",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function truncate(str: string, max = 45): string {
  if (!str) return "Sem título";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={[metricStyles.card, { borderTopColor: color }]}>
      <MaterialIcons name={icon} size={22} color={color} />
      <Text style={metricStyles.value}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderTopWidth: 3,
    elevation: 2,
  },
  value: { fontSize: 22, fontWeight: "800", color: "#212529" },
  label: { fontSize: 11, color: "#999", textAlign: "center", fontWeight: "600" },
});

// ── Mini Bar ──────────────────────────────────────────────────────────────────
function MiniBar({
  likeCount,
  dislikeCount,
  maxVal,
  color,
}: {
  likeCount: number;
  dislikeCount: number;
  maxVal: number;
  color: string;
}) {
  const likeW = maxVal > 0 ? (likeCount / maxVal) * 100 : 0;
  const dislikeW = maxVal > 0 ? (dislikeCount / maxVal) * 100 : 0;

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.row}>
        <View style={[barStyles.bar, { width: `${likeW}%`, backgroundColor: color }]} />
      </View>
      <View style={barStyles.row}>
        <View style={[barStyles.bar, { width: `${dislikeW}%`, backgroundColor: "#E63946", opacity: 0.7 }]} />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrapper: { flex: 1, gap: 3 },
  row: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 4 },
});

// ── Rank Item ─────────────────────────────────────────────────────────────────
function RankItem({
  rank,
  title,
  count,
  icon,
  color,
  suffix,
}: {
  rank: number;
  title: string;
  count: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  suffix: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <View style={rankStyles.row}>
      <Text style={rankStyles.medal}>{medals[rank - 1] ?? `${rank}.`}</Text>
      <View style={rankStyles.content}>
        <Text style={rankStyles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={rankStyles.metaRow}>
          <MaterialIcons name={icon} size={13} color={color} />
          <Text style={[rankStyles.count, { color }]}>
            {count} {suffix}
          </Text>
        </View>
      </View>
    </View>
  );
}

const rankStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  medal: { fontSize: 20, minWidth: 28, textAlign: "center" },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: "600", color: "#212529", lineHeight: 18, marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  count: { fontSize: 12, fontWeight: "700" },
});

// ── Suggestion Card ───────────────────────────────────────────────────────────
function SuggestionCard({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View style={suggStyles.card}>
      <View style={suggStyles.iconBox}>
        <MaterialIcons name={icon} size={20} color="#4169E1" />
      </View>
      <View style={suggStyles.text}>
        <Text style={suggStyles.title}>{title}</Text>
        <Text style={suggStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const suggStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#4169E1",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  text: { flex: 1 },
  title: { fontSize: 13, fontWeight: "700", color: "#212529", marginBottom: 3 },
  desc: { fontSize: 12, color: "#666", lineHeight: 17 },
});

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function InfoDashboard({ reactions, onClose }: InfoDashboardProps) {
  const stats = useMemo(() => {
    const allEntries = Object.entries(reactions);

    // Totais globais
    const totalLikes = allEntries.reduce((s, [, r]) => s + (r.likes?.length ?? 0), 0);
    const totalDislikes = allEntries.reduce((s, [, r]) => s + (r.dislikes?.length ?? 0), 0);
    const totalArticles = allEntries.length;
    const totalAccesses = allEntries.reduce((s, [, r]) => s + (r.accessCount ?? 0), 0);

    // Por categoria
    const catMap: Record<string, { likes: number; dislikes: number }> = {};
    for (const [, r] of allEntries) {
      const cat = r.category ?? "Geral";
      if (!catMap[cat]) catMap[cat] = { likes: 0, dislikes: 0 };
      catMap[cat].likes += r.likes?.length ?? 0;
      catMap[cat].dislikes += r.dislikes?.length ?? 0;
    }
    const catStats = Object.entries(catMap)
      .filter(([, v]) => v.likes + v.dislikes > 0)
      .sort((a, b) => b[1].likes + b[1].dislikes - (a[1].likes + a[1].dislikes));

    const maxCatVal = Math.max(...catStats.map(([, v]) => Math.max(v.likes, v.dislikes)), 1);

    // Top 5 mais curtidas
    const topLiked = allEntries
      .filter(([, r]) => (r.likes?.length ?? 0) > 0)
      .sort((a, b) => (b[1].likes?.length ?? 0) - (a[1].likes?.length ?? 0))
      .slice(0, 5)
      .map(([, r]) => ({ title: r.title ?? "Sem título", count: r.likes?.length ?? 0 }));

    // Top 5 mais acessadas
    const topAccessed = allEntries
      .filter(([, r]) => (r.accessCount ?? 0) > 0)
      .sort((a, b) => (b[1].accessCount ?? 0) - (a[1].accessCount ?? 0))
      .slice(0, 5)
      .map(([, r]) => ({ title: r.title ?? "Sem título", count: r.accessCount ?? 0 }));

    // Artigo mais polêmico (mais dislikes)
    const mostControversial = allEntries
      .filter(([, r]) => (r.dislikes?.length ?? 0) > 0)
      .sort((a, b) => (b[1].dislikes?.length ?? 0) - (a[1].dislikes?.length ?? 0))[0];

    return {
      totalLikes,
      totalDislikes,
      totalArticles,
      totalAccesses,
      catStats,
      maxCatVal,
      topLiked,
      topAccessed,
      mostControversial,
    };
  }, [reactions]);

  const engagementRate =
    stats.totalArticles > 0
      ? Math.round(((stats.totalLikes + stats.totalDislikes) / stats.totalArticles) * 10) / 10
      : 0;

  return (
    <View style={styles.overlay}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="insights" size={22} color="#4169E1" />
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Métricas globais ── */}
        <View style={styles.metricsRow}>
          <MetricCard icon="favorite" label="Total likes" value={stats.totalLikes} color="#E63946" />
          <MetricCard icon="heart-broken" label="Total dislikes" value={stats.totalDislikes} color="#6B7280" />
          <MetricCard icon="open-in-new" label="Acessos" value={stats.totalAccesses} color="#4169E1" />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard icon="newspaper" label="Notícias salvas" value={stats.totalArticles} color="#F59E0B" />
          <MetricCard
            icon="trending-up"
            label="Engaj./notícia"
            value={engagementRate}
            color="#10B981"
          />
          <MetricCard
            icon="percent"
            label="Taxa like"
            value={
              stats.totalLikes + stats.totalDislikes > 0
                ? `${Math.round((stats.totalLikes / (stats.totalLikes + stats.totalDislikes)) * 100)}%`
                : "–"
            }
            color="#8B5CF6"
          />
        </View>

        {/* ── Likes e dislikes por categoria ── */}
        {stats.catStats.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="bar-chart" size={18} color="#4169E1" />
              <Text style={styles.cardTitle}>Engajamento por categoria</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#4169E1" }]} />
                <Text style={styles.legendText}>Likes</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#E63946", opacity: 0.7 }]} />
                <Text style={styles.legendText}>Dislikes</Text>
              </View>
            </View>

            {stats.catStats.map(([cat, val]) => (
              <View key={cat} style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: CAT_COLORS[cat] ?? "#94A3B8" }]} />
                <Text style={styles.catLabel} numberOfLines={1}>
                  {cat}
                </Text>
                <MiniBar
                  likeCount={val.likes}
                  dislikeCount={val.dislikes}
                  maxVal={stats.maxCatVal}
                  color={CAT_COLORS[cat] ?? "#4169E1"}
                />
                <View style={styles.catCounts}>
                  <Text style={styles.catCountLike}>{val.likes}</Text>
                  <Text style={styles.catCountDislike}>{val.dislikes}</Text>
                </View>
              </View>
            ))}

            {stats.catStats.length === 0 && (
              <Text style={styles.emptyText}>Nenhum dado de categoria ainda.</Text>
            )}
          </View>
        )}

        {/* ── Top 5 curtidas ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="favorite" size={18} color="#E63946" />
            <Text style={styles.cardTitle}>Top 5 mais curtidas</Text>
          </View>
          {stats.topLiked.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma notícia curtida ainda.</Text>
          ) : (
            stats.topLiked.map((item, i) => (
              <RankItem
                key={i}
                rank={i + 1}
                title={truncate(item.title)}
                count={item.count}
                icon="favorite"
                color="#E63946"
                suffix={item.count === 1 ? "like" : "likes"}
              />
            ))
          )}
        </View>

        {/* ── Top 5 acessadas ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="open-in-new" size={18} color="#4169E1" />
            <Text style={styles.cardTitle}>Top 5 mais acessadas</Text>
          </View>
          {stats.topAccessed.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhuma notícia acessada via Ler artigo completo ainda.{"\n"}
              Acesse algumas notícias para ver o ranking!
            </Text>
          ) : (
            stats.topAccessed.map((item, i) => (
              <RankItem
                key={i}
                rank={i + 1}
                title={truncate(item.title)}
                count={item.count}
                icon="open-in-new"
                color="#4169E1"
                suffix={item.count === 1 ? "acesso" : "acessos"}
              />
            ))
          )}
        </View>

        {/* ── Artigo mais polêmico ── */}
        {stats.mostControversial && (
          <View style={[styles.card, styles.controversialCard]}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="local-fire-department" size={18} color="#F59E0B" />
              <Text style={[styles.cardTitle, { color: "#F59E0B" }]}>Mais polêmico</Text>
            </View>
            <Text style={styles.controversialTitle}>
              {truncate(stats.mostControversial[1].title ?? "Sem título", 80)}
            </Text>
            <View style={styles.controversialMeta}>
              <View style={styles.controversialBadge}>
                <MaterialIcons name="favorite" size={12} color="#E63946" />
                <Text style={styles.controversialBadgeText}>
                  {stats.mostControversial[1].likes?.length ?? 0} likes
                </Text>
              </View>
              <View style={[styles.controversialBadge, { backgroundColor: "#FEE2E2" }]}>
                <MaterialIcons name="heart-broken" size={12} color="#6B7280" />
                <Text style={[styles.controversialBadgeText, { color: "#6B7280" }]}>
                  {stats.mostControversial[1].dislikes?.length ?? 0} dislikes
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Sugestões de métricas ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="lightbulb-outline" size={18} color="#F59E0B" />
            <Text style={styles.cardTitle}>Sugestões de métricas</Text>
          </View>

          <SuggestionCard
            icon="schedule"
            title="Horário de pico de leitura"
            desc="Registrar a hora exata de cada acesso para identificar quando os usuários mais consomem notícias."
          />
          <SuggestionCard
            icon="share"
            title="Compartilhamentos"
            desc="Rastrear quantas vezes uma notícia foi compartilhada via botão nativo do app."
          />
          <SuggestionCard
            icon="timer"
            title="Tempo médio de leitura"
            desc="Medir quantos segundos o usuário permanece na tela de explore antes de sair."
          />
          <SuggestionCard
            icon="forum"
            title="Notícias que viraram fórum"
            desc="Mostrar quantas notícias geraram sala de fórum e o volume de comentários por artigo."
          />
          <SuggestionCard
            icon="search"
            title="Termos mais buscados"
            desc="Registrar as queries inseridas na busca para entender os interesses do usuário."
          />
          <SuggestionCard
            icon="people"
            title="Usuário mais ativo"
            desc="Identificar qual usuário mais curtiu, comentou e acessou notícias na plataforma."
          />
          <SuggestionCard
            icon="notifications"
            title="Notificações geradas"
            desc="Contar likes em comentários e respostas de fórum para medir engajamento social."
          />
        </View>

        <Text style={styles.footer}>
          Dados baseados na sessão local • Atualizado em tempo real
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    elevation: 2,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#212529" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },
  metricsRow: { flexDirection: "row", gap: 10 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#212529" },
  // Legend
  legendRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12, color: "#666" },
  // Category chart
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  catDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  catLabel: { fontSize: 12, fontWeight: "600", color: "#555", width: 90 },
  catCounts: { width: 50, alignItems: "flex-end", gap: 3 },
  catCountLike: { fontSize: 10, fontWeight: "700", color: "#4169E1" },
  catCountDislike: { fontSize: 10, fontWeight: "700", color: "#E63946" },
  // Controversial
  controversialCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  controversialTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212529",
    lineHeight: 20,
    marginBottom: 10,
  },
  controversialMeta: { flexDirection: "row", gap: 10 },
  controversialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  controversialBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E63946",
  },
  // Empty / Footer
  emptyText: {
    fontSize: 13,
    color: "#BBB",
    textAlign: "center",
    paddingVertical: 16,
    lineHeight: 20,
  },
  footer: {
    fontSize: 11,
    color: "#BBB",
    textAlign: "center",
    marginTop: 4,
  },
});

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router, useRouter } from "expo-router";
import { useForum, ForumComment } from "../src/context/ForumContext";
import { useAuth } from "../src/context/AuthContext";
import { useNotification } from "../src/context/NotificationContext";

const PAGE_SIZE = 10;
const TOP_COUNT = 3;

// ── Article Header ─────────────────────────────────────────────────────────────
function ArticleHeader({
  title,
  image,
  desc,
  url,
}: {
  title: string;
  image?: string;
  desc?: string;
  url?: string;
}) {
  return (
    <View style={articleStyles.container}>
      {!!image && (
        <Image
          source={{ uri: image }}
          style={articleStyles.image}
          resizeMode="cover"
        />
      )}
      <View style={articleStyles.body}>
        <Text style={articleStyles.title} numberOfLines={3}>
          {title}
        </Text>
        {!!desc && (
          <Text style={articleStyles.desc} numberOfLines={3}>
            {desc}
          </Text>
        )}
        {!!url && (
          <TouchableOpacity
            style={articleStyles.linkRow}
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="open-in-new" size={14} color="#4169E1" />
            <Text style={articleStyles.linkText}>Ler artigo completo</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={articleStyles.divider} />
    </View>
  );
}

// ── Comment Card ───────────────────────────────────────────────────────────────
interface CommentCardProps {
  comment: ForumComment;
  depth: number;
  isRoot: boolean;
  isTop?: boolean;
  onReply: (c: ForumComment) => void;
  onLike: (commentId: string) => void;
  currentUserEmail?: string;
}

function CommentCard({
  comment,
  depth,
  isRoot,
  isTop,
  onReply,
  onLike,
  currentUserEmail,
}: CommentCardProps) {
  return (
    <View
      style={[
        styles.commentCard,
        depth > 0 && styles.commentCardReply,
        isRoot && styles.commentCardRoot,
        isTop && styles.commentCardTop,
      ]}
    >
      {isTop && (
        <View style={styles.topBadgeRow}>
          <MaterialIcons name="star" size={12} color="#F59E0B" />
          <Text style={styles.topBadgeText}>Mais curtido</Text>
        </View>
      )}
      <View style={styles.commentHeader}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/perfil",
              params: { viewUserEmail: comment.userEmail },
            })
          }
        >
          {comment.userPhoto ? (
            <Image
              source={{ uri: comment.userPhoto }}
              style={[styles.commentAvatar, isRoot && styles.commentAvatarRoot, styles.commentAvatarImg]}
            />
          ) : (
            <View style={[styles.commentAvatar, isRoot && styles.commentAvatarRoot]}>
              <Text style={styles.commentAvatarText}>
                {comment.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.commentHeaderInfo}>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/perfil",
                params: { viewUserEmail: comment.userEmail },
              })
            }
          >
            <Text style={[styles.commentUserName, isRoot && styles.commentUserNameRoot]}>
              {comment.userName}
              {isRoot && <Text style={styles.opBadge}> · OP</Text>}
            </Text>
          </TouchableOpacity>
          <Text style={styles.commentDate}>
            {new Date(comment.createdAt).toLocaleDateString("pt-BR")}{" "}
            {new Date(comment.createdAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>

      <Text style={[styles.commentText, isRoot && styles.commentTextRoot]}>
        {comment.text}
      </Text>

      {/* Actions — responder + coração juntos, alinhados à direita */}
      <View style={styles.commentActions}>
        {!isRoot && (
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => onReply(comment)}
          >
            <MaterialIcons name="reply" size={16} color="#4169E1" />
            <Text style={styles.replyButtonText}>Responder</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => onLike(comment.id)}
          disabled={comment.userEmail === currentUserEmail}
        >
          <MaterialIcons
            name={
              comment.likes?.includes(currentUserEmail ?? "")
                ? "favorite"
                : "favorite-border"
            }
            size={16}
            color={
              comment.likes?.includes(currentUserEmail ?? "") ? "#E63946" : "#999"
            }
          />
          {comment.likes?.length > 0 && (
            <Text style={styles.likeCount}>{comment.likes.length}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Comment With Replies ───────────────────────────────────────────────────────
function CommentWithReplies({
  comment,
  allComments,
  depth,
  isRoot,
  isTop,
  onReply,
  onLike,
  currentUserEmail,
}: {
  comment: ForumComment;
  allComments: ForumComment[];
  depth: number;
  isRoot: boolean;
  isTop?: boolean;
  onReply: (c: ForumComment) => void;
  onLike: (commentId: string) => void;
  currentUserEmail?: string;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const directReplies = allComments.filter((c) => c.parentId === comment.id);

  return (
    <View style={{ marginLeft: isRoot ? 0 : Math.min(depth, 3) * 16 }}>
      <CommentCard
        comment={comment}
        depth={depth}
        isRoot={isRoot}
        isTop={isTop}
        onReply={onReply}
        onLike={onLike}
        currentUserEmail={currentUserEmail}
      />

      {directReplies.length > 0 && (
        <TouchableOpacity
          style={styles.showRepliesButton}
          onPress={() => setShowReplies((v) => !v)}
        >
          <MaterialIcons
            name={showReplies ? "expand-less" : "expand-more"}
            size={18}
            color="#4169E1"
          />
          <Text style={styles.showRepliesText}>
            {showReplies
              ? "Ocultar respostas"
              : `${directReplies.length} ${
                  directReplies.length === 1 ? "resposta" : "respostas"
                }`}
          </Text>
        </TouchableOpacity>
      )}

      {showReplies &&
        directReplies.map((reply) => (
          <CommentWithReplies
            key={reply.id}
            comment={reply}
            allComments={allComments}
            depth={depth + 1}
            isRoot={false}
            onReply={onReply}
            onLike={onLike}
            currentUserEmail={currentUserEmail}
          />
        ))}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ForumRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { rooms, addComment, deleteRoom, toggleLike } = useForum();
  const { user, addReputation } = useAuth() as any;
  const { sendNotification } = useNotification();
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ForumComment | null>(null);
  const [sending, setSending] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const flatListRef = useRef<FlatList>(null);
  const localRouter = useRouter();

  const room = rooms.find((r) => r.id === roomId);

  const handleLike = useCallback(
    async (commentId: string) => {
      if (!user || !room) return;
      const { wasLiked, commentOwnerEmail } = await toggleLike(
        room.id,
        commentId,
        user.email
      );
      if (addReputation && commentOwnerEmail && commentOwnerEmail !== user.email) {
        await addReputation(
          commentOwnerEmail,
          wasLiked ? -5 : 5,
          wasLiked ? "Curtida removida" : "Comentário curtido"
        );
      }
      if (!wasLiked && commentOwnerEmail && commentOwnerEmail !== user.email) {
        await sendNotification({
          type: "comment_like",
          fromName: user.name,
          roomId: room.id,
        });
      }
    },
    [user, room, toggleLike, addReputation, sendNotification]
  );

  const handleDeleteRoom = useCallback(() => {
    Alert.alert(
      "Excluir Sala",
      "Tem certeza que deseja excluir esta sala? Todos os comentários serão perdidos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteRoom(room!.id);
            localRouter.replace("/forum");
          },
        },
      ]
    );
  }, [deleteRoom, room, localRouter]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user || !room || sending) return;

    setSending(true);
    try {
      await addComment(
        room.id,
        text.trim(),
        user.name,
        user.email,
        user.photo ?? undefined,
        replyingTo?.id ?? null
      );

      if (replyingTo && replyingTo.userEmail !== user.email) {
        await sendNotification({
          type: "comment_reply",
          fromName: user.name,
          roomId: room.id,
        });
      }

      setText("");
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } finally {
      setSending(false);
    }
  }, [text, user, room, sending, addComment, replyingTo, sendNotification]);

  const { rootComment, topComments, remainingComments, allSorted } = useMemo(() => {
    if (!room) return { rootComment: null, topComments: [], remainingComments: [], allSorted: [] };

    const sorted = [...room.comments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const root = sorted.find((c) => c.parentId === null) ?? null;

    const topLevel = sorted.filter(
      (c) => c.parentId === null && c.id !== root?.id
    );

    const byLikes = [...topLevel].sort(
      (a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0)
    );

    const topIds = new Set(
      byLikes
        .filter((c) => (c.likes?.length ?? 0) > 0)
        .slice(0, TOP_COUNT)
        .map((c) => c.id)
    );

    const top = byLikes.filter((c) => topIds.has(c.id));
    const remaining = topLevel.filter((c) => !topIds.has(c.id));

    return { rootComment: root, topComments: top, remainingComments: remaining, allSorted: sorted };
  }, [room]);

  if (!room) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={60} color="#DDD" />
        <Text style={styles.errorText}>Sala não encontrada</Text>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => localRouter.back()}
        >
          <Text style={styles.backLinkText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const visibleRemaining = remainingComments.slice(0, visibleCount);
  const hasMore = visibleCount < remainingComments.length;
  const hiddenCount = remainingComments.length - visibleCount;

  type ListItem =
    | { type: "header" }
    | { type: "root" }
    | { type: "top-section-label" }
    | { type: "top"; comment: ForumComment }
    | { type: "remaining-section-label" }
    | { type: "comment"; comment: ForumComment }
    | { type: "show-more" };

  const listData: ListItem[] = [
    { type: "header" },
    ...(rootComment ? [{ type: "root" as const }] : []),
    ...(topComments.length > 0
      ? [
          { type: "top-section-label" as const },
          ...topComments.map((c) => ({ type: "top" as const, comment: c })),
        ]
      : []),
    ...(remainingComments.length > 0
      ? [{ type: "remaining-section-label" as const }]
      : []),
    ...visibleRemaining.map((c) => ({ type: "comment" as const, comment: c })),
    ...(hasMore ? [{ type: "show-more" as const }] : []),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* ── Fixed Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => localRouter.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Fórum
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {room.articleTitle}
          </Text>
        </View>
        {user?.email === room?.createdBy ? (
          <TouchableOpacity
            onPress={handleDeleteRoom}
            style={styles.deleteButton}
          >
            <MaterialIcons name="delete-outline" size={24} color="#E63946" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── Scrollable Content ── */}
      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={(item, idx) => {
          if (item.type === "top" || item.type === "comment") return item.comment.id;
          return `${item.type}-${idx}`;
        }}
        contentContainerStyle={styles.commentsList}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <ArticleHeader
                title={room.articleTitle}
                image={room.articleImage}
                desc={room.articleDesc}
                url={room.articleUrl}
              />
            );
          }

          if (item.type === "root" && rootComment) {
            return (
              <CommentWithReplies
                comment={rootComment}
                allComments={allSorted}
                depth={0}
                isRoot={true}
                onReply={setReplyingTo}
                onLike={handleLike}
                currentUserEmail={user?.email}
              />
            );
          }

          if (item.type === "top-section-label") {
            return (
              <View style={styles.sectionLabel}>
                <MaterialIcons name="star" size={14} color="#F59E0B" />
                <Text style={styles.sectionLabelText}>
                  Comentários em destaque
                </Text>
              </View>
            );
          }

          if (item.type === "top") {
            return (
              <View style={styles.commentWrapper}>
                <CommentWithReplies
                  comment={item.comment}
                  allComments={allSorted}
                  depth={0}
                  isRoot={false}
                  isTop={true}
                  onReply={setReplyingTo}
                  onLike={handleLike}
                  currentUserEmail={user?.email}
                />
              </View>
            );
          }

          if (item.type === "remaining-section-label") {
            return (
              <View style={styles.sectionLabel}>
                <MaterialIcons name="chat-bubble-outline" size={14} color="#999" />
                <Text style={[styles.sectionLabelText, { color: "#999" }]}>
                  Todos os comentários
                </Text>
              </View>
            );
          }

          if (item.type === "comment") {
            return (
              <View style={styles.commentWrapper}>
                <CommentWithReplies
                  comment={item.comment}
                  allComments={allSorted}
                  depth={0}
                  isRoot={false}
                  onReply={setReplyingTo}
                  onLike={handleLike}
                  currentUserEmail={user?.email}
                />
              </View>
            );
          }

          if (item.type === "show-more") {
            return (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="expand-more" size={20} color="#4169E1" />
                <Text style={styles.showMoreText}>
                  Mostrar mais {Math.min(PAGE_SIZE, hiddenCount)} comentário
                  {Math.min(PAGE_SIZE, hiddenCount) !== 1 ? "s" : ""}
                  {hiddenCount > PAGE_SIZE ? ` (${hiddenCount} restantes)` : ""}
                </Text>
              </TouchableOpacity>
            );
          }

          return null;
        }}
        ListFooterComponent={
          room.comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <MaterialIcons name="chat-bubble-outline" size={50} color="#DDD" />
              <Text style={styles.emptyCommentsText}>Nenhum comentário ainda</Text>
              <Text style={styles.emptyCommentsSubtext}>
                Seja o primeiro a comentar!
              </Text>
            </View>
          ) : null
        }
      />

      {/* ── Input Area ── */}
      {user && (
        <View style={styles.inputContainer}>
          {replyingTo && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText} numberOfLines={1}>
                Respondendo a {replyingTo.userName}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <MaterialIcons name="close" size={18} color="#999" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder={
                replyingTo
                  ? "Escreva sua resposta..."
                  : "Escreva um comentário..."
              }
              placeholderTextColor="#CCC"
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!text.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              <MaterialIcons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const articleStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: "#EEE",
  },
  body: { paddingHorizontal: 2 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#212529",
    lineHeight: 26,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    lineHeight: 21,
    color: "#666",
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  linkText: {
    fontSize: 13,
    color: "#4169E1",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginTop: 16,
    marginBottom: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  errorText: { fontSize: 16, color: "#999", marginTop: 12 },
  backLink: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#4169E1",
    borderRadius: 12,
  },
  backLinkText: { color: "#FFF", fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#212529" },
  headerSubtitle: { fontSize: 13, color: "#999", marginTop: 2 },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  commentWrapper: { marginBottom: 10 },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commentCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#4169E1",
    marginBottom: 4,
  },
  commentCardRoot: {
    borderLeftColor: "#4169E1",
    backgroundColor: "#F5F8FF",
    marginBottom: 4,
  },
  commentCardReply: { borderLeftColor: "#A0B4F0" },
  commentCardTop: {
    borderLeftColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
    elevation: 2,
  },
  topBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4169E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  commentAvatarRoot: { width: 38, height: 38, borderRadius: 19 },
  commentAvatarText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  commentAvatarImg: { borderRadius: 999 },
  commentHeaderInfo: { flex: 1 },
  commentUserName: { fontSize: 14, fontWeight: "700", color: "#212529" },
  commentUserNameRoot: { fontSize: 15 },
  opBadge: { fontSize: 12, fontWeight: "600", color: "#4169E1" },
  commentDate: { fontSize: 12, color: "#999", marginTop: 1 },
  commentText: { fontSize: 15, lineHeight: 22, color: "#444" },
  commentTextRoot: { fontSize: 16, lineHeight: 24, color: "#212529" },
  /* actions: responder + coração juntos, empurrados para a direita */
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  replyButton: { flexDirection: "row", alignItems: "center" },
  replyButtonText: {
    fontSize: 13,
    color: "#4169E1",
    fontWeight: "600",
    marginLeft: 4,
  },
  likeButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeCount: { fontSize: 13, color: "#999", fontWeight: "600" },
  showRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 6,
    marginLeft: 210,
    gap: 4,
  },
  showRepliesText: { fontSize: 13, color: "#4169E1", fontWeight: "600" },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  showMoreText: {
    fontSize: 14,
    color: "#4169E1",
    fontWeight: "700",
  },
  emptyComments: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptyCommentsSubtext: { fontSize: 14, color: "#CCC", marginTop: 4 },
  inputContainer: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 10 : 16,
  },
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  replyIndicatorText: {
    fontSize: 13,
    color: "#4169E1",
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  textInput: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#4169E1",
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
  },
});

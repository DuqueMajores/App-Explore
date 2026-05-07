import React, { useState, useRef, useCallback } from "react";
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
  onReply: (c: ForumComment) => void;
  onLike: (commentId: string) => void;
  currentUserEmail?: string;
}

function CommentCard({
  comment,
  depth,
  isRoot,
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
      ]}
    >
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
  onReply,
  onLike,
  currentUserEmail,
}: {
  comment: ForumComment;
  allComments: ForumComment[];
  depth: number;
  isRoot: boolean;
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
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ForumComment | null>(null);
  const [sending, setSending] = useState(false);
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
    },
    [user, room, toggleLike, addReputation]
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
      setText("");
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } finally {
      setSending(false);
    }
  }, [text, user, room, sending, addComment, replyingTo]);

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

  const sortedComments = [...room.comments].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const rootComment = sortedComments.find((c) => c.parentId === null) ?? null;
  const topLevelComments = sortedComments.filter(
    (c) => c.parentId === null && c.id !== rootComment?.id
  );

  const listData: Array<
    | { type: "header" }
    | { type: "root" }
    | { type: "comment"; comment: ForumComment }
  > = [
    { type: "header" },
    ...(rootComment ? [{ type: "root" as const }] : []),
    ...topLevelComments.map((c) => ({ type: "comment" as const, comment: c })),
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
        keyExtractor={(item, idx) =>
          item.type === "comment"
            ? item.comment.id
            : `${item.type}-${idx}`
        }
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
                allComments={sortedComments}
                depth={0}
                isRoot={true}
                onReply={setReplyingTo}
                onLike={handleLike}
                currentUserEmail={user?.email}
              />
            );
          }

          if (item.type === "comment") {
            return (
              <View style={styles.commentWrapper}>
                <CommentWithReplies
                  comment={item.comment}
                  allComments={sortedComments}
                  depth={0}
                  isRoot={false}
                  onReply={setReplyingTo}
                  onLike={handleLike}
                  currentUserEmail={user?.email}
                />
              </View>
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
  commentAvatarImg: { borderRadius: 999 },  // faz a Image ficar redonda
  commentHeaderInfo: { flex: 1 },
  commentUserName: { fontSize: 14, fontWeight: "700", color: "#212529" },
  commentUserNameRoot: { fontSize: 15 },
  opBadge: { fontSize: 12, fontWeight: "600", color: "#4169E1" },
  commentDate: { fontSize: 12, color: "#999", marginTop: 1 },
  commentText: { fontSize: 15, lineHeight: 22, color: "#444" },
  commentTextRoot: { fontSize: 16, lineHeight: 24, color: "#212529" },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
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
    gap: 4,
  },
  showRepliesText: { fontSize: 13, color: "#4169E1", fontWeight: "600" },
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

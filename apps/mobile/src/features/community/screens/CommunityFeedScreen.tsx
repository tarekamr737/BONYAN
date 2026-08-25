import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { PostCard } from "../components/PostCard";
import { useCommunityFeed, useCommunityMutations } from "../hooks";

type CommunityFeedScreenProps = {
  onBack: () => void;
  onCreatePost: () => void;
};

export function CommunityFeedScreen({ onBack, onCreatePost }: CommunityFeedScreenProps) {
  const feedQuery = useCommunityFeed();
  const mutations = useCommunityMutations();
  const [pendingReactionPostIds, setPendingReactionPostIds] = useState<Set<string>>(
    () => new Set(),
  );
  const posts = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );

  if (feedQuery.isPending) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Loading community posts" style={styles.centerState}>
          <ActivityIndicator color={colors.bronze} size="large" />
          <Text style={styles.stateTitle}>Loading recent progress</Text>
          <Text style={styles.stateCopy}>The feed stays chronological and calm.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (feedQuery.isError && !feedQuery.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityRole="alert" style={styles.centerState}>
          <Text style={styles.stateTitle}>Community could not load</Text>
          <Text style={styles.stateCopy}>Check your connection, then try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => feedQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={posts}
        keyExtractor={(post) => post.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.stateTitle}>Progress starts quietly</Text>
            <Text style={styles.stateCopy}>
              Share a milestone when it feels useful. Measurements are never added automatically.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onCreatePost}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryLabel}>Create the first post</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          feedQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.bronze} style={styles.footerLoader} />
          ) : feedQuery.isFetchNextPageError ? (
            <View accessibilityRole="alert" style={styles.pageError}>
              <Text style={styles.pageErrorCopy}>More posts could not load.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void feedQuery.fetchNextPage()}
                style={styles.pageRetry}
              >
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                onPress={onBack}
                style={styles.backButton}
              >
                <Text style={styles.backLabel}>Back</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onCreatePost}
                style={styles.createButton}
              >
                <Text style={styles.createLabel}>Create post</Text>
              </Pressable>
            </View>
            <Text accessibilityRole="header" style={styles.heading}>
              Community
            </Text>
            <Text style={styles.intro}>
              Recent milestones from people building steadily. No rankings, recommendations, or
              automatic body data.
            </Text>
            <View style={styles.feedRule}>
              <Text style={styles.feedRuleTitle}>RECENT FIRST</Text>
              <Text style={styles.feedRuleCopy}>A simple chronological feed</Text>
            </View>
            {feedQuery.isRefetchError && !feedQuery.isFetchNextPageError ? (
              <View accessibilityRole="alert" style={styles.refreshError}>
                <Text style={styles.pageErrorCopy}>The latest refresh did not finish.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void feedQuery.refetch()}
                  style={styles.pageRetry}
                >
                  <Text style={styles.retryLabel}>Retry refresh</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        onEndReached={() => {
          if (
            feedQuery.hasNextPage &&
            !feedQuery.isFetchingNextPage &&
            !feedQuery.isFetchNextPageError
          ) {
            void feedQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            onRefresh={() => feedQuery.refetch()}
            refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
            tintColor={colors.bronze}
          />
        }
        renderItem={({ item }) => (
          <PostCard
            onDelete={(postId) =>
              mutations.deleteMutation.mutate(postId, {
                onError: () =>
                  Alert.alert("Post was not deleted", "Try again when your connection is stable."),
              })
            }
            onReact={(postId, reaction, remove) => {
              if (pendingReactionPostIds.has(postId)) return;
              setPendingReactionPostIds((current) => new Set(current).add(postId));
              mutations.reactionMutation.mutate(
                { postId, reaction, remove },
                {
                  onError: () =>
                    Alert.alert(
                      "Reaction was not saved",
                      "Your feed has been restored. Try again when you are ready.",
                    ),
                  onSettled: () =>
                    setPendingReactionPostIds((current) => {
                      const next = new Set(current);
                      next.delete(postId);
                      return next;
                    }),
                },
              );
            }}
            onReport={(postId, reason) =>
              mutations.reportMutation.mutate(
                { postId, reason },
                {
                  onError: () =>
                    Alert.alert(
                      "Report was not sent",
                      "Nothing was submitted. Check your connection and try again.",
                    ),
                  onSuccess: () =>
                    Alert.alert(
                      "Report received",
                      "Thank you. The report is queued for review.",
                    ),
                },
              )
            }
            post={item}
            reactionBusy={pendingReactionPostIds.has(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  listContent: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: 720,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  headerBlock: { marginBottom: spacing.xs },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    minHeight: 48,
  },
  backButton: { justifyContent: "center", minHeight: 48, minWidth: 64 },
  backLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  createButton: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  createLabel: { color: colors.canvas, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  heading: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -1.1,
    lineHeight: 40,
    marginTop: spacing.xs,
  },
  intro: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  feedRule: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  feedRuleTitle: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  feedRuleCopy: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyState: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 21,
    textAlign: "center",
  },
  stateCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: { color: colors.canvas, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  retryButton: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  retryLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  footerLoader: { marginVertical: spacing.lg },
  pageError: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.xs,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  refreshError: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  pageErrorCopy: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 12 },
  pageRetry: { justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.sm },
});

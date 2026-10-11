import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { useContext, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CinematicHero } from "../../../core/components/CinematicHero";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { router } from "expo-router";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import { Action } from "../../game/GamePage";
import { PostCard } from "../components/PostCard";
import { useCommunityFeed, useCommunityMutations } from "../hooks";
import type { ReactionKind } from "../types";

type CommunityFeedScreenProps = {
  onBack: () => void;
  onCreatePost: () => void;
};

export function CommunityFeedScreen({ onBack, onCreatePost }: CommunityFeedScreenProps) {
  const {t} = useLocale();
  const arabic = useContext(LanguageDirection);
  const feedQuery = useCommunityFeed();
  const mutations = useCommunityMutations();
  const pendingReactionPostIdsRef = useRef(new Set<string>());
  const [pendingReactionPostIds, setPendingReactionPostIds] = useState<Set<string>>(
    () => new Set(),
  );
  const posts = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );

  async function reactToPost(postId: string, reaction: ReactionKind, remove: boolean) {
    if (pendingReactionPostIdsRef.current.has(postId)) return;
    pendingReactionPostIdsRef.current.add(postId);
    setPendingReactionPostIds(new Set(pendingReactionPostIdsRef.current));
    try {
      await mutations.reactionMutation.mutateAsync({ postId, reaction, remove });
    } catch {
      Alert.alert(
        phrase("copy_338e55ec3628", arabic),
        phrase("copy_e05af701eff1", arabic),
      );
    } finally {
      pendingReactionPostIdsRef.current.delete(postId);
      setPendingReactionPostIds(new Set(pendingReactionPostIdsRef.current));
    }
  }

  if (feedQuery.isPending) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel={phrase("copy_893a208d78bf", arabic)} style={styles.centerState}>
          <ActivityIndicator color={colors.bronze} size="large" />
          <Text style={styles.stateTitle}>{phrase("copy_4360c6513981", arabic)}</Text>
          <Text style={styles.stateCopy}>{phrase("copy_b0745e4a4d51", arabic)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (feedQuery.isError && !feedQuery.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityRole="alert" style={styles.centerState}>
          <Text style={styles.stateTitle}>{phrase("copy_e9b00e4ea9d3", arabic)}</Text>
          <Text style={styles.stateCopy}>{phrase("copy_8db1dda12e85", arabic)}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => feedQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{phrase("copy_0d7b38c28dab", arabic)}</Text>
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
            <Text style={styles.stateTitle}>{phrase("copy_a0561d186b77", arabic)}</Text>
            <Text style={styles.stateCopy}>
              {phrase("copy_5f89645f8682", arabic)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onCreatePost}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryLabel}>{phrase("copy_4c4bb0fca1d6", arabic)}</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          feedQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.bronze} style={styles.footerLoader} />
          ) : feedQuery.isFetchNextPageError ? (
            <View accessibilityRole="alert" style={styles.pageError}>
              <Text style={styles.pageErrorCopy}>{phrase("copy_ebe47885b46b", arabic)}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void feedQuery.fetchNextPage()}
                style={styles.pageRetry}
              >
                <Text style={styles.retryLabel}>{phrase("copy_0d7b38c28dab", arabic)}</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={{gap: spacing.sm}}><Action label={t("league")} onPress={() => router.push("/league")}/><Action label={t("inviteFriends")} onPress={() => router.push("/challenges")}/><Action label={t("rewards")} onPress={() => router.push("/rewards")}/></View>
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel={phrase("copy_2a52671ad634", arabic)}
                accessibilityRole="button"
                onPress={onBack}
                style={styles.backButton}
              >
                <Text style={styles.backLabel}>{phrase("copy_436170a81a03", arabic)}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onCreatePost}
                style={styles.createButton}
              >
                <Text style={styles.createLabel}>{phrase("copy_273e439f5c3e", arabic)}</Text>
              </Pressable>
            </View>
            <CinematicHero arabic={arabic} source={require("../../../../assets/heroes/community.jpg")} title={phrase("copy_f57afcb1332b", arabic)} subtitle={phrase("copy_0b062afc5330", arabic)} />
            <View style={styles.feedRule}>
              <Text style={styles.feedRuleTitle}>{phrase("copy_c7e119ccfb11", arabic)}</Text>
              <Text style={styles.feedRuleCopy}>{phrase("copy_9270019c83af", arabic)}</Text>
            </View>
            {feedQuery.isRefetchError && !feedQuery.isFetchNextPageError ? (
              <View accessibilityRole="alert" style={styles.refreshError}>
                <Text style={styles.pageErrorCopy}>{phrase("copy_5dd2d4604a4b", arabic)}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void feedQuery.refetch()}
                  style={styles.pageRetry}
                >
                  <Text style={styles.retryLabel}>{phrase("copy_8d8393f1b0bb", arabic)}</Text>
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
                  Alert.alert(phrase("copy_3ac0a80aa6bb", arabic), phrase("copy_1a646985afd7", arabic)),
              })
            }
            onReact={(postId, reaction, remove) =>
              void reactToPost(postId, reaction, remove)
            }
            onReport={(postId, reason) =>
              mutations.reportMutation.mutate(
                { postId, reason },
                {
                  onError: () =>
                    Alert.alert(
                      phrase("copy_d91b9d5a8d58", arabic),
                      phrase("copy_58edf4880a6c", arabic),
                    ),
                  onSuccess: () =>
                    Alert.alert(
                      phrase("copy_c47f233c046b", arabic),
                      phrase("copy_4e6af40a7720", arabic),
                    ),
                },
              )
            }
            post={item}
            arabic={arabic}
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

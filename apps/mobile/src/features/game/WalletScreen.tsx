import { useQuery } from "@tanstack/react-query";
import { DirectionalText as Text } from "../../core/components/DirectionalText";
import { SurfaceCard } from "../../core/components/SurfaceCard";
import { useLocale } from "../../core/i18n/LocaleProvider";
import type { MessageKey } from "../../core/i18n/messages";
import { formatNumber } from "../../core/i18n/messages";
import { getWallet } from "./api";
import { GamePage, gameStyles as styles, QueryNotice } from "./GamePage";

export function WalletScreen() {
  const {t, locale} = useLocale(); const wallet = useQuery({queryKey: ["game", "wallet"], queryFn: getWallet});
  return <GamePage title={t("rewards")}><QueryNotice pending={wallet.isPending} error={wallet.error} retry={() => void wallet.refetch()}/>{wallet.data ? <><Text style={styles.title}>{formatNumber(wallet.data.xp, locale)} {t("xp")}</Text><Text style={styles.title}>{t("badges")}</Text>{wallet.data.badges.length ? wallet.data.badges.map(badge => <SurfaceCard key={badge}><Text style={styles.label}>{t(badge as MessageKey)}</Text></SurfaceCard>) : <Text style={styles.copy}>{t("noBadges")}</Text>}</> : null}<SurfaceCard><Text style={styles.copy}>{t("partnerDisabled")}</Text></SurfaceCard></GamePage>;
}

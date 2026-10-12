import Feather from "@expo/vector-icons/Feather";
import {View} from "react-native";
import {DirectionalText as Text} from "../../core/components/DirectionalText";
import {useLocale} from "../../core/i18n/LocaleProvider";
import {formatNumber, type MessageKey} from "../../core/i18n/messages";
import {colors, fonts} from "../../core/theme/tokens";
import type {Mission} from "./api";

const labels: Record<Mission["category"], MessageKey> = {workout: "plannedWorkouts", nutrition: "nutritionHabits", recovery: "activeRecovery", checkin: "progressCheckin"};
export function MissionRows({missions}: {missions: Mission[]}) {
  const {t, locale, rtl} = useLocale();
  return <View>{missions.map(mission => <View key={mission.category} style={{flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomColor: colors.line, borderBottomWidth: 1}}><Feather name={mission.completed >= mission.target ? "check-circle" : "circle"} size={22} color={mission.completed >= mission.target ? colors.positive : colors.bronze}/><Text style={{flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 12, lineHeight: 18}}>{t(labels[mission.category])}</Text><Text style={{color: colors.mutedLight, fontFamily: fonts.body, fontSize: 11}}>{formatNumber(mission.completed, locale)} / {formatNumber(mission.target, locale)}</Text><Text style={{color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 11}}>{formatNumber(mission.points, locale)} {t("missionPoints")}</Text></View>)}</View>;
}

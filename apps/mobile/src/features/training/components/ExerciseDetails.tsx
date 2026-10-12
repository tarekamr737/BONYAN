import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {View} from "react-native";
import {AppButton, DirectionalText as Text} from "../../../core/components";
import {useLocale} from "../../../core/i18n/LocaleProvider";
import {fitnessLabel} from "../../../core/i18n/fitness";
import {ui} from "../../auth/components/CoachingUI";
import {getExerciseDetails} from "../api/trainingApi";

export function ExerciseDetails({exerciseId, collapsible = false}: {exerciseId: string; collapsible?: boolean}) {
  const [expanded, setExpanded] = useState(false);
  const {t, locale, rtl} = useLocale();
  const available = Boolean(exerciseId) && !exerciseId.startsWith("fallback-") && (!collapsible || expanded);
  const details = useQuery({queryKey: ["training", "exercise-details", exerciseId], queryFn: () => getExerciseDetails(exerciseId), enabled: available, staleTime: 300_000});
  const instructions = rtl ? details.data?.translated_instructions : details.data?.instructions;
  if (collapsible && !expanded) return <AppButton label={t("exerciseDetails")} variant="secondary" onPress={() => setExpanded(true)}/>;
  return <View style={{gap: 8}}>{collapsible ? <AppButton label={`${t("exerciseDetails")} −`} variant="secondary" onPress={() => setExpanded(false)}/> : null}<Text style={ui.heading}>{t("formNotes")}</Text>{available && details.isPending ? <Text style={ui.small}>{t("loading")}</Text> : details.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void details.refetch()}/> : <><Text style={ui.small}>{t("targetMuscles")}: {details.data?.muscles.map(value => fitnessLabel(value, locale)).join(" · ")}</Text><Text style={ui.small}>{t("equipment")}: {details.data?.equipment.map(value => fitnessLabel(value, locale, "equipment")).join(" · ")}</Text>{instructions?.length ? instructions.map((line, index) => <Text key={index} style={ui.text}>{line}</Text>) : <Text style={ui.text}>{t("noTranslatedInstructions")}</Text>}</>}</View>;
}

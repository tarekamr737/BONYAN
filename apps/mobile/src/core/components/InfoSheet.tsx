import {type PropsWithChildren} from "react";
import {Modal, ScrollView, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useLocale} from "../i18n/LocaleProvider";
import {colors, fonts} from "../theme/tokens";
import {AppButton} from "./AppButton";
import {DirectionalText as Text} from "./DirectionalText";

export function InfoSheet({visible, title, onClose, children}: PropsWithChildren<{visible: boolean; title: string; onClose: () => void}>) {
  const {t} = useLocale();
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={{flex: 1, backgroundColor: colors.canvas}}>
      <View accessibilityViewIsModal style={{flex: 1}}>
        <View style={{padding: 16, gap: 12, borderBottomWidth: 1, borderColor: colors.line}}><Text accessibilityRole="header" style={{color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 24}}>{title}</Text><AppButton label={t("back")} variant="secondary" onPress={onClose}/></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding: 16, gap: 16, maxWidth: 660, width: "100%", alignSelf: "center"}}>{children}</ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

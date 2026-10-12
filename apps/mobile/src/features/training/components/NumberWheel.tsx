import {useEffect, useMemo, useRef, useState} from "react";
import {ScrollView, Pressable, StyleSheet, TextInput, View} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import {DirectionalText as Text} from "../../../core/components/DirectionalText";
import {useLocale} from "../../../core/i18n/LocaleProvider";
import {formatNumber} from "../../../core/i18n/messages";
import {colors, fonts} from "../../../core/theme/tokens";
import {parseSetValue, wheelIndex, wheelValues} from "../numberWheel";

const rowHeight = 44;
export function NumberWheel({label, value, min, max, step, onChange, onBusyChange, disabled = false}: {label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; onBusyChange: (busy: boolean) => void; disabled?: boolean}) {
  const {t, locale, rtl} = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const values = useMemo(() => wheelValues(min, max, step, value), [min, max, step, value]);
  const list = useRef<ScrollView>(null);
  const moving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useRef(0);
  const current = useRef({values, onChange, onBusyChange});
  useEffect(() => {current.current = {values, onChange, onBusyChange};}, [values, onChange, onBusyChange]);
  useEffect(() => {
    if (!moving.current && !editing) list.current?.scrollTo({y: Math.max(0, values.indexOf(value)) * rowHeight, animated: false});
  }, [value, values, editing]);
  useEffect(() => () => {if (timer.current) clearTimeout(timer.current); current.current.onBusyChange(false);}, []);
  function settle() {
    if (timer.current) clearTimeout(timer.current);
    const index = wheelIndex(offset.current, rowHeight, current.current.values.length);
    moving.current = false;
    const selected = current.current.values[index];
    if (selected !== undefined) current.current.onChange(selected);
    list.current?.scrollTo({y: index * rowHeight, animated: false});
    current.current.onBusyChange(false);
  }
  function save() {
    const parsed = parseSetValue(draft, min, max, step === 1);
    if (parsed === null) {setInvalid(true); return;}
    onChange(parsed); setEditing(false); setInvalid(false); onBusyChange(false);
  }
  return <View style={styles.column}>
    <Text style={styles.label}>{label}</Text>
    {editing ? <View style={styles.editor}><TextInput autoFocus accessibilityLabel={label} value={draft} onChangeText={setDraft} onSubmitEditing={save} keyboardType="decimal-pad" returnKeyType="done" style={[styles.input, rtl && {fontFamily: "Cairo_600SemiBold"}]} maxLength={10}/><Pressable accessibilityRole="button" accessibilityLabel={t("save")} onPress={save} style={styles.editButton}><Feather name="check" color={colors.green} size={22}/></Pressable></View> : <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.selection}/>
      <ScrollView ref={list} nestedScrollEnabled scrollEnabled={!disabled} showsVerticalScrollIndicator={false} snapToInterval={rowHeight} decelerationRate="fast" contentContainerStyle={{paddingVertical: rowHeight}} scrollEventThrottle={16}
        onScrollBeginDrag={() => {if (timer.current) clearTimeout(timer.current); moving.current = true; onBusyChange(true);}}
        onScroll={event => {offset.current = event.nativeEvent.contentOffset.y;}}
        onScrollEndDrag={() => {timer.current = setTimeout(settle, 180);}}
        onMomentumScrollBegin={() => {if (timer.current) clearTimeout(timer.current);}}
        onMomentumScrollEnd={settle}
      >{values.map(item => <Pressable key={item} disabled={disabled} accessibilityRole="button" accessibilityLabel={label + ": " + formatNumber(item, locale)} onPress={() => {if (item === value) {setDraft(String(value)); setEditing(true); onBusyChange(true);} else onChange(item);}} style={styles.item}><Text style={[styles.number, item === value && styles.selected]}>{formatNumber(item, locale)}</Text></Pressable>)}</ScrollView>
    </View>}
    {!editing ? <View accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{min, max, now: value}} accessibilityActions={[{name: "increment"}, {name: "decrement"}]} onAccessibilityAction={event => {if (!disabled) onChange(Math.max(min, Math.min(max, value + (event.nativeEvent.actionName === "increment" ? step : -step))));}} style={styles.tools}>
      <Pressable disabled={disabled || value <= min} accessibilityRole="button" accessibilityLabel={label + " −"} onPress={() => onChange(Math.max(min, value - step))} style={styles.editButton}><Feather name="minus" color={colors.mutedLight} size={18}/></Pressable>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label + ": " + t("swipeToChoose")} onPress={() => {setDraft(String(value)); setEditing(true); onBusyChange(true);}} style={styles.editButton}><Feather name="edit-3" color={colors.green} size={18}/></Pressable>
      <Pressable disabled={disabled || value >= max} accessibilityRole="button" accessibilityLabel={label + " +"} onPress={() => onChange(Math.min(max, value + step))} style={styles.editButton}><Feather name="plus" color={colors.mutedLight} size={18}/></Pressable>
    </View> : <Pressable accessibilityRole="button" onPress={() => {setEditing(false); setInvalid(false); onBusyChange(false);}} style={styles.editButton}><Text style={styles.label}>{t("cancel")}</Text></Pressable>}
    {invalid ? <Text accessibilityRole="alert" style={styles.error}>{t("invalidSetValue")} {min}–{max}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({column: {flex: 1, minWidth: 0, gap: 6}, label: {color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: "center"}, wheel: {height: rowHeight * 3, overflow: "hidden"}, selection: {position: "absolute", top: rowHeight, left: 0, right: 0, height: rowHeight, backgroundColor: colors.greenSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.greenBorder}, item: {height: rowHeight, alignItems: "center", justifyContent: "center"}, number: {color: colors.muted, fontFamily: fonts.displaySemiBold, fontSize: 20}, selected: {fontSize: 30, color: colors.green}, tools: {flexDirection: "row", justifyContent: "center"}, editButton: {minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center"}, editor: {height: rowHeight * 3, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft, borderRadius: 12}, input: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 30, textAlign: "center", width: "100%", minHeight: 48}, error: {color: colors.error, fontSize: 12}});

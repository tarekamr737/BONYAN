export const messages = {
  today: ["Today", "النهارده"], train: ["Train", "التمرين"], avatar: ["Avatar", "شخصيتك"],
  nutrition: ["Nutrition", "الأكل"], community: ["Community", "المجتمع"],
  coach: ["BONYAN Coach", "كوتش BONYAN"], askCoach: ["Ask your Coach", "اسأل الكوتش"],
  profile: ["Profile and settings", "حسابك والإعدادات"], notifications: ["Notifications", "الإشعارات"],
  retry: ["Try again", "جرّب تاني"], cancel: ["Cancel", "إلغاء"], save: ["Save", "احفظ"],
  loading: ["Loading your private data…", "بنحمّل بياناتك الخاصة…"],
  startup: ["Startup unavailable", "مش قادرين نفتح التطبيق"],
  preferencesError: ["Your device preferences could not be loaded.", "مش قادرين نحمّل إعدادات جهازك. جرّب تاني."],
  profileError: ["Your secure profile could not be loaded.", "مش قادرين نحمّل حسابك دلوقتي. جرّب تاني."],
  request_failed: ["Something went wrong. Please try again.", "حصلت مشكلة. جرّب تاني."],
  network_unavailable: ["Could not reach the server. Check your connection and try again.", "مش قادرين نوصل للسيرفر. اتأكد من النت وجرّب تاني."],
  request_timeout: ["The request took too long. Check your connection and try again.", "الطلب أخد وقت طويل. اتأكد من النت وجرّب تاني."],
  invalid_credentials: ["Email or password is incorrect.", "الإيميل أو كلمة السر مش صح."],
  account_exists: ["An account with this email already exists.", "الإيميل ده مسجّل قبل كده. جرّب تدخل بحسابك."],
  unauthorized: ["Sign in to continue.", "سجّل دخول عشان تكمّل."],
  forbidden: ["You cannot access this private resource.", "البيانات دي خاصة بحساب تاني."],
  not_found: ["This item is unavailable. Refresh and try again.", "المحتوى ده مش موجود دلوقتي. حدّث الصفحة وجرّب تاني."],
  rate_limited: ["Too many requests. Wait a moment and try again.", "طلبات كتير بسرعة. استنى شوية وجرّب تاني."],
  validation_error: ["Check the highlighted fields and try again.", "راجع البيانات اللي دخلتها وجرّب تاني."],
  proposal_stale: ["Your workout changed. Review a new proposal.", "تمرينك اتغيّر. راجع اقتراح جديد الأول."],
  proposal_expired: ["This proposal expired. Request a new preview.", "الاقتراح انتهت صلاحيته. اطلب معاينة جديدة."],
  voiceDisabled: ["Voice is not available in this build. Text chat is ready.", "الصوت مش متاح في النسخة دي. تقدر تكتب للكوتش."],
  startWorkout: ["Start workout", "ابدأ التمرين"], nextMove: ["Your next move", "خطوتك الجاية"],
  progressScore: ["Progress Score", "درجة تقدمك"], bodyProfile: ["Body Profile", "قياسات جسمك"],
  dailyScore: ["Daily habits score", "درجة عادات النهارده"], xp: ["XP", "نقط الخبرة"], level: ["Level", "المستوى"],
  weeklyMission: ["Weekly missions", "مهام الأسبوع"], league: ["The League", "الدوري"],
  weekly: ["Weekly", "الأسبوع"], friends: ["Friends", "الصحاب"], allTime: ["All-time", "كل الوقت"],
  rewards: ["Rewards wallet", "محفظة المكافآت"], rank: ["Rank", "الترتيب"],
  missionPoints: ["Mission Points", "نقط المهام"], joinLeague: ["Join this week's league", "انضم لدوري الأسبوع"],
  insufficientCoverage: ["Add more evidence to calculate your progress. Missing data is unknown, not zero.", "زوّد بيانات مؤكدة عشان نحسب تقدمك. البيانات الناقصة مش معناها صفر."],
  illustration: ["Measurement-informed illustration, not a clinical model.", "صورة توضيحية مبنية على قياساتك، مش نموذج طبي."],
  privateDefault: ["Private until you choose to share.", "خاص بيك لحد ما تختار تشاركه."],
  partnerDisabled: ["Partner vouchers are not available yet. No redeemable value is promised.", "قسائم الشركاء مش متاحة دلوقتي. مفيش قيمة مالية مضمونة."],
  sessionScope: ["Only this workout", "التمرين ده بس"], planScope: ["Future plan revision", "نسخة جديدة للتمارين الجاية"],
  equipmentScope: ["Update gym availability too", "عدّل الأجهزة المتاحة في جيمك كمان"],
  busyToday: ["Busy today", "مشغول النهارده"], missingEquipment: ["Not available in my gym", "مش موجود في جيمي"],
  preview: ["Preview alternative", "عاين البديل"], approve: ["Approve change", "وافق على التغيير"],
  reject: ["Keep current exercise", "خلّي التمرين زي ما هو"], undo: ["Undo before starting", "ارجع قبل ما تبدأ"],
  remainingSets: ["Only remaining sets change. Your previous sets keep their original exercise.", "هنغيّر المجموعات الباقية بس. المجموعات اللي سجّلتها هتفضل باسم تمرينها الأصلي."],
} as const;
export type MessageKey = keyof typeof messages;
export type Locale = "en" | "ar-EG";
export function normalizeLocale(value?: string | null): Locale { return value?.startsWith("ar") ? "ar-EG" : "en"; }
let currentLocale: Locale = "en";
export const getCurrentLocale = () => currentLocale;
export function setCurrentLocale(locale: Locale) { currentLocale = locale; }
export function translate(key: MessageKey, locale: Locale = currentLocale): string {
  return messages[key][locale === "ar-EG" ? 1 : 0];
}
export function localizedError(code: string, locale: Locale = currentLocale): string {
  const key = code in messages ? code as MessageKey : "request_failed";
  return translate(key, locale);
}
export function localeDirection(locale: Locale) { return locale === "ar-EG" ? "rtl" as const : "ltr" as const; }
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}
export function formatDate(value: string | Date, locale: Locale, timezone: string) {
  return new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeZone: timezone}).format(new Date(value));
}

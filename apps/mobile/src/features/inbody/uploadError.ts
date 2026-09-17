export function getUploadErrorMessage(error: unknown, arabic = false): string {
  if (arabic) {
    const message = error instanceof Error ? error.message : "";
    if (/network request failed|failed to fetch/i.test(message)) return "تعذّر الاتصال بالخادم. راجع الاتصال وحاول تاني.";
    if (/Multi-page image uploads/i.test(message)) return "لرفع صور متعددة استخدم تطبيق الموبايل، أو اختار ملف PDF واحد هنا.";
    if (/between one and three|one PDF|three images/i.test(message)) return "اختار ملف PDF واحد أو من صورة إلى ٣ صور لنفس التقرير.";
    if (/permission|could not read|cannot read|missing.*read/i.test(message)) return "ما قدرناش نقرا ملف أو أكتر. اختار الصفحات من جديد وحاول تاني.";
    if (/too large|size|large/i.test(message)) return "حجم التقرير كبير. اختار ملفًا أصغر وحاول تاني.";
    if (/readable|supported|file|image|PDF/i.test(message)) return "اختار صورة واضحة أو PDF صالح لتقرير InBody.";
    return "تعذّر رفع التقرير. الملفات موجودة؛ حاول تاني، أو اختار تقريرًا آخر لو المشكلة مستمرة.";
  }
  if (!(error instanceof Error)) {
    return "The report could not be uploaded. Check the file and retry.";
  }
  if (/network request failed|failed to fetch/i.test(error.message)) {
    return "BONYAN could not reach the server. Check your connection and retry.";
  }
  if (/permission|could not read|cannot read|missing.*read/i.test(error.message)) {
    return "BONYAN could not read one or more files. Select the pages again and retry.";
  }
  return error.message;
}

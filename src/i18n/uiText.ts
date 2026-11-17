import { useCallback } from "react";
import { useLanguage, type Language } from "@/hooks/useLanguage";

/**
 * Deterministic UI-string dictionary keyed by the source literal used in code
 * (English or Uzbek). `tx(source)` returns the text in the active language;
 * unknown strings are returned unchanged.
 */
type Entry = Record<Language, string>;

const E = (en: string, ru: string, uz: string): Entry => ({ en, ru, uz });

const ENTRIES: Entry[] = [
  // App / NotFound / SelectRole
  E("Loading...", "Загрузка...", "Yuklanmoqda..."),
  E("Oops! Page not found", "Упс! Страница не найдена", "Kechirasiz! Sahifa topilmadi"),
  E("Return to Home", "Вернуться на главную", "Bosh sahifaga qaytish"),
  E("Welcome to TransplantCare", "Добро пожаловать в TransplantCare", "TransplantCare'ga xush kelibsiz"),
  E("Confirm your role to continue", "Подтвердите роль, чтобы продолжить", "Davom etish uchun rolingizni tasdiqlang"),
  E("Continue as a patient", "Продолжить как пациент", "Bemor sifatida davom etish"),
  E("Patient Portal", "Портал пациента", "Bemor portali"),
  E("Doctor / Healthcare Provider", "Врач / Медработник", "Shifokor / Tibbiyot xodimi"),
  E("Support", "Поддержка", "Yordamchi"),
  E("Administrator", "Администратор", "Administrator"),
  E("View your health status, lab results, and care timeline", "Состояние здоровья, анализы и план наблюдения", "Sog'liq holati, tahlil natijalari va kuzatuv rejasi"),
  E("Manage patients, review risks, and oversee transplant care", "Ведение пациентов, оценка рисков и контроль трансплантации", "Bemorlarni boshqarish, xavflarni ko'rib chiqish va transplant kuzatuvi"),
  E("Help users with issues and manage support requests", "Помощь пользователям и обработка обращений", "Foydalanuvchilarga yordam va murojaatlarni boshqarish"),
  E("Full system management, users and settings", "Полное управление системой, пользователями и настройками", "Tizim, foydalanuvchilar va sozlamalarni to'liq boshqarish"),
  E("Har bir hisob faqat bitta rolga ega. Davom etish uchun rolingizni tasdiqlang.", "Каждая учётная запись имеет только одну роль. Подтвердите роль, чтобы продолжить.", "Har bir hisob faqat bitta rolga ega. Davom etish uchun rolingizni tasdiqlang."),
  // AdminUsers
  E("Users", "Пользователи", "Foydalanuvchilar"),
  E("Shifokor", "Врач", "Shifokor"),
  E("Yordamchi", "Поддержка", "Yordamchi"),
  E("Bemor", "Пациент", "Bemor"),
  E("Foydalanuvchilar", "Пользователи", "Foydalanuvchilar"),
  E("Tizim foydalanuvchilari va ularning rollarini boshqarish. Faqat administratorlar uchun.", "Управление пользователями и их ролями. Только для администраторов.", "Tizim foydalanuvchilari va ularning rollarini boshqarish. Faqat administratorlar uchun."),
  E("Rol yangilandi", "Роль обновлена", "Rol yangilandi"),
  E("Foydalanuvchi roli muvaffaqiyatli o'zgartirildi.", "Роль пользователя успешно изменена.", "Foydalanuvchi roli muvaffaqiyatli o'zgartirildi."),
  E("Xatolik", "Ошибка", "Xatolik"),
  E("Email tasdiqlandi", "Email подтверждён", "Email tasdiqlandi"),
  E("Foydalanuvchi emaili tasdiqlangan deb belgilandi.", "Email пользователя отмечен как подтверждённый.", "Foydalanuvchi emaili tasdiqlangan deb belgilandi."),
  E("Parol kamida 8 belgidan iborat bo'lishi kerak.", "Пароль должен содержать не менее 8 символов.", "Parol kamida 8 belgidan iborat bo'lishi kerak."),
  E("Parol juda uzun.", "Пароль слишком длинный.", "Parol juda uzun."),
  E("Parollar mos kelmadi.", "Пароли не совпадают.", "Parollar mos kelmadi."),
  E("Parol yangilandi", "Пароль обновлён", "Parol yangilandi"),
  E("Foydalanuvchi yangi parol bilan kira oladi.", "Пользователь может войти с новым паролем.", "Foydalanuvchi yangi parol bilan kira oladi."),
  E("Email yoki ism bo'yicha qidirish", "Поиск по email или имени", "Email yoki ism bo'yicha qidirish"),
  E("Barcha rollar", "Все роли", "Barcha rollar"),
  E("Rol berilmagan", "Роль не назначена", "Rol berilmagan"),
  E("Foydalanuvchi topilmadi", "Пользователи не найдены", "Foydalanuvchi topilmadi"),
  E("Qidiruv yoki filtr shartlarini o'zgartirib ko'ring.", "Измените условия поиска или фильтра.", "Qidiruv yoki filtr shartlarini o'zgartirib ko'ring."),
  E("Ism", "Имя", "Ism"),
  E("Rol", "Роль", "Rol"),
  E("Amallar", "Действия", "Amallar"),
  E("Amal", "Действие", "Amal"),
  E("Email tasdiqlangan", "Email подтверждён", "Email tasdiqlangan"),
  E("Oxirgi kirish", "Последний вход", "Oxirgi kirish"),
  E("Ro'yxatdan o'tgan", "Зарегистрирован", "Ro'yxatdan o'tgan"),
  E("(siz)", "(вы)", "(siz)"),
  E("Ha", "Да", "Ha"),
  E("Yo'q", "Нет", "Yo'q"),
  E("Emailni tasdiqlash", "Подтвердить email", "Emailni tasdiqlash"),
  E("Parolni tiklash", "Сбросить пароль", "Parolni tiklash"),
  E("O'z rolingizni o'zgartirish mumkin emas", "Нельзя изменить собственную роль", "O'z rolingizni o'zgartirish mumkin emas"),
  E("Rolni o'zgartirish", "Изменить роль", "Rolni o'zgartirish"),
  E("Bekor qilish", "Отмена", "Bekor qilish"),
  E("Saqlanmoqda...", "Сохранение...", "Saqlanmoqda..."),
  E("Saqlash", "Сохранить", "Saqlash"),
  E("Bu emailni administrator sifatida tasdiqlaysizmi? Foydalanuvchi email tasdiqlashsiz tizimga kira oladi.", "Подтвердить этот email как администратор? Пользователь сможет войти без подтверждения по почте.", "Bu emailni administrator sifatida tasdiqlaysizmi? Foydalanuvchi email tasdiqlashsiz tizimga kira oladi."),
  E("Tasdiqlanmoqda...", "Подтверждение...", "Tasdiqlanmoqda..."),
  E("Tasdiqlash", "Подтвердить", "Tasdiqlash"),
  E("uchun yangi parol kiriting.", "— введите новый пароль.", "uchun yangi parol kiriting."),
  E("Yangi parol", "Новый пароль", "Yangi parol"),
  E("Parolni tasdiqlang", "Подтвердите пароль", "Parolni tasdiqlang"),
  E("Parolni yashirish", "Скрыть пароль", "Parolni yashirish"),
  E("Parolni ko'rsatish", "Показать пароль", "Parolni ko'rsatish"),
  // Lab upload / bulk entry / history
  E("Detected", "Найдено", "Aniqlandi"),
  E("Not detected", "Не найдено", "Aniqlanmadi"),
  E("⚠ Patient identity mismatch", "⚠ Несовпадение данных пациента", "⚠ Bemor ma'lumotlari mos emas"),
  E("This report may belong to another patient. Please verify before continuing.", "Этот отчёт может принадлежать другому пациенту. Проверьте перед продолжением.", "Bu hisobot boshqa bemorga tegishli bo'lishi mumkin. Davom etishdan oldin tekshiring."),
  E("Blocked: identity mismatch", "Заблокировано: несовпадение данных", "Bloklandi: shaxs ma'lumotlari mos emas"),
  E("This report may belong to another patient. Please confirm override before saving.", "Этот отчёт может принадлежать другому пациенту. Подтвердите перед сохранением.", "Bu hisobot boshqa bemorga tegishli bo'lishi mumkin. Saqlashdan oldin tasdiqlang."),
  E("Verification incomplete", "Проверка не завершена", "Tekshiruv yakunlanmagan"),
  E("field(s) still require review before saving.", "пол(я) требуют проверки перед сохранением.", "ta maydon saqlashdan oldin tekshirilishi kerak."),
  E("Patient identity could not be verified from this report.", "Не удалось подтвердить личность пациента по этому отчёту.", "Bu hisobotdan bemor shaxsini tasdiqlab bo'lmadi."),
  E(" · No stored patient identity available for comparison.", " · Нет сохранённых данных пациента для сравнения.", " · Solishtirish uchun saqlangan bemor ma'lumotlari yo'q."),
  E("No identity block detected on report", "В отчёте не найдены данные пациента", "Hisobotda bemor ma'lumotlari topilmadi"),
  E("Identity match", "Личность совпадает", "Shaxs mos keldi"),
  E("Identity could not be confirmed", "Личность не подтверждена", "Shaxsni tasdiqlab bo'lmadi"),
  E("Validation errors", "Ошибки проверки", "Tekshiruv xatolari"),
  E("Fix highlighted cells", "Исправьте выделенные ячейки", "Belgilangan kataklarni tuzating"),
  E("No data", "Нет данных", "Ma'lumot yo'q"),
  E("Enter at least one row", "Введите хотя бы одну строку", "Kamida bitta qator kiriting"),
  E("Finalizing...", "Завершение...", "Yakunlanmoqda..."),
  E("lab result(s) saved", "результат(ов) сохранено", "ta tahlil saqlandi"),
  E("row(s) failed", "строк(и) с ошибкой", "ta qatorda xato"),
  E("No rows were saved. Check console for details.", "Ни одна строка не сохранена.", "Hech bir qator saqlanmadi."),
  E("Saving...", "Сохранение...", "Saqlanmoqda..."),
  E("Save All", "Сохранить всё", "Hammasini saqlash"),
  E("Deletion cancelled: reason required", "Удаление отменено: нужна причина", "O'chirish bekor qilindi: sabab ko'rsatilishi kerak"),
  E("Tacrolimus, Prednisone...", "Такролимус, Преднизолон...", "Takrolimus, Prednizolon..."),
  // AI chat
  E("Auth error", "Ошибка авторизации", "Avtorizatsiya xatosi"),
  E("Please sign in again", "Пожалуйста, войдите снова", "Iltimos, qayta kiring"),
  E("Rate limit", "Лимит запросов", "So'rovlar chegarasi"),
  E("AI credits exhausted", "Кредиты AI исчерпаны", "AI kreditlari tugadi"),
  E("Chat error", "Ошибка чата", "Suhbat xatosi"),
  E("Network error", "Ошибка сети", "Tarmoq xatosi"),
  E("Unknown error", "Неизвестная ошибка", "Noma'lum xato"),
  // Priority / prediction
  E("Overdue lab tests", "Просроченные анализы", "Muddati o'tgan tahlillar"),
  E("Medium risk", "Средний риск", "O'rta xavf"),
  E("Prediction unavailable — manual clinical review required", "Прогноз недоступен — требуется ручная клиническая оценка", "Bashorat mavjud emas — shifokor ko'rigi talab qilinadi"),
  E("Insufficient lab data — manual clinical review required", "Недостаточно анализов — требуется ручная клиническая оценка", "Tahlillar yetarli emas — shifokor ko'rigi talab qilinadi"),
];

const INDEX = new Map<string, Entry>();
for (const e of ENTRIES) {
  for (const v of [e.en, e.uz]) if (!INDEX.has(v)) INDEX.set(v, e);
}

export function translateUi(source: string, lang: Language): string {
  const hit = INDEX.get(source);
  if (hit) return hit[lang];
  const missed = source.match(/^Missed medication (\d+) days$/);
  if (missed) {
    const n = missed[1];
    return lang === "ru" ? `Пропуск лекарств ${n} дн.` : lang === "uz" ? `${n} kun dori o'tkazib yuborilgan` : source;
  }
  return source;
}

export function useTx(): (source: string) => string {
  const { lang } = useLanguage();
  return useCallback((source: string) => translateUi(source, lang), [lang]);
}

# Qolgan uchta monitoring muammosini xavfsiz tuzatish

## Hozirgi natija
- Parolni tiklash endi emailni yashirin tasdiqlamaydi; alohida tasdiqlash amali saqlangan. Xizmatga tuzatish joylandi.
- Yangi ogohlantirish kelganda yuqoridagi qo‘ng‘iroq soni darhol yangilanishga chaqiriladi.
- 90 µmol/L kreatininni tekshirishdan oldin 1.02 mg/dL ga o‘girish hozirgi loyihada allaqachon mavjud. Bu topilma eskirgan deb belgilandi.
- Tegishli 23/23 sinov o‘tdi. Sayt nashr qilinmadi; haqiqiy hisob parolini yoki bemor ma’lumotlarini o‘zgartirib sinov qilinmadi.

## 1. Shifokorning tekshirish navbati
- Faol navbatda bir tahlilning takroriy xavf baholarini birlashtirish; tarixiy baholarni alohida ko‘rib chiqish ro‘yxatida saqlash.
- Har bir tekshirish talab qiladigan tahlilni ochish va aynan o‘sha bahoni tasdiqlash imkonini berish; faqat oxirgi bahoga cheklanmaslik.
- Ro‘yxatni sahifalab yuklash; bemor bo‘yicha yig‘ilgan ko‘rinish dastlab yopiq qoladi.
- Eski yozuvlarni dalilsiz “shifokor tasdiqlagan” deb belgilamaslik, o‘chirmaslik va yoshiga qarab avtomatik yopmaslik.
- Xavf hisobi, klinik chegaralar va bemor holatini yangilash qoidalari o‘zgarmaydi.

## 2. Tahlil birligini aniqlashtirish
- BK Virus va CMV uchun copies/mL, DSA uchun MFI kabi tegishli standart birliklarni belgilash; kaliy mEq/L va mmol/L tengligini faqat shu parametr uchun qo‘llash.
- Mos kelmaydigan birliklarda qaysi maydon muammoli ekanini ko‘rsatish va birlik tanlash imkonini qo‘shish. Tanlangan birlik qiymat yozilgan haqiqiy birlikka mos bo‘lishi kerak.
- Ixtiyoriy maydon noto‘g‘ri birlikda bo‘lsa, shifokor uni aniq qaror bilan tozalab, qolgan tahlilni saqlashi mumkin; hech qanday qiymat yashirin tashlab ketilmaydi.
- Proteinuriya mg/g va g/day kabi turli o‘lchovlarni taxminiy o‘girmaslik: mos o‘lchovdagi natijani kiritish talab qilinadi.
- Xom qiymat, manba birligi va o‘girish izi saqlanadi; tekshirish standart birlikka o‘girgandan keyin bajariladi. Yangi matnlar UZ/RU/EN bo‘ladi.

## 3. Yetkazilmagan eslatmalarni qayta urinish
- “Band qilingan”, “yuborish xizmati qabul qilgan”, “qayta urinish mumkin”, “natijasi noaniq” holatlarini ajratish.
- Aniq muvaffaqiyatsiz urinishlarni cheklangan qayta yuborish navbatiga qo‘yish; vaqtinchalik yozish xatosi “allaqachon yuborilgan” deb yashirilmaydi.
- Parallel ishlar bitta eslatmani ikki marta yubormasligi uchun band qilish atomar bo‘ladi.
- Qisman muvaffaqiyatda avval qabul qilgan manzilga takror yubormaslik; noaniq natijada avtomatik ravishda qayta yubormaslik.
- Qayta urinishlarni kunlik eslatma vazifasi tugaganidan keyin ham ishlaydigan rejalashtirilgan vazifa bajaradi. Brauzer xizmatining qabul qilishi bildirishnoma odamga ko‘ringanini isbotlamaydi.

## Texnik yechim va tekshirish
- Tekshirish navbati uchun RLS bilan cheklangan, sahifalangan so‘rov va har bir bahoga bog‘langan mavjud `verify_risk_snapshot` chaqiruvi; tarixiy holatni tasdiqlash dalili sifatida ishlatmaslik.
- Birlik tanlovi umumiy `normalizeField` qoidalari bilan ishlaydi; noma’lum yoki o‘lchovi mos kelmaydigan birliklar bloklanishda davom etadi, lekin foydalanuvchiga tuzatish yo‘li beriladi.
- `notification_log` uchun qo‘shimcha holat/urinish vaqti maydonlari hamda faqat xizmat roli foydalanadigan atomar band qilish funksiyasi; eski hisoblagichdan yetkazilganlikni taxmin qilmaslik. RLS va mavjud ruxsatlar saqlanadi.
- Takroriy baholar, aniq bahoni tasdiqlash, virus birliklari, mos kelmaydigan proteinuriya, parallel band qilish, nol/qisman yuborish va noaniq natija uchun aniq xatti-harakat sinovlari.
- Tegishli sahifalarni brauzerda tekshirish; haqiqiy bemor ma’lumotlari yoki hisoblarini sinov uchun o‘zgartirmaslik. Nazoratli haqiqiy yuborish kerak bo‘lsa, faqat rozilik bilan.
- Tekshiruvlar o‘tgach qolgan uch monitoring topilmasini tuzatilgan deb belgilash. Saytni faqat alohida so‘rov bilan nashr qilish.
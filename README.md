# GGNEWS

אתר החדשות העברי של עולם `tomer_GG FANCLUB`. האתר בנוי ב-Astro, הכתבות נערכות ב-Pages CMS, וניתן לארח אותו בחינם ב-Cloudflare Pages.

## הפעלה במחשב

דרוש Node.js 20 או חדש יותר. בתיקיית הפרויקט:

```powershell
npm install
npm run dev
```

לאחר מכן פותחים `http://localhost:4321`. לבדיקת גרסת הפרודקשן:

```powershell
npm run build
npm run preview
```

הבנייה הסטטית נוצרת בתיקייה `dist/`.

## העלאה ראשונה ל-GitHub

1. המאגר של האתר נמצא בכתובת `https://github.com/MrtomerGG/GGNews`.
2. להעלאה ידנית ממחשב חדש אפשר להשתמש בפקודות:

```powershell
git init
git add .
git commit -m "Initial GGNEWS website"
git branch -M main
git remote add origin https://github.com/MrtomerGG/GGNews.git
git push -u origin main
```

אם שם המאגר שונה, מחליפים את `GGNews` בכתובת. אין להעלות סיסמאות, מפתחות API או קודי שחזור למאגר.

## פרסום כתבה ב-Pages CMS

הקובץ `.pages.yml` מגדיר עורך כתבות בעברית. הכתבות נשמרות ב-`src/content/articles/`, ותמונות שמועלות נשמרות ב-`public/assets/uploads/`.

1. נכנסים ל-[Pages CMS](https://app.pagescms.org/) ומתחברים באמצעות GitHub.
2. מתקינים את GitHub App של Pages CMS ומאשרים לו גישה רק למאגר `GGNews`.
3. פותחים את המאגר ובוחרים **כתבות → New**.
4. ממלאים כותרת, תקציר, כותב/ת, תאריך ואת תוכן הכתבה. אפשר להוסיף תמונה וסרטון YouTube.
5. השם המוצע לקובץ כולל תאריך וכותרת. עדיף שם קצר באנגלית, ספרות ומקפים, ללא רווחים.
6. שומרים עם **טיוטה** מופעלת כדי להמשיך לערוך. כשמוכנים, מכבים את **טיוטה** ושומרים שוב.
7. כל שמירה יוצרת commit ב-GitHub; Cloudflare יבנה ויפרסם את השינוי אוטומטית.

לפני פרסום בודקים שהכותרת, התאריך, שם הכותב/ת, זכויות השימוש בתמונה ותוכן הכתבה.

### עריכת ההודעה בראש האתר

ב-Pages CMS בוחרים **הודעת האתר**. אפשר לערוך את הטקסט או לכבות את **להציג את ההודעה**, ואז שומרים. השמירה מעדכנת את `src/data/site.json` ומפעילה פריסה חדשה ב-Cloudflare.

## סרטוני YouTube

בשדה **מזהה YouTube** מדביקים רק את המזהה בן 11 התווים. למשל, בכתובת:

```text
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

המזהה הוא `dQw4w9WgXcQ`. הסרטון יכול להיות בערוץ Isaac Studios; הוא צריך להיות ציבורי או לא-רשום ואפשר הטמעה. סרטון פרטי לא יוצג למבקרי האתר. האתר לא משתמש בשידור חי.

## פריסה חינמית ב-Cloudflare Pages

1. נכנסים ל-Cloudflare → **Workers & Pages** → **Create application** → **Pages** → **Import an existing Git repository**.
2. מחברים את `MrtomerGG/GGNews` ומגדירים:
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: להשאיר ריק
3. לוחצים **Save and Deploy**. בסיום מתקבלת כתובת `*.pages.dev` זמנית.
4. בפרויקט שנוצר נכנסים ל-**Custom domains** → **Set up a domain** ומוסיפים `ggnews.club` (ואפשר להוסיף אחר כך גם `www.ggnews.club`).

הנחיות רשמיות: [Astro ב-Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/) ו-[Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## חיבור `ggnews.club` מ-Namecheap

כדי שהדומיין הראשי `ggnews.club` יעבוד עם Cloudflare Pages, מוסיפים אותו תחילה כאזור (zone) בחשבון Cloudflare במסלול Free. Cloudflare יציג שני nameservers ייחודיים.

1. **לפני השינוי:** מעתיקים ל-Cloudflare כל רשומת DNS קיימת שצריכים, במיוחד MX/TXT אם יש אימייל בדומיין.
2. ב-Namecheap: **Domain List** → **Manage** ליד `ggnews.club` → **Nameservers** → **Custom DNS**.
3. מדביקים את שני ה-nameservers ש-Cloudflare סיפק ושומרים.
4. חוזרים ל-Cloudflare ולוחצים **Check nameservers**. השינוי עשוי להזדקק לזמן הפצה.

שינוי nameservers מעביר את ניהול ה-DNS מ-Namecheap ל-Cloudflare; הוא לא מעביר את הבעלות על הדומיין. הדומיין נשאר ב-Namecheap ועדיין צריך לחדש אותו בתשלום בכל שנה. [הדרכת Namecheap](https://www.namecheap.com/support/knowledgebase/article.aspx/9607/2210/how-to-set-up-dns-records-for-your-domain-in-a-cloudflare-account/).

## English quick reference

- Install/run: `npm install`, then `npm run dev`.
- Production check: `npm run build`, then `npm run preview`.
- Content lives in `src/content/articles/*.md`; uploads live in `public/assets/uploads/`.
- Sign in at [Pages CMS](https://app.pagescms.org/), authorize only `MrtomerGG/GGNews`, edit **כתבות**, and turn off **טיוטה** when the story is ready.
- Use **הודעת האתר** in Pages CMS to edit or disable the site announcement.
- In Cloudflare Pages use branch `main`, build command `npm run build`, and output `dist`.
- Put only the 11-character YouTube video ID in `youtubeId`, never the complete URL.
- Hosting and the editor can stay on free plans; the already-owned domain still has its normal annual renewal cost.

# Proje Brifi: "Checkmate Quest" (çalışma adı) — 3D Satranç Bulmaca Oyunu

Sen bu projede baş geliştiricimsin. Benimle birlikte Google Play'e (sonra App Store'a) çıkacak, global pazar için bir **3D satranç bulmaca (puzzle) mobil oyunu** geliştireceksin. Gelir modeli ödüllü reklam + seviye arası reklam + oyun içi ekonomi. Bu dosya projenin ana referansıdır; her aşamada buna sadık kal ve kararlar değiştikçe güncelle.

---

## 1. Hedef ve konumlandırma

- Global kitle (öncelik ABD, Avrupa, Hindistan, Latin Amerika), 13+ genel kitle. **Çocuklara yönelik değil.**
- Pazarda ücretsiz ve güçlü bulmaca kaynakları var (Lichess, Chess.com). Biz onlarla "satranç eğitimi" alanında yarışmıyoruz. Farkımız: **bulmacayı bir mobil oyun gibi hissettirmek.**
  - Sinematik 3D animasyonlar (taş hareketleri, şah mat anı, kutlama)
  - Harita üzerinde ilerleme, dünyalar, yıldızlar, ödüller
  - Kozmetik ekonomi (tahta ve taş setleri)
- Hedef metrikler: 1. gün tutma %40+, 7. gün %15+, oturum başına 8+ bulmaca.

## 2. Bulmaca içeriği ("sınırsız seviye")

> **Karar (2026-10-03):** Dış veri kaynağı kullanılmıyor. Lichess veritabanı yerine tüm bulmacalar **kendi motorumuzla sıfırdan üretilir**.

- **Üretici (`tools/puzzlegen/`, TypeScript, oyunla aynı kural motorunu kullanır):**
  1. Kendi arama motorumuz "gürültülü" oyunlar oynar (rastgele açılış + sıcaklıklı hamle seçimi).
  2. Rakip bir hata yaptığında oluşan pozisyonda arar: **zorunlu mat (1–3 hamle)** veya **tek kazandıran taktik** (en iyi hamle ikinciden ≥150 cp iyi, kazanç ≥200 cp, basit geri alma değil).
  3. Çözüm tek olmalı (son hamledeki alternatif matlar hariç); aksi halde bulmaca atılır.
  4. Temaları otomatik etiketler (mateIn1/2/3, fork, pin, skewer, discoveredAttack, hangingPiece, sacrifice, promotion, backRankMate, smotheredMate, endgame…) ve sezgisel bir zorluk puanı verir.
  5. `build-levels.ts` tekrar doğrular, tekilleştirir, **kademeli zorluk eğrisi** kurar (ilk 50 seviye çok kolay: mat-in-1 ve korunmasız taş) ve 1000'lik paketlere böler: `content/puzzles/levels/` (gömülü ~20.000) ve `content/puzzles/remote/` (sonradan indirilecek fazlalar).
- Format (Lichess ile uyumlu mantık): FEN rakibin hamlesinden önceki pozisyondur; `moves[0]` rakibin hamlesidir, oyuncu `moves[1]`den çözer.
- Uygulama her bulmacayı yüklerken kural motoruyla **yeniden doğrular**; hatalı olanı atlar ve kaydeder.
- Zorluk puanları sezgiseldir; Aşama 4'te oyuncu verisiyle (çözülme oranı) yeniden ayarlanacak.

## 3. Oyun modları

| Mod | Açıklama |
|---|---|
| **Macera (ana mod)** | Dünyalara bölünmüş harita: Köy → Kale → Çöl Sarayı → Buz Krallığı → Uzay Arenası… Her dünya ~100 seviye, sonra yeni dünyalar prosedürel olarak devam eder. Her seviye 1–3 yıldız. |
| **Günlük Bulmaca** | Herkese aynı bulmaca; seri (streak) sistemi. |
| **Sonsuz / Puan modu** | Oyuncu puanına göre (Elo benzeri, Glicko basitleştirilmiş) uyarlanan zorluk. Yanlışta puan düşer. |
| **Tema antrenmanı** | Sadece çatal, sadece mat-in-2 vb. (dünya ilerledikçe açılır) |

**Yıldız kuralı:** 3 yıldız = ipucusuz ve hatasız; 2 = bir hata veya ipucu; 1 = çözüldü.

## 4. Ekonomi

| Para birimi | Nereden kazanılır | Nereye harcanır |
|---|---|---|
| **Altın (soft)** | Seviye bitirme, yıldız, günlük ödül, ödüllü reklam | İpucu, geri alma, kozmetik setler |
| **Elmas (hard)** | Satın alma, nadir ödüller, sezon kartı | Premium kozmetik, can yenileme, özel dünyalar |
| **Can (opsiyonel, Remote Config ile aç/kapat)** | Zamanla dolar (5 can, 20 dk'da bir) | Yanlış çözümde 1 can gider |

- **İpucu sistemi:** 1. ipucu doğru taşı parlatır, 2. ipucu hedef kareyi gösterir, 3. ipucu hamleyi oynar.
- **Kozmetik mağaza (ana harcama alanı):** 3D tahta setleri (mermer, ahşap, kristal, neon, lav) ve taş setleri (klasik, cam, altın, robot, fantastik). Ayrıca mat efektleri (şimşek, havai fişek).
- **İlerleme ödülleri:** Dünya sonu sandıkları, kilometre taşları, günlük görevler, 7 günlük giriş ödülü.
- Tüm sayılar `config/economy.json` dosyasında; kodda sihirli sayı yok. Bir **ekonomi simülasyonu** yaz: ortalama oyuncunun günde ne kadar altın kazandığını ve bir kozmetiği kaç günde aldığını raporlasın. Hedef: ilk kozmetik ilk 2 günde, sonraki her biri 3–5 günde.

## 5. Para kazanma

**Seviye arası (interstitial) reklam kuralları:**
- İlk 8 seviye hiç yok.
- Sonra **her 3 seviyede bir**, en az 90 saniye aralıkla. Frekans Remote Config ile ayarlanabilir.
- Sadece seviye bitiş ekranından sonra; asla bulmaca ortasında değil.

**Ödüllü reklam anları:**
| Yer | Ödül |
|---|---|
| Seviye sonu | Altın ödülünü ×2 |
| Takılınca | Ücretsiz ipucu |
| Yanlış hamlede | Geri al ve devam et |
| Can bitince | Canları doldur |
| Günlük sandık | Ekstra sandık |

**Satın alımlar:** Reklamsız (interstitial'ları kaldırır), elmas paketleri, başlangıç paketi, aylık sezon kartı (Remote Config ile sonra açılır).

**Teknik:** Reklamları bir `IAdService` arayüzünün arkasına koy. Önce **sahte (mock)** uygulama ile geliştir, sonra AdMob/LevelPlay **yalnızca test ID'leri** ile. Gerçek ID'leri ben vereceğim. GDPR için **Google UMP onay akışı** zorunlu.

## 6. Teknik yapı

- **Motor (karar 2026-10-03): TypeScript + Three.js (3D) + Vite; Android paketi için Capacitor (Aşama 3–5).**
  Unity yerine seçildi çünkü geliştirme ve test tamamen bilgisayarsız yapılabiliyor: oyun her aşamada bir web önizleme linki olarak paylaşılır, telefonda tarayıcıdan oynanır. AdMob/UMP, Firebase ve Play Billing için olgun Capacitor eklentileri var.
- **Satranç kural motoru:** Sıfırdan yazıldı (`src/core/chess`). Gerekenler: FEN okuma, yasal hamle üretimi, şah/mat/pat, terfi, rok, geçerken alma, UCI hamle formatı. **Kapsamlı birim testleri zorunlu** (perft testleri dahil).
- **Stockfish'i uygulamaya gömme** (GPL lisansı). Bulmaca çözümleri veritabanından gelir, motor gerekmez.
- Mimari: `src/core` (kural motoru, bulmaca modeli, analiz, ekonomi), `src/game` (seviye akışı, ilerleme, metinler), `src/presentation` (3D tahta, animasyonlar, girdi), `src/services` (ads, IAP, save, analytics, remote config, içerik indirme — Aşama 3–4).
- Kayıt: yerel JSON, sürüm numarası ve migrasyon. Sonra Google Play Games ile bulut kaydı (Aşama 4).
- Performans: orta seviye Android'de 60 FPS, ilk açılış < 5 sn, APK/AAB hedef < 100 MB.
- Dil: İngilizce varsayılan; Türkçe, İspanyolca, Portekizce, Hintçe sonradan. Tüm metinler `src/game/i18n.ts` tablolarında.

## 7. 3D görsel ve animasyon

- Kamera: hafif eğik, tahta ekranı dolduracak şekilde; dikey (portrait) oynanış. Oyuncu tahtayı 2 parmakla hafifçe döndürebilir, çift dokunuşla sıfırlanır.
- Kontrol: taşa dokun → yasal kareler parlar → hedefe dokun. Sürükle-bırak da desteklensin.
- Animasyonlar (kendi küçük tween sistemimiz, `src/presentation/tween.ts`):
  - Taş hareketi: hafif yay çizen, ağırlıklı iniş
  - Alma: alınan taş fiziksel olarak devrilip tahtadan düşer
  - Şah: kral etrafında kırmızı nabız
  - **Şah mat:** yavaş çekim, kamera yakınlaşması, kral devrilir, parçacık efekti
  - Yanlış hamle: taş geri kayar, hafif titreşim
- Asset'ler: İlk aşamada low-poly taşlar **tamamen kodla** üretilir (`pieces.ts`). Taş ve tahta görünümü veri tabanlı "set" tanımlarıyla değiştirilebilir (`sets.ts`; kozmetik mağaza da bunu kullanacak).
- Ses ve dokunsal geri bildirim: taş sesi, mat fanfarı, haptic.

## 8. Analitik ve uzaktan ayar (Aşama 4)

Firebase Analytics + Remote Config + Crashlytics. Olaylar: seviye başlangıç/bitiş/başarısızlık (bulmaca ID ve puanıyla), ipucu kullanımı, reklam gösterimi ve tamamlanması (yerleşime göre), satın alma, mağaza görüntüleme, tutorial adımları. **Zorluk eğrisi ve reklam sıklığı uzaktan ayarlanabilsin.** Çok sık başarısız olunan bulmacaları tespit edip sıradan çıkarabilelim.

## 9. Aşamalar ve kabul kriterleri

| Aşama | İçerik | Bittiğinde |
|---|---|---|
| 0. Kurulum | Proje iskeleti (TS + Vite + Three.js), klasör yapısı, testler, CI | Web önizlemesi telefonda açılıyor |
| 1. Çekirdek | Kural motoru + testler, veri hattı script'i, 3D tahta, dokunmatik kontrol, bulmaca çözme akışı, temel animasyonlar | İlk 30 seviye baştan sona oynanabiliyor |
| 2. Oyun döngüsü | Harita, yıldızlar, altın, ipucu ve geri alma, seviye sonu ekranı, kayıt, günlük bulmaca | İlk dünya tamamen oynanabilir |
| 3. Ekonomi ve para kazanma | Kozmetik mağaza ve set sistemi, can sistemi (opsiyonel), IAdService (mock → test), UMP onayı, IAP iskeleti, ekonomi simülasyonu | Tüm reklam anları test reklamla çalışıyor |
| 4. Cila ve canlı servis | Tutorial, ses, mat sineması, analitik, Remote Config, Crashlytics, içerik paketi indirme, bulut kaydı | Test oyuncusuna verilebilir |
| 5. Yayın | Release AAB, ikon, mağaza görselleri ve metinleri, gizlilik politikası, Play Console dahili test | Dahili test kanalında yayında |

## 10. Çalışma kuralları

- Her aşamaya başlamadan önce kısa bir plan yaz ve onayımı al.
- Büyük teknik kararlarda (motor, paket, mimari) önce bana sor.
- Her aşama sonunda: testleri çalıştır, derle, ne yaptığını ve nasıl test edeceğimi 5–10 maddede özetle, git commit at.
- Aşama dışı özellik ekleme; fikirlerini `IDEAS.md` dosyasına yaz.
- Ben teknik olarak her detayı bilmiyorum; kurulum (Unity Hub, Android modülü, cihazda test) adımlarında beni adım adım yönlendir.
- Üçüncü taraf her asset ve kütüphanenin lisansını `LICENSES.md` dosyasında takip et.
- Bu dosyayı (`CHESS_BRIEF.md`) projenin kökünde tut ve kararlar değiştikçe güncelle.

---

**İlk görev:** Bu brifi oku, belirsiz gördüğün en önemli 3–5 noktayı bana sor, Unity ve Godot karşılaştırmasını tek tabloyla göster, sonra Aşama 0 ve Aşama 1 için planını çıkar.

---

## Karar günlüğü

| Tarih | Karar | Neden |
|---|---|---|
| 2026-10-03 | Unity yerine TypeScript + Three.js + Capacitor | Kullanıcının bilgisayarı ve Android cihazı yok; web önizlemesi her yerden test edilebiliyor. |
| 2026-10-03 | Kural motoru sıfırdan yazıldı | Lisans riski yok; perft testleriyle doğrulandı. |
| 2026-10-03 | Bulmacalar sıfırdan üretiliyor, dış veri yok | Kullanıcı isteği. Kendi motorumuzla üretim + doğrulama. |
| 2026-10-03 | Takılan oyuncuya bulmaca değiştirilmez; ipucu + reklam teklif edilir | Kullanıcı onayı. |
| 2026-10-03 | Son hamlede her mat doğru sayılır; ara hamlelerde tek çözüm | Varsayılan (kullanıcı itiraz etmedi). |
| 2026-10-03 | Paket adı geçici: `com.checkmatequest.app` | Şirket kurulumu sürüyor; Aşama 5'ten önce kesinleşecek. |

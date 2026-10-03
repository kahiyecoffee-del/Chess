// Bulut kaydı: önizleme sayfasının (claude.ai artifact) kişiye özel `db` alanı.
// Tarayıcı deposu (localStorage) bazı görüntüleyicilerde oturum kapanınca silinir; bu yüzden kayıt
// ayrıca buraya yazılır. Android sürümünde aynı arayüzün arkasına Google Play Games kaydı gelecek.
// Kullanılamıyorsa (giriş yok, başka bir sunucu, geliştirme ortamı) sessizce devre dışı kalır.

type DocRef = {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
};
type ClaudeRuntime = { use(name: string): Promise<unknown> };

export class CloudSave {
  private ref: DocRef | null = null;
  private writing = false;
  private pending: Record<string, unknown> | null = null;
  private timer = 0;

  /** Bağlanır ve buluttaki kaydı döner (yoksa null). Hiçbir durumda hata fırlatmaz. */
  async connect(): Promise<Record<string, unknown> | null> {
    try {
      const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
      if (!runtime?.use) return null;
      const [db, user] = await Promise.all([runtime.use('db'), runtime.use('user')]) as [
        { doc(path: string): DocRef } | null, { id(): Promise<string | null> } | null,
      ];
      const id = db && user ? await user.id() : null;
      if (!db || !id) return null;
      this.ref = db.doc(`data/users/${id}/save`);
      const snap = await this.ref.get();
      const body = snap.exists ? snap.data() : undefined;
      return body && typeof body.save === 'object' ? (body.save as Record<string, unknown>) : null;
    } catch {
      this.ref = null;
      return null;
    }
  }

  get connected(): boolean {
    return this.ref !== null;
  }

  /** Kaydı yazar: art arda gelen değişiklikler birleştirilir, aynı anda tek yazma yapılır. */
  write(save: object, immediate = false): void {
    if (!this.ref) return;
    this.pending = { save: JSON.parse(JSON.stringify(save)) };
    clearTimeout(this.timer);
    if (immediate) void this.flush();
    else this.timer = window.setTimeout(() => void this.flush(), 800);
  }

  private async flush(): Promise<void> {
    if (!this.ref || this.writing || !this.pending) return;
    const body = this.pending;
    this.pending = null;
    this.writing = true;
    try {
      await this.ref.set(body);
    } catch {
      // Geçici hata: bir sonraki değişiklikte yeniden denenir. Yetki yoksa bulut kaydı kapanır.
    } finally {
      this.writing = false;
      if (this.pending) void this.flush();
    }
  }
}

import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: Array<{ id: string; score?: number; meta?: any }>;
}

const BOT_FALLBACK =
  "أنا مساعد المحتوى المحلي. أستطيع مساعدتك في الأنظمة واللوائح، نسب المحتوى المحلي، الشهادات، ومتطلبات العقود حسب هيئة المحتوى المحلي والمشتريات الحكومية.";

const SUGGESTED_QA: Array<{ q: string; a: string }> = [
  {
    q: "ما هي عناصر المحتوى المحلي؟",
    a: `المحتوى المحلي هو إجمالي الإنفاق داخل المملكة عبر العناصر الآتية:
- **الأصول**
- **القوى العاملة**
- **السلع والخدمات**
- **التقنية ونحوها**`,
  },
  {
    q: "ما المشاريع غير عالية القيمة وعالية القيمة؟",
    a: `**غير عالية القيمة:** أقل من **25 مليون ريال**.  
**عالية القيمة:** **25 مليون ريال** فأكثر.`,
  },
  {
    q: "ما هي آليات المحتوى المحلي في المشاريع الحكومية؟",
    a: `- **القائمة الإلزامية**
- **التفضيل السعري للمنتج الوطني** (لمشاريع التوريد/المختلطة غير عالية القيمة، ويمكن تطبيقها في العالية بالتنسيق مع الهيئة)
- **تفضيل المنشآت الصغيرة والمتوسطة** (مشاريع الخدمات وغير عالية القيمة)
- **وزن المحتوى المحلي في التقييم المالي**
- **الحد الأدنى المطلوب للمحتوى المحلي**`,
  },
  {
    q: "ما هي آلية القائمة الإلزامية ومتى تُطبق؟",
    a: `قائمة دورية بالمنتجات الوطنية تصدرها هيئة المحتوى المحلي، وتُطبق بحسب نشاط المنافسة على القطاعات المشمولة في القائمة مهما كانت قيمة المشروع.`,
  },
  {
    q: "ما هي آلية التفضيل السعري ومتى تُطبق؟ وما المعادلة؟",
    a: `تُطبق لمشاريع **التوريد/المختلطة غير عالية القيمة**، ويمكن تطبيقها للعالية بالتنسيق مع الهيئة. تُمنَح المنتجات الوطنية أفضلية **10%**.

**المعادلة:**
قيمة العرض المعدلة = سعر العرض + 10% × سعر العرض × (1 − حصة المنتجات الوطنية)

- **سعر العرض:** قيمة المنتجات غير المدرجة في القائمة الإلزامية (وتُضاف المدرجة لاحقًا بعد احتسابها).
- **حصة المنتجات الوطنية:** نسبة المنتجات الوطنية المتعهد بها (لا تشمل منتجات القائمة الإلزامية).`,
  },
  {
    q: "ما هي آلية وزن المحتوى المحلي في التقييم المالي؟",
    a: `تُطبق في العقود **العالية القيمة** (عدا التوريد) بالتنسيق مع الهيئة.

**الأوزان:** 40% للمحتوى المحلي + 60% للسعر.

**الصيغة العامة للتقييم المالي:**
التقييم المالي = (سعر أقل عرض متأهل فنيًا ÷ سعر عرض المتنافس) × 60% + (مكوّن المحتوى المحلي وفق النسب المحددة) × 40%

**المتابعة:** يُتابَع التنفيذ عبر تقارير دورية مُدقَّقة ومعتمدة.`,
  },
  {
    q: "ما هي آلية الحد الأدنى المطلوب ومتى تُطبق؟",
    a: `تُطبق في العقود العالية القيمة (عدا التوريد) التي تحددها الهيئة مع الجهة بعد دراسة وتحديد حد أدنى مطلوب.

يبقى الوزن في التقييم المالي **40% محتوى محلي + 60% سعر**.

**المتابعة:** تقارير دورية مُدقَّقة ومعتمدة.`,
  },
  {
    q: "كيف تتم متابعة بنود القائمة الإلزامية أثناء التنفيذ؟",
    a: `- التنويه بشروط التسليم في خطاب الترسية.
- تضمين شروط وأحكام القائمة في العقد.
- متابعة المقاول وتسليم الشهادات الثبوتية (**سابر/إقرار خطي/دلالة المنشأ**) مع مستندات داعمة.
- تسليم التقرير النهائي للجنة الإشراف والتنسيق مع فريق تنمية المحتوى المحلي للتحقق.`,
  },
  {
    q: "ما المقصود بالرموز الإنشائية للبنود ذات القائمة الإلزامية؟",
    a: `رموز استرشادية تُبيّن وجود منتجات/مصانع وطنية، وتُلزم المقاول/المورد بتوريد منتجات وطنية في تلك البنود.`,
  },
  {
    q: "ما آلية تفضيل المنشآت الصغيرة والمتوسطة؟",
    a: `تفضيل سعري للمنشآت المحلية (حسب تصنيف **منشآت**) التي يملك المواطنون ≥ **50%** من رأس مالها، في جميع العقود **عدا التوريد**، بافتراض عروض الآخرين أعلى **10%** مما هو مذكور في العرض.`,
  },
  {
    q: "ما هي الخطة التدرجية ومتى تُقدّم؟",
    a: `خطة إلزامية في العقود العالية القيمة توضّح كيف يحقق المتعاقد نسبة المحتوى المحلي تدريجيًا خلال مدة العقد.
- تُقدَّم خلال **60 يومًا** بعد الترسية.
- إذا كانت مدة العقد أقل من سنة فلا تُطلب خطة تدرجية.`,
  },
  {
    q: "ما الغرامات والعقوبات عند عدم الالتزام؟",
    a: `تُطبق وفق باب الغرامات والأحكام الختامية بلائحة تفضيل المحتوى المحلي والمنشآت الصغيرة والمتوسطة والشركات المدرجة (**قرار مجلس الوزراء رقم 245**).`,
  },
  {
    q: "كيف يُثبت أنّ المنتجات وطنية الصنع؟",
    a: `عبر أحد/عدة المستندات:
- **شهادة سابر**
- **إقرار خطي من المصنع**
- **دلالة المنشأ**
- **شهادة المحتوى المحلي للمصنع**`,
  },
  { q: "ما هو خط الأساس؟", a: `هو نسبة المحتوى المحلي لدى منشأة المتنافس وقت تقديم العرض.` },
  {
    q: "كيف أحصل على قائمة المدققين المعتمدين لدى الهيئة؟",
    a: `عبر قياس المحتوى المحلي على موقع الهيئة، والاطلاع على مكاتب المراجعة المعتمدة.`,
  },
  {
    q: "ما التقارير المطلوبة عند تطبيق التفضيل السعري؟",
    a: `- **تقرير نهائي** خلال 30 يومًا من نهاية العقد يثبت وطنية المنتجات ويبيّن حصة المنتجات الوطنية الفعلية.
- تقارير الهيئة ذات العلاقة حسب آخر تعليمات الهيئة.`,
  },
  {
    q: "ما آلية الاستثناء من القائمة الإلزامية؟",
    a: `يتقدم المتعاقد بطلب استثناء، ويُقبل/يُرفض وفق ضوابط الاستثناء الصادرة من الهيئة.`,
  },
  {
    q: "ما هي شهادة المحتوى المحلي؟ وما فائدتها؟",
    a: `**الشهادة:** تصدرها هيئة المحتوى المحلي وتوضح نسبة المحتوى المحلي المعتمدة لدى المنشأة.  
**الفائدة:** تساعد على استيفاء متطلبات المحتوى المحلي ورفع النسبة.`,
  },
  {
    q: "كيف يُحسب خط الأساس (مكوّناته)؟",
    a: `يعتمد على:
- الإنفاق على الرواتب
- الإنفاق على السلع والخدمات
- الإنفاق على تدريب السعوديين
- الإنفاق على تطوير المورّدين
- الإنفاق على الأبحاث والتطوير
- إهلاك الأصول`,
  },
  { q: "ما مدة صلاحية شهادة المحتوى المحلي؟", a: `مدة الصلاحية **19 شهرًا**.` },
];

const RAG_BASE = import.meta.env.VITE_RAG_BASE?.toString();

if (!RAG_BASE) {
  throw new Error("VITE_RAG_BASE is missing. Set it in Vercel Environment Variables and redeploy.");
}

const toText = (v: any) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

const readErrorText = async (res: Response) => {
  const raw = await res.text().catch(() => "");
  if (!raw) return `HTTP ${res.status}`;
  try {
    const j = JSON.parse(raw);
    const candidate = j?.detail ?? j?.error ?? j?.message ?? j ?? raw;
    return toText(candidate) || `HTTP ${res.status}`;
  } catch {
    return raw || `HTTP ${res.status}`;
  }
};

const safeErrorMessage = (e: any) => {
  if (!e) return "خطأ غير معروف";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || "خطأ غير معروف";
  if (e?.message) return String(e.message);
  return toText(e) || "خطأ غير معروف";
};

function normalizeForApi(msgs: Message[]): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const m of msgs) {
    const role = (m.isUser ? "user" : "assistant") as "user" | "assistant";
    const content = (m.text ?? "").toString().trim();
    if (!content) continue;

    const last = out[out.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n\n${content}`.trim();
    else out.push({ role, content });
  }

  while (out.length && out[0].role !== "user") out.shift();
  return out.length ? out : [{ role: "user", content: "مرحبًا" }];
}

function splitToWordTokens(text: string): string[] {
  const tokens = text.split(/(\s+)/);
  return tokens.filter((t) => t.length > 0);
}

/** ========= فلتر المدخلات ========= */
const ARABIC_RE = /[\u0600-\u06FF]/;
const ENGLISH_RE = /[A-Za-z]/;

function normalizeTextForChecks(s: string) {
  return (s ?? "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .toLowerCase();
}

function isMostlyEnglish(text: string) {
  const t = text ?? "";
  const letters = t.match(/[A-Za-z\u0600-\u06FF]/g) || [];
  const eng = (t.match(/[A-Za-z]/g) || []).length;
  if (letters.length === 0) return false;
  return eng / letters.length >= 0.6;
}

function isGibberish(text: string) {
  const t = normalizeTextForChecks(text);
  if (!t) return true;
  if (t.length < 3) return true;

  const noSpace = t.replace(/\s/g, "");
  if (/(.)\1{5,}/.test(noSpace)) return true;

  const unique = new Set(noSpace.split(""));
  if (noSpace.length >= 12 && unique.size <= 4) return true;

  const parts = t.split(" ").filter(Boolean);
  if (parts.length >= 4) {
    const short = parts.filter((w) => w.length <= 2).length;
    if (short / parts.length >= 0.7) return true;
  }

  return false;
}

// فلتر “خارج المجال” أخف: ما يمنع الأسئلة العربية القصيرة جدًا
const DOMAIN_HINTS = [
  "المحتوى",
  "محلي",
  "هيئة",
  "lcgpa",
  "الترسية",
  "القائمة",
  "الإلزامية",
  "التفضيل",
  "السعري",
  "شهادة",
  "سابر",
  "منشآت",
  "العقود",
  "مشتريات",
  "حصة",
  "نسبة",
  "منتج",
  "وطني",
  "منافسة",
  "تقييم",
  "مالي",
  "القيمة",
  "خط",
  "الأساس",
  "حد",
  "أدنى",
  "الغرامات",
];

function looksOutOfDomain(text: string) {
  const t = normalizeTextForChecks(text);
  if (!t) return true;

  const hasArabic = ARABIC_RE.test(text);
  const hasEnglish = ENGLISH_RE.test(text);

  // إنجليزي بحت = خارج المجال
  if (!hasArabic && hasEnglish) return true;

  // إذا عربي قصير جدًا، لا نحكم عليه خارج المجال (خليه يروح للـRAG)
  if (hasArabic && t.length <= 10) return false;

  const hit = DOMAIN_HINTS.some((k) => t.includes(k.toLowerCase()));
  return !hit;
}

const ChatGeneral = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: BOT_FALLBACK,
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [, setRagStatus] = useState<"checking" | "online" | "offline">("checking");
  const [, setRagInfo] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const latestMessagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  const QA_MAP = useMemo(() => Object.fromEntries(SUGGESTED_QA.map((x) => [x.q.trim(), x.a])), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${RAG_BASE}/api/health`, { method: "GET" });
        if (!res.ok) throw new Error(await readErrorText(res));
        const data = await res.json();
        if (cancelled) return;
        setRagStatus("online");
        setRagInfo(data);
      } catch {
        if (cancelled) return;
        setRagStatus("offline");
        setRagInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pushBotPending = (text: string) => {
    const id = Date.now() + Math.random();
    const botMessage: Message = { id, text, isUser: false, timestamp: new Date() };
    setMessages((prev) => [...prev, botMessage]);
    return id;
  };

  const updateMessage = (id: number, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch, timestamp: new Date() } : m)));
  };

  const callRag = async (allMessages: Message[]) => {
    const sanitized = allMessages.filter((m) => !(m.id === 1 && !m.isUser));
    const apiMessages = normalizeForApi(sanitized);

    const payload = {
      messages: apiMessages,
      k: 5,
      temperature: 0.2,
      max_tokens: 220,
    };

    const url = `${RAG_BASE}/api/rag/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await readErrorText(res);
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json().catch(() => null);
    const text = data?.content;
    if (!text) throw new Error("رد غير متوقع من RAG (content غير موجود).");

    const sources = (data?.sources || []) as Message["sources"];
    return { text: text as string, sources };
  };

  const typewriteIntoMessage = async (messageId: number, fullText: string, sources?: Message["sources"]) => {
    const tokens = splitToWordTokens(fullText);
    let acc = "";

    const baseDelay = 60;
    const newlineExtra = 120;

    for (let i = 0; i < tokens.length; i++) {
      acc += tokens[i];

      if (i % 3 === 0 || i === tokens.length - 1) {
        updateMessage(messageId, { text: acc });
        const hasNewline = tokens[i].includes("\n");
        const delay = hasNewline ? baseDelay + newlineExtra : baseDelay;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    updateMessage(messageId, { text: fullText, sources });
  };

  const shouldFallback = (clean: string) => {
    if (isGibberish(clean)) return true;
    if (isMostlyEnglish(clean)) return true;
    if (looksOutOfDomain(clean)) return true;
    return false;
  };

  const sendQuestion = async (text: string) => {
    const clean = text.trim();
    if (!clean || isSending) return;

    const userMessage: Message = {
      id: Date.now(),
      text: clean,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // ✅ 1) أول شيء: لو السؤال من المقترحات أعطي جوابه فورًا (بدون فلترة)
    const instant = QA_MAP[clean];
    if (instant) {
      const id = Date.now() + Math.random();
      setMessages((prev) => [...prev, { id, text: "", isUser: false, timestamp: new Date() }]);
      await typewriteIntoMessage(id, instant);
      return;
    }

    // ✅ 2) بعدين نطبّق الفلترة على أي شيء غير المقترحات
    if (shouldFallback(clean)) {
      const id = Date.now() + Math.random();
      setMessages((prev) => [...prev, { id, text: "", isUser: false, timestamp: new Date() }]);
      await typewriteIntoMessage(id, BOT_FALLBACK);
      return;
    }

    const pendingId = pushBotPending("");

    try {
      setIsSending(true);

      const base = latestMessagesRef.current.filter((m) => !(m.id === 1 && !m.isUser));
      const contextMsgs = [...base, userMessage].slice(-12);

      const { text: answer, sources } = await callRag(contextMsgs);

      await typewriteIntoMessage(pendingId, answer || "لم يتم استلام رد.", sources);
    } catch (e: any) {
      const msg = safeErrorMessage(e);
      updateMessage(pendingId, { text: `حدث خطأ: ${msg}` });
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => sendQuestion(inputValue);

  return (
    <div className="h-dvh flex flex-col bg-background relative overflow-hidden">
      <style>{`
        .lc-scroll { direction: ltr; }
        .lc-scroll > * { direction: rtl; }

        .lc-scroll::-webkit-scrollbar { width: 10px; }
        .lc-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.12); border-radius: 999px; }
        .lc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.38); border-radius: 999px; }
        .lc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.58); }

        html, body { height: 100%; }
      `}</style>

      <div className="fixed inset-0 bg-gradient-to-br from-sky/10 via-background to-navy/10 pointer-events-none" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-sky/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      <header className="relative z-20 glass-card border-b border-sky/20 px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full hover:bg-sky/10">
          <ArrowRight className="w-5 h-5 text-navy" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg bg-white flex items-center justify-center">
            <img src="/bot.png" alt="Bot" className="w-full h-full object-contain" />
          </div>

          <div dir="rtl" className="flex flex-col">
            <h1 className="font-bold text-navy text-[28px]">مساعد المحتوى المحلي</h1>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <aside
          className="
            hidden lg:flex
            fixed right-0
            top-[80px]
            h-[calc(100dvh-80px)]
            w-[320px]
            flex-col
            bg-[#4a9c3f]
            text-white
            border-l border-white/20
            z-20
          "
        >
          <div className="p-6 border-b border-white/20" dir="rtl">
            <div className="text-2xl font-bold">الأسئلة المقترحة</div>
          </div>

          <div className="p-4 overflow-y-auto lc-scroll">
            <div className="flex flex-col gap-3">
              {SUGGESTED_QA.map((item) => (
                <button
                  key={item.q}
                  onClick={() => sendQuestion(item.q)}
                  className="text-right bg-white/15 hover:bg-white/25 transition rounded-xl px-4 py-4 leading-relaxed"
                >
                  {item.q}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex flex-col flex-1 overflow-hidden lg:pr-[320px]">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  dir="ltr"
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[60%] px-5 py-3 ${
                      message.isUser ? "rounded-2xl bg-[#b2e0b2] text-navy" : "chat-bubble-bot"
                    }`}
                  >
                    <div className="text-right leading-relaxed">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="my-2">{children}</p>,
                          ul: ({ children }) => (
                            <ul dir="rtl" className="my-2 list-disc list-inside space-y-1 text-right">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol dir="rtl" className="my-2 list-decimal list-inside space-y-1 text-right">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li className="my-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>

                    <span className="text-xs opacity-60 mt-2 block text-right">
                      {message.timestamp.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="glass-card border-t border-sky/20 p-4">
            <div className="max-w-5xl mx-auto flex gap-3" dir="rtl">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="اكتب رسالتك هنا..."
                  className="
                    w-full
                    !bg-[#f4fbf3]
                    !border
                    !border-[#4a9c3f]
                    !rounded-full
                    px-6
                    py-3
                    !text-[#1f3d1b]
                    placeholder:!text-[#4a9c3f]/60
                    focus:!outline-none
                    focus:!ring-2
                    focus:!ring-[#4a9c3f]/50
                    transition-all
                  "
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
                className="
                  w-12
                  h-12
                  !rounded-full
                  !bg-[#4a9c3f]
                  hover:!bg-[#3f8735]
                  !text-white
                  disabled:opacity-40
                "
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatGeneral;

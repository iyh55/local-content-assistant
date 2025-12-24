import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Landmark, Calculator, Plus, Trash2 } from "lucide-react";

/** ========= Types ========= */
type Mode = "menu" | "sme" | "national" | "highvalue" | "result";
type FormulaKey = "sme" | "national" | "highvalue";

type ResultRow = Record<string, string | number>;
type ResultPayload = {
  title: string;
  columns: string[];
  rows: ResultRow[];
  winnerText: string;
};

const GREEN = "#1b7b17";
const RED = "#dc2626";

/** ========= Helpers ========= */
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const roundInt = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

const Card = ({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="
      text-right w-full
      bg-white/70 hover:bg-white/90
      border border-[#1b7b17]/20
      rounded-2xl p-5
      shadow-sm
      transition
    "
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-xl font-bold text-navy">{title}</div>
        <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</div>
      </div>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1b7b17]/10 border border-[#1b7b17]/20"
        aria-hidden
      >
        <Calculator className="w-6 h-6" style={{ color: GREEN }} />
      </div>
    </div>
  </button>
);

const SectionTitle = ({ children }: { children: any }) => (
  <div className="text-right font-bold text-navy text-lg mb-3">{children}</div>
);

/** ========= Main Component ========= */
const ChatGeneral = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("menu");
  const [activeFormula, setActiveFormula] = useState<FormulaKey | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);

  /** =========================
   *  1) SME Preference
   *  من الملف: "معادلة التفضيل للمنشآت الصغيرة والمتوسطة"
   *  TECH_PASS_THRESHOLD = 70
   *  الكبير: effective_price = price*1.1
   * ========================= */
  const [smeWeights, setSmeWeights] = useState({ techPct: 40, finPct: 60 });
  const [smeCompetitors, setSmeCompetitors] = useState<Array<{ name: string; price: number; tech: number; isSME: boolean }>>([
    { name: "A", price: 100000, tech: 80, isSME: true },
    { name: "B", price: 95000, tech: 78, isSME: false },
  ]);

  /** =========================
   *  2) National Products Preference
   *  من الملف: "معادلة التفضيل السعري للمنتجات الوطنية"
   *  استبعاد فوري: عدم الالتزام بالبنود الإلزامية
   *  استبعاد فوري: tech < 70
   *  effective_price = ( (price - mandatory) * 1.10 ) * (1 - nat_share)
   *  award_price = effective_price + mandatory
   *  winner = الأقل award_price من المؤهلين
   * ========================= */
  const [natWeights, setNatWeights] = useState({ techPct: 40, finPct: 60 });
  const [mandatoryCount, setMandatoryCount] = useState(1);
  const [natCompetitors, setNatCompetitors] = useState<Array<{
    name: string;
    committed: boolean;
    tech: number;
    price: number;
    mandatoryPrice: number;
    foreignPrice: number;
    nationalPrice: number;
  }>>([
    {
      name: "A",
      committed: true,
      tech: 80,
      price: 100000,
      mandatoryPrice: 10000,
      foreignPrice: 30000,
      nationalPrice: 60000,
    },
    {
      name: "B",
      committed: true,
      tech: 75,
      price: 98000,
      mandatoryPrice: 8000,
      foreignPrice: 50000,
      nationalPrice: 30000,
    },
  ]);

  /** =========================
   *  3) High Value Projects
   *  من الملف: "معادلة المشاريع عالية القيمة..."
   *  weights ثابتة في الملف: fin=0.60 tech=0.40 local_multiplier=0.50 listed_points=0.05
   *  استبعاد: local_target == 0 أو tech_avg < min_tech_pass
   * ========================= */
  const [minTechPass, setMinTechPass] = useState(70);
  const [hvCompetitors, setHvCompetitors] = useState<Array<{
    name: string;
    price: number;
    techAvg: number;
    localTarget: number;
    baseline: number;
    listed: boolean;
  }>>([
    { name: "A", price: 100000, techAvg: 80, localTarget: 30, baseline: 10, listed: true },
    { name: "B", price: 95000, techAvg: 78, localTarget: 25, baseline: 0, listed: false },
  ]);

  /** ========= UI Actions ========= */
  const openFormula = (key: FormulaKey) => {
    setActiveFormula(key);
    setMode(key);
    setResult(null);
  };

  const backToMenu = () => {
    setMode("menu");
    setActiveFormula(null);
    setResult(null);
  };

  /** ========= Compute Functions ========= */
  const computeSME = () => {
    // مطابق للبايثون
    const TECH_PASS_THRESHOLD = 70.0;

    const weight_technical_percent = toNum(smeWeights.techPct);
    const weight_financial_percent = toNum(smeWeights.finPct);

    const w_tech = weight_technical_percent / 100.0;
    const w_fin = weight_financial_percent / 100.0;

    const total_w = weight_technical_percent + weight_financial_percent;

    // 1) تجهيز المنافسين (A, B, C...) + passed_technical + effective_price
    const competitors = smeCompetitors.map((c, i) => {
      const name = c.name || String.fromCharCode("A".charCodeAt(0) + i);

      const original_price = toNum(c.price);
      const tech_score = toNum(c.tech);
      const is_sme = !!c.isSME;

      const passed_technical = tech_score >= TECH_PASS_THRESHOLD;

      const effective_price = is_sme
        ? original_price
        : original_price * 1.1; // زيادة 10% للمنشأة الكبيرة

      return {
        name,
        original_price,
        tech_score,
        is_sme,
        passed_technical,
        effective_price,
        financial_raw: 0.0,
        financial_weighted: 0.0,
        technical_raw: 0.0,
        technical_weighted: 0.0,
        total_score: 0.0,
      };
    });

    const valid_competitors = competitors.filter((c) => c.passed_technical);

    if (valid_competitors.length === 0) {
      setResult({
        title: "نظام التقييم الموزون مع تفضيل المنشآت الصغيرة والمتوسطة",
        columns: ["الحالة"],
        rows: [{ الحالة: "⚠ لا يوجد أي منافس اجتاز الحد الأدنى الفني، لا يمكن إكمال التقييم." }],
        winnerText: "لا يوجد فائز",
      });
      setMode("result");
      return;
    }

    const min_effective_price = Math.min(...valid_competitors.map((c) => c.effective_price));
    const max_tech_score = Math.max(...valid_competitors.map((c) => c.tech_score));

    // 2) حساب الدرجات (مطابق للبايثون)
    for (const c of competitors) {
      if (!c.passed_technical) {
        c.financial_raw = 0.0;
        c.financial_weighted = 0.0;
        c.technical_raw = 0.0;
        c.technical_weighted = 0.0;
        c.total_score = 0.0;
        continue;
      }

      const financial_raw = (min_effective_price / c.effective_price) * 100.0;
      c.financial_raw = financial_raw;
      c.financial_weighted = financial_raw * w_fin;

      const technical_raw = (c.tech_score / max_tech_score) * 100.0;
      c.technical_raw = technical_raw;
      c.technical_weighted = technical_raw * w_tech;

      c.total_score = c.financial_weighted + c.technical_weighted;
    }

    // 3) ترتيب المنافسين
    const competitors_sorted = [...competitors].sort((a, b) => b.total_score - a.total_score);

    // 4) بناء الجدول بنفس أعمدة البايثون + int(round)
    const rows = competitors_sorted.map((c) => ({
      "المتنافس": c.name,
      "السعر المقدم": intRound(c.original_price),
      "متوسط التقييمات الفنية (100%)": intRound(c.tech_score),
      "شهادة المنشآت الصغيرة والمتوسطة (نسبة الاجتياز 70%)": c.is_sme ? "نعم" : "لا",
      "سعر العرض المالي المعدل": intRound(c.effective_price),
      "درجة التقييم المالي": intRound(c.financial_weighted),
      "درجة التقييم الفني": intRound(c.technical_weighted),
      "النسبة الموزونة النهائية": intRound(c.total_score),
    }));

    // 5) اعلان الفائز
    const winner = competitors_sorted[0];
    const winnerText = winner.passed_technical
      ? `🎯 الفائز هو المنافس ${winner.name} بمجموع نهائي = ${intRound(winner.total_score)}`
      : "⚠ أعلى نتيجة لمنافس غير مجتاز للحد الفني، راجعي البيانات/الشروط.";

    // 6) تنبيه مجموع الأوزان (مثل البايثون) — داخل صفحة النتائج عشان ما يأثر على الحساب
    const warn =
      Math.abs(total_w - 100.0) > 1e-6
        ? `⚠ تنبيه: مجموع الأوزان = ${total_w}٪ (يفترض أن يكون 100٪)`
        : "";

    setResult({
      title: "نظام التقييم الموزون مع تفضيل المنشآت الصغيرة والمتوسطة",
      columns: warn
        ? ["تنبيه", ...Object.keys(rows[0] ?? {})]
        : Object.keys(rows[0] ?? {}),
      rows: warn
        ? [{ تنبيه: warn, ...Object.fromEntries(Object.keys(rows[0] ?? {}).map((k) => [k, ""])) }, ...rows]
        : rows,
      winnerText,
    });

    setMode("result");
  };

  // مطابق لـ int(round()) في بايثون
  const intRound = (n: number) => Number.isFinite(n) ? Math.round(n) : 0;

  const computeNational = () => {
    const TECH_PASS = 70;

    const techPct = toNum(natWeights.techPct);
    const finPct = toNum(natWeights.finPct);
    const totalW = techPct + finPct;
    if (Math.abs(totalW - 100) > 1e-6) {
      setResult({
        title: "معادلة التفضيل السعري للمنتجات الوطنية",
        columns: ["تنبيه"],
        rows: [{ تنبيه: `❌ مجموع الأوزان = ${totalW}%، يجب أن يساوي 100%` }],
        winnerText: "لا يوجد فائز",
      });
      setMode("result");
      return;
    }

    const wTech = techPct / 100;
    const wFin = finPct / 100;

    // status + effective + award
    const computed = natCompetitors.map((c) => {
      if (!c.committed) {
        return {
          ...c,
          status: "مستبعد (غير قابل للتجزئة)",
          reason: `عدم الالتزام بالبنود الإلزامية (${mandatoryCount})`,
          natSharePct: 0,
          effective: 0,
          award: 0,
          finW: 0,
          techW: 0,
          total: 0,
        };
      }

      if (toNum(c.tech) < TECH_PASS) {
        return {
          ...c,
          status: "مستبعد (لم يجتز فنيًا)",
          reason: `أقل من ${TECH_PASS}%`,
          natSharePct: 0,
          effective: 0,
          award: 0,
          finW: 0,
          techW: 0,
          total: 0,
        };
      }

      const denom = toNum(c.nationalPrice) + toNum(c.foreignPrice);
      const natShare = denom === 0 ? 0 : toNum(c.nationalPrice) / denom;
      const natSharePct = natShare * 100;

      const competitive = toNum(c.price) - toNum(c.mandatoryPrice);
      if (competitive < 0) {
        return {
          ...c,
          status: "مستبعد",
          reason: "قيمة البنود الإلزامية أكبر من السعر المقدم",
          natSharePct,
          effective: 0,
          award: 0,
          finW: 0,
          techW: 0,
          total: 0,
        };
      }

      const effective = (competitive * 1.10) * (1 - natShare);
      const award = effective + toNum(c.mandatoryPrice);

      return {
        ...c,
        status: "مؤهل",
        reason: "مؤهل",
        natSharePct,
        effective,
        award,
        finW: 0,
        techW: 0,
        total: 0,
      };
    });

    const eligible = computed.filter((c) => c.status === "مؤهل");
    if (eligible.length === 0) {
      setResult({
        title: "معادلة التفضيل السعري للمنتجات الوطنية",
        columns: ["الحالة"],
        rows: [{ الحالة: "⚠ لا يوجد أي منافس مؤهل." }],
        winnerText: "لا يوجد فائز",
      });
      setMode("result");
      return;
    }

    const minEff = Math.min(...eligible.map((c) => toNum(c.effective)));
    const maxTech = Math.max(...eligible.map((c) => toNum(c.tech)));

    const scored = computed.map((c) => {
      if (c.status !== "مؤهل") return c;
      const finRaw = (minEff / toNum(c.effective)) * 100;
      const finW = finRaw * wFin;

      const techRaw = (toNum(c.tech) / maxTech) * 100;
      const techWv = techRaw * wTech;

      return { ...c, finW, techW: techWv, total: finW + techWv };
    });

    const winner = eligible.reduce((best, cur) =>
      toNum(cur.award) < toNum(best.award) ? cur : best
    );

    setResult({
      title: "معادلة التفضيل السعري للمنتجات الوطنية",
      columns: [
        "المتنافس",
        "الحالة",
        "سبب الاستبعاد/القبول",
        "السعر المقدم",
        "التقييم الفني",
        "قيمة البنود الإلزامية",
        "سعر المنتجات الأجنبية",
        "سعر المنتجات الوطنية",
        "حصة الوطنية (%)",
        "السعر المالي المعدل",
        "سعر الترسية النهائي",
        "درجة التقييم المالي",
        "درجة التقييم الفني",
        "النسبة الموزونة النهائية",
      ],
      rows: scored.map((c: any) => ({
        المتنافس: c.name,
        الحالة: c.status,
        "سبب الاستبعاد/القبول": c.reason,
        "السعر المقدم": roundInt(toNum(c.price)),
        "التقييم الفني": roundInt(toNum(c.tech)),
        "قيمة البنود الإلزامية": roundInt(toNum(c.mandatoryPrice)),
        "سعر المنتجات الأجنبية": roundInt(toNum(c.foreignPrice)),
        "سعر المنتجات الوطنية": roundInt(toNum(c.nationalPrice)),
        "حصة الوطنية (%)": roundInt(toNum(c.natSharePct)),
        "السعر المالي المعدل": roundInt(toNum(c.effective)),
        "سعر الترسية النهائي": roundInt(toNum(c.award)),
        "درجة التقييم المالي": roundInt(toNum(c.finW)),
        "درجة التقييم الفني": roundInt(toNum(c.techW)),
        "النسبة الموزونة النهائية": roundInt(toNum(c.total)),
      })),
      winnerText: `🏆 الفائز هو المنافس ${winner.name} لأنه الأقل في سعر الترسية النهائي = ${roundInt(
        toNum(winner.award)
      )}`,
    });
    setMode("result");
  };

  const computeHighValue = () => {
    // ثوابت من الملف
    const weight_financial = 0.60;
    const weight_technical = 0.40;
    const local_multiplier = 0.50;
    const listed_points = 0.05;

    const valid = hvCompetitors.map((c) => {
      const excluded = toNum(c.localTarget) === 0 || toNum(c.techAvg) < toNum(minTechPass);
      return { ...c, excluded };
    });

    const eligible = valid.filter((c) => !c.excluded);
    if (eligible.length === 0) {
      setResult({
        title: "معادلة المشاريع عالية القيمة",
        columns: ["الحالة"],
        rows: [{ الحالة: "❌ لا يوجد أي منافس مؤهل." }],
        winnerText: "لا يوجد فائز",
      });
      setMode("result");
      return;
    }

    const minPrice = Math.min(...eligible.map((c) => toNum(c.price)));
    const maxTech = Math.max(...eligible.map((c) => toNum(c.techAvg)));

    const scored = valid.map((c) => {
      if (c.excluded) {
        return { ...c, financial_score: 0, technical_score: 0, final_score: 0 };
      }

      const financial_weight = (minPrice / toNum(c.price)) * 100 * weight_financial;

      const local_score = toNum(c.localTarget) * local_multiplier;
      const baseline_score = toNum(c.baseline) === 0 ? 0 : toNum(c.baseline) * local_multiplier;
      const listed_score = c.listed ? listed_points : 0;

      const financial_score =
        financial_weight + (local_score + baseline_score + listed_score) * weight_technical;

      const technical_score = (toNum(c.techAvg) / maxTech) * 60;

      const final_score = financial_score * weight_technical + technical_score;

      return { ...c, financial_score, technical_score, final_score };
    });

    const sorted = [...scored].sort((a, b) => toNum(b.final_score) - toNum(a.final_score));
    const winner = sorted.find((c) => !c.excluded);

    setResult({
      title: "معادلة المشاريع عالية القيمة ومواءمتها مع المعادلة الموزونة",
      columns: [
        "المنافس",
        "السعر المقدم",
        "متوسط التقييم الفني",
        "درجة التقييم الفني",
        "درجة التقييم المالي",
        "النسبة الموزونة النهائية",
      ],
      rows: sorted.map((c) => ({
        المنافس: c.name,
        "السعر المقدم": round2(toNum(c.price)),
        "متوسط التقييم الفني": round2(toNum(c.techAvg)),
        "درجة التقييم الفني": round2(toNum((c as any).technical_score)),
        "درجة التقييم المالي": round2(toNum((c as any).financial_score)),
        "النسبة الموزونة النهائية": round2(toNum((c as any).final_score)),
      })),
      winnerText: winner
        ? `🏆 الفائز هو المنافس ${winner.name} بنسبة موزونة = ${round2(toNum((winner as any).final_score))}%`
        : "❌ لا يوجد فائز (كل المنافسين مستبعدين).",
    });
    setMode("result");
  };

  const compute = () => {
    if (activeFormula === "sme") computeSME();
    if (activeFormula === "national") computeNational();
    if (activeFormula === "highvalue") computeHighValue();
  };

  /** ========= UI Rows Editors ========= */
  const nextName = (arr: Array<{ name: string }>) => {
    const code = "A".charCodeAt(0) + arr.length;
    return String.fromCharCode(code);
  };

  const Table = useMemo(() => {
    if (!result) return null;
    return (
      <div className="bg-white/70 border border-[#1b7b17]/15 rounded-2xl p-4 overflow-auto">
        <div className="text-right font-bold text-navy text-lg">{result.title}</div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-[#1b7b17]/15">
                {result.columns.map((c) => (
                  <th key={c} className="py-2 px-3 text-right text-navy font-bold whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, idx) => (
                <tr key={idx} className="border-b border-[#1b7b17]/10">
                  {result.columns.map((col) => (
                    <td key={col} className="py-2 px-3 text-right whitespace-nowrap">
                      {String(row[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-right font-bold" style={{ color: GREEN }}>
          {result.winnerText}
        </div>
      </div>
    );
  }, [result]);

  return (
    <div className="h-dvh flex flex-col bg-background relative overflow-hidden">
      {/* خلفية ثابتة */}
      <div className="fixed inset-0 bg-gradient-to-br from-sky/10 via-background to-navy/10 pointer-events-none" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-sky/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 glass-card border-b border-sky/20 px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="rounded-full hover:bg-sky/10"
        >
          <ArrowRight className="w-5 h-5 text-navy" />
        </Button>

        <div className="flex items-center gap-3">
          {/* أيقونة الحاسبة */}
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg bg-white flex items-center justify-center">
            <img
              src="/calculator-riyal.png"
              alt="Calculator"
              className="w-7 h-7 object-contain"
              draggable={false}
            />
          </div>

          <div dir="rtl">
            <h1 className="font-bold text-navy text-[28px]">حاسبة معادلات المحتوى المحلي</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* MENU */}
          {mode === "menu" && (
            <div dir="rtl" className="space-y-4 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
              <div className="text-right text-muted-foreground w-full">
                اختر المعادلة ثم أدخل البيانات.
              </div>

              <div className="grid md:grid-cols-3 gap-4 w-full">
                <Card
                  title="معادلة تفضيل المنشآت الصغيرة والمتوسطة"
                  desc="زيادة 10% على سعر المنشآت الكبيرة (سعر معدل) + تقييم موزون فني/مالي"
                  onClick={() => openFormula("sme")}
                />
                <Card
                  title="معادلة التفضيل السعري للمنتجات الوطنية"
                  desc="استبعاد فوري + حساب حصة الوطنية + سعر ترسية نهائي"
                  onClick={() => openFormula("national")}
                />
                <Card
                  title="معادلة المشاريع عالية القيمة"
                  desc="مواءمة المحتوى المحلي مع التقييم الموزون (مع شرط اجتياز فني/محتوى محلي)"
                  onClick={() => openFormula("highvalue")}
                />
              </div>
            </div>
          )}

          {/* SME FORM */}
          {mode === "sme" && (
            <div dir="rtl" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>معادلة تفضيل المنشآت الصغيرة والمتوسطة</SectionTitle>
                <Button
                  variant="ghost"
                  onClick={backToMenu}
                  className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                >
                  رجوع
                </Button>
              </div>

              <div className="bg-white/70 border border-[#1b7b17]/15 rounded-2xl p-4 space-y-4">
                <SectionTitle>الأوزان</SectionTitle>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-right text-sm">
                    الوزن الفني (%)
                    <input
                      className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1b7b17]/25"
                      value={smeWeights.techPct}
                      onChange={(e) => setSmeWeights((p) => ({ ...p, techPct: toNum(e.target.value) }))}
                      type="number"
                    />
                  </label>
                  <label className="text-right text-sm">
                    الوزن المالي (%)
                    <input
                      className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1b7b17]/25"
                      value={smeWeights.finPct}
                      onChange={(e) => setSmeWeights((p) => ({ ...p, finPct: toNum(e.target.value) }))}
                      type="number"
                    />
                  </label>
                </div>

                <SectionTitle>المنافسون</SectionTitle>
                <div className="space-y-3">
                  {smeCompetitors.map((c, idx) => (
                    <div
                      key={idx}
                      className="border border-[#1b7b17]/10 rounded-2xl p-3 bg-white/60 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-right text-sm flex-1">
                          اسم المنافس
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="text"
                            value={c.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSmeCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                            }}
                          />
                        </label>

                        <Button
                          variant="ghost"
                          className="bg-white border border-[#1b7b17]/20 hover:bg-gray-50 mr-3"
                          onClick={() => setSmeCompetitors((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={smeCompetitors.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" style={{ color: RED }} />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <label className="text-right text-sm">
                          السعر المقدم
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.price}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setSmeCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, price: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          التقييم الفني (0-100)
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.tech}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setSmeCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, tech: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          شهادة SME؟
                          <select
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            value={c.isSME ? "yes" : "no"}
                            onChange={(e) => {
                              const v = e.target.value === "yes";
                              setSmeCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, isSME: v } : x)));
                            }}
                          >
                            <option value="yes">نعم</option>
                            <option value="no">لا</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setSmeCompetitors((prev) => [...prev, { name: nextName(prev), price: 0, tech: 0, isSME: false }])}
                      className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                    >
                      <Plus className="w-4 h-4 ml-2" style={{ color: GREEN }} />
                      إضافة منافس
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    onClick={compute}
                    className="bg-[#1b7b17] hover:bg-[#145e12] text-white rounded-xl px-6"
                  >
                    احسب النتائج
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* NATIONAL FORM */}
          {mode === "national" && (
            <div dir="rtl" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>معادلة التفضيل السعري للمنتجات الوطنية</SectionTitle>
                <Button
                  variant="ghost"
                  onClick={backToMenu}
                  className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                >
                  رجوع
                </Button>
              </div>

              <div className="bg-white/70 border border-[#1b7b17]/15 rounded-2xl p-4 space-y-4">
                <SectionTitle>الأوزان</SectionTitle>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-right text-sm">
                    الوزن الفني (%)
                    <input
                      className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-4 py-2"
                      value={natWeights.techPct}
                      onChange={(e) => setNatWeights((p) => ({ ...p, techPct: toNum(e.target.value) }))}
                      type="number"
                    />
                  </label>
                  <label className="text-right text-sm">
                    الوزن المالي (%)
                    <input
                      className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-4 py-2"
                      value={natWeights.finPct}
                      onChange={(e) => setNatWeights((p) => ({ ...p, finPct: toNum(e.target.value) }))}
                      type="number"
                    />
                  </label>
                </div>

                <SectionTitle>البنود الإلزامية</SectionTitle>
                <label className="text-right text-sm">
                  كم عدد البنود الإلزامية؟
                  <input
                    className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-4 py-2"
                    type="number"
                    value={mandatoryCount}
                    onChange={(e) => setMandatoryCount(toNum(e.target.value))}
                  />
                </label>

                <SectionTitle>المنافسون</SectionTitle>

                <div className="space-y-3">
                  {natCompetitors.map((c, idx) => (
                    <div
                      key={idx}
                      className="border border-[#1b7b17]/10 rounded-2xl p-3 bg-white/60 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-right text-sm flex-1">
                          اسم المنافس
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="text"
                            value={c.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setNatCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                            }}
                          />
                        </label>

                        <Button
                          variant="ghost"
                          className="bg-white border border-[#1b7b17]/20 hover:bg-gray-50 mr-3"
                          onClick={() => setNatCompetitors((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={natCompetitors.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" style={{ color: RED }} />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <label className="text-right text-sm">
                          ملتزم بالبنود الإلزامية؟
                          <select
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            value={c.committed ? "yes" : "no"}
                            onChange={(e) => {
                              const v = e.target.value === "yes";
                              setNatCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, committed: v } : x)));
                            }}
                          >
                            <option value="yes">نعم</option>
                            <option value="no">لا</option>
                          </select>
                        </label>

                        <label className="text-right text-sm">
                          التقييم الفني (0-100)
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.tech}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setNatCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, tech: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          السعر المقدم
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.price}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setNatCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, price: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          قيمة البنود الإلزامية
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.mandatoryPrice}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setNatCompetitors((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, mandatoryPrice: v } : x))
                              );
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          سعر المنتجات الأجنبية
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.foreignPrice}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setNatCompetitors((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, foreignPrice: v } : x))
                              );
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          سعر المنتجات الوطنية
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.nationalPrice}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setNatCompetitors((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, nationalPrice: v } : x))
                              );
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setNatCompetitors((prev) => [...prev, {
                        name: nextName(prev),
                        committed: true,
                        tech: 0,
                        price: 0,
                        mandatoryPrice: 0,
                        foreignPrice: 0,
                        nationalPrice: 0,
                      }])}
                      className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                    >
                      <Plus className="w-4 h-4 ml-2" style={{ color: GREEN }} />
                      إضافة منافس
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    onClick={compute}
                    className="bg-[#1b7b17] hover:bg-[#145e12] text-white rounded-xl px-6"
                  >
                    احسب النتائج
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* HIGH VALUE FORM */}
          {mode === "highvalue" && (
            <div dir="rtl" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>معادلة المشاريع عالية القيمة</SectionTitle>
                <Button
                  variant="ghost"
                  onClick={backToMenu}
                  className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                >
                  رجوع
                </Button>
              </div>

              <div className="bg-white/70 border border-[#1b7b17]/15 rounded-2xl p-4 space-y-4">
                <SectionTitle>شرط الاجتياز</SectionTitle>
                <label className="text-right text-sm">
                  الحد الأدنى للاجتياز الفني (70 أو 75)
                  <input
                    className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-4 py-2"
                    type="number"
                    value={minTechPass}
                    onChange={(e) => setMinTechPass(toNum(e.target.value))}
                  />
                </label>

                <SectionTitle>المنافسون</SectionTitle>
                <div className="space-y-3">
                  {hvCompetitors.map((c, idx) => (
                    <div
                      key={idx}
                      className="border border-[#1b7b17]/10 rounded-2xl p-3 bg-white/60 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-right text-sm flex-1">
                          اسم المنافس
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="text"
                            value={c.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setHvCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                            }}
                          />
                        </label>

                        <Button
                          variant="ghost"
                          className="bg-white border border-[#1b7b17]/20 hover:bg-gray-50 mr-3"
                          onClick={() => setHvCompetitors((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={hvCompetitors.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" style={{ color: RED }} />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <label className="text-right text-sm">
                          السعر المقدم
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.price}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setHvCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, price: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          متوسط التقييم الفني (%)
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.techAvg}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setHvCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, techAvg: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          نسبة المحتوى المحلي المستهدفة (%)
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.localTarget}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setHvCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, localTarget: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          نسبة خط الأساس (%)
                          <input
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            type="number"
                            value={c.baseline}
                            onChange={(e) => {
                              const v = toNum(e.target.value);
                              setHvCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, baseline: v } : x)));
                            }}
                          />
                        </label>

                        <label className="text-right text-sm">
                          الشركة مدرجة؟
                          <select
                            className="mt-2 w-full bg-white border border-[#1b7b17]/30 rounded-xl px-3 py-2"
                            value={c.listed ? "yes" : "no"}
                            onChange={(e) => {
                              const v = e.target.value === "yes";
                              setHvCompetitors((prev) => prev.map((x, i) => (i === idx ? { ...x, listed: v } : x)));
                            }}
                          >
                            <option value="yes">نعم</option>
                            <option value="no">لا</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setHvCompetitors((prev) => [...prev, {
                        name: nextName(prev),
                        price: 0,
                        techAvg: 0,
                        localTarget: 0,
                        baseline: 0,
                        listed: false,
                      }])}
                      className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                    >
                      <Plus className="w-4 h-4 ml-2" style={{ color: GREEN }} />
                      إضافة منافس
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    onClick={compute}
                    className="bg-[#1b7b17] hover:bg-[#145e12] text-white rounded-xl px-6"
                  >
                    احسب النتائج
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* RESULT */}
          {mode === "result" && (
            <div dir="rtl" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>النتائج</SectionTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMode(activeFormula || "menu");
                    }}
                    className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                  >
                    رجوع
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={backToMenu}
                    className="border border-[#1b7b17]/20 text-navy hover:bg-transparent active:bg-[#1b7b17]/20 active:text-[#1b7b17]"
                  >
                    القائمة الرئيسية
                  </Button>
                </div>
              </div>
              {Table}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatGeneral;
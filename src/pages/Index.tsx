import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// الشعار
import LocalContent from "../LocalContent.png";

const Index = () => {
  const navigate = useNavigate();
  const secondSectionRef = useRef<HTMLDivElement>(null);
  const [iconHovered, setIconHovered] = useState(false);

  return (
    <div className="min-h-[200vh]">
      {/* ================= صفحة الترحيب ================= */}
      <section className="min-h-screen flex flex-col items-center justify-start pt-14 relative overflow-hidden wave-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-sky/20 via-background to-navy/20" />

        {/* دوائر ديكورية */}
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full blur-3xl animate-pulse bg-[#e9f9e4]/80" />
        <div className="absolute bottom-32 left-10 w-96 h-96 rounded-full blur-3xl bg-[#c5e8b1]/60" />
        <div
          className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse bg-[#a3d78f]/50"
          style={{ animationDelay: "1s" }}
        />

        {/* الأمواج */}
        <div className="waves-container">
          <div className="wave" />
          <div className="wave" />
          <div className="wave" />
        </div>

        {/* المحتوى */}
        <div className="relative z-10 text-center px-6 animate-fade-in-up">
          {/* الشعار */}
          <div
            className={`mx-auto flex items-center justify-center transition-transform duration-300 ${
              iconHovered ? "scale-110" : ""
            } -translate-y-20`}
            onMouseEnter={() => setIconHovered(true)}
            onMouseLeave={() => setIconHovered(false)}
          >
            <img
              src={LocalContent}
              alt="مستشارك المحلي"
              className="w-[700px] h-[520px] object-contain drop-shadow-xl"
            />
          </div>

          {/* النص */}
          <div className="-translate-y-32">
            <p className="text-2xl md:text-3xl font-bold text-navy mb-2">
              مرجعك لفهم المحتوى المحلي والأنظمة
            </p>

            <p className="text-lg md:text-xl text-muted-foreground">
              هنا حيث تتحول القوانين إلى{" "}
              <span className="font-bold text-[#14452F]">
                قرارات موثوقة
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ================= صفحة الأسئلة ================= */}
      <section
        ref={secondSectionRef}
        className="min-h-screen flex items-center justify-center py-16 px-6 relative overflow-hidden"
      >
        {/* الخلفية */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/10 via-background to-sky/10" />

        {/* دوائر الخلفية */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-sky/20 rounded-full blur-3xl" />

        {/* المحتوى */}
        <div className="relative z-10 w-full max-w-5xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-navy">كيف يمكننا</span>{" "}
            <span className="text-[#1b7b17]">مساعدتك؟</span>
          </h2>

          <p className="text-muted-foreground mb-12">
            اختر نوع الاستفسار الذي تريد المساعدة فيه
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* ===== البطاقة الأولى ===== */}
            <div className="glass-card rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 border-t-4 border-t-[#1b7b17] flex flex-col h-full">
              {/* Header موحّد */}
              <div className="h-[120px] flex items-center justify-center mb-6">
                <img
                  src="/bot.png"
                  alt="مساعد المحتوى المحلي"
                  className="w-24 h-24 object-contain"
                />
              </div>

              <h3 className="text-2xl font-bold mb-4 text-navy">
                مساعد المحتوى المحلي
              </h3>

              <p className="text-muted-foreground mb-8">
                هل لديك أسئلة عامة حول المحتوى المحلي أو القوانين والأنظمة؟ نحن هنا للمساعدة.
              </p>

              <Button
                size="xl"
                className="w-full bg-[#1b7b17] hover:bg-[#145e12] text-white mt-auto"
                onClick={() => navigate("/chat/general")}
              >
                ابدأ المحادثة
              </Button>
            </div>

            {/* ===== البطاقة الثانية ===== */}
            <div className="glass-card rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 border-t-4 border-t-[#1b7b17] flex flex-col h-full">
              {/* Header موحّد */}
              <div className="h-[120px] flex items-center justify-center mb-6">
                <img
                  src="/calculator-riyal.png"
                  alt="حاسبة المحتوى المحلي"
                  className="w-24 h-24 object-contain transition-transform duration-300 hover:scale-110"
                />
              </div>

              <h3 className="text-2xl font-bold mb-4 text-navy">
                حاسبة المحتوى المحلي
              </h3>

              <p className="text-muted-foreground mb-8">
                تحتاج مساعدة في حساب متطلبات المحتوى المحلي للمنشآت، التفضيل السعري، والمشاريع عالية القيمة؟
              </p>

              <Button
                size="xl"
                className="w-full bg-[#1b7b17] hover:bg-[#145e12] text-white mt-auto"
                onClick={() => navigate("/chat/support")}
              >
                ابدأ الحساب
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
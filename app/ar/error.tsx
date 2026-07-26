"use client";

export default function ArabicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="global-state-page" dir="rtl"><p className="eyebrow">خطأ</p><h1>حدث خطأ غير متوقع.</h1><p>يرجى المحاولة مرة أخرى.</p><button className="primary-link" type="button" onClick={reset}>إعادة المحاولة</button></main>;
}

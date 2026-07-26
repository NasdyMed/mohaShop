import Link from "next/link";

export default function ArabicNotFound() {
  return <main className="global-state-page" dir="rtl"><p className="eyebrow">404</p><h1>الصفحة غير موجودة.</h1><p>ربما تم نقل هذه الصفحة أو لم تعد متاحة.</p><Link className="primary-link" href="/ar">العودة إلى المجموعة</Link></main>;
}

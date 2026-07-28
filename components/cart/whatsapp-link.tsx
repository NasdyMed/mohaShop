"use client";

import { useStorefrontI18n } from "@/components/shop/locale-provider";
import { WHATSAPP_URL } from "@/lib/store/contact";

export function WhatsAppLink() {
  const { locale } = useStorefrontI18n();
  const label = locale === "fr"
    ? "Discuter avec nous sur WhatsApp"
    : "تواصل معنا عبر واتساب";

  return (
    <a
      className="floating-whatsapp"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <svg aria-hidden="true" viewBox="0 0 32 32">
        <path d="M16.03 3.2A12.72 12.72 0 0 0 5.1 22.44L3.3 28.8l6.52-1.71a12.72 12.72 0 1 0 6.21-23.9Zm0 22.08c-1.98 0-3.82-.58-5.37-1.58l-.38-.24-3.87 1.02 1.03-3.77-.25-.39a9.38 9.38 0 1 1 8.84 4.96Zm5.14-7.02c-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.64.14-.19.28-.73.91-.9 1.1-.16.19-.33.21-.61.07-.28-.14-1.19-.44-2.26-1.4a8.45 8.45 0 0 1-1.56-1.94c-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.49.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.49-.07-.14-.64-1.54-.87-2.11-.23-.55-.47-.48-.64-.49h-.54c-.19 0-.49.07-.75.35-.26.28-.99.96-.99 2.35s1.01 2.73 1.15 2.92c.14.19 1.99 3.04 4.82 4.26.67.29 1.2.46 1.61.59.68.22 1.29.19 1.78.12.54-.08 1.66-.68 1.9-1.34.23-.65.23-1.22.16-1.34-.07-.11-.26-.18-.54-.32Z" />
      </svg>
    </a>
  );
}

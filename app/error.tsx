"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell error-page"><section className="error-card" aria-labelledby="error-title"><p className="eyebrow">Un imprévu est survenu</p><h1 id="error-title">Nous n’avons pas pu afficher cette page.</h1><p>Veuillez réessayer. Si le problème persiste, revenez à la collection.</p><button className="primary-link" type="button" onClick={reset}>Réessayer</button></section></main>;
}

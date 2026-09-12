import { imprint } from '../imprint.js';
import { useEffect } from 'react';

export default function Impressum() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Impressum · Common Ground';
    return () => { document.title = previous; };
  }, []);
  const complete = Boolean(imprint.name && imprint.street && imprint.postalCode && imprint.city && imprint.country && imprint.email);
  return <main className="imprint-page" lang="de">
    <a className="wordmark" href="/">common ground<span className="wordmark-period">.</span></a>
    <h1>Impressum</h1>
    <p>Angaben zum Anbieter von Common Ground gemäß <a href="https://www.gesetze-im-internet.de/ddg/__5.html">§ 5 Digitale-Dienste-Gesetz (DDG)</a>.</p>
    {(imprint.isDraft || !complete) && <p className="imprint-incomplete" role="status">Entwurf mit Platzhalterdaten – noch nicht zur Veröffentlichung bestimmt. Die Angaben zum Betreiber müssen vor einer Veröffentlichung ersetzt und vervollständigt werden.</p>}
    <section aria-labelledby="provider-title">
      <h2 id="provider-title">Anbieter</h2>
      <address>
        <strong>{imprint.name || 'Name des Betreibers: noch nicht angegeben'}</strong>
        {imprint.legalForm && <span>{imprint.legalForm}</span>}
        <span>{imprint.street || 'Straße und Hausnummer: noch nicht angegeben'}</span>
        <span>{[imprint.postalCode, imprint.city].filter(Boolean).join(' ') || 'Postleitzahl und Ort: noch nicht angegeben'}</span>
        <span>{imprint.country || 'Land: noch nicht angegeben'}</span>
      </address>
      {imprint.representative && <p>Vertreten durch: {imprint.representative}</p>}
    </section>
    <section aria-labelledby="contact-title">
      <h2 id="contact-title">Kontakt</h2>
      <p>E-Mail: {imprint.email ? <a href={`mailto:${imprint.email}`}>{imprint.email}</a> : 'noch nicht angegeben'}</p>
      {imprint.phone && <p>Telefon: <a href={`tel:${imprint.phone.replace(/[^+\d]/g, '')}`}>{imprint.phone}</a></p>}
    </section>
    {(imprint.register || imprint.registrationNumber) && <section aria-labelledby="register-title">
      <h2 id="register-title">Registereintrag</h2>
      <p>{imprint.register}</p><p>Registernummer: {imprint.registrationNumber}</p>
    </section>}
    {(imprint.vatId || imprint.businessId) && <section aria-labelledby="tax-title">
      <h2 id="tax-title">Identifikationsnummern</h2>
      {imprint.vatId && <p>Umsatzsteuer-Identifikationsnummer: {imprint.vatId}</p>}
      {imprint.businessId && <p>Wirtschafts-Identifikationsnummer: {imprint.businessId}</p>}
    </section>}
    <a className="btn" href="/">Zum Spiel</a>
  </main>;
}

import LegalLayout from './LegalLayout';

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <h2 className="font-semibold text-slate-800 mb-1">Angaben gemäß § 5 TMG</h2>
        <p>
          Marius Hosman
          <br />
          Eventtechnik Marius Hosman (Kleingewerbe)
          <br />
          Mörikstraße 9
          <br />
          73119 Zell unter Aichelberg
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">Kontakt</h2>
        <p>
          Telefon: 0157 5303 6817
          <br />
          E-Mail: info@hosman.events
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">Steuernummer</h2>
        <p>63237/12874</p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">Handelsregister</h2>
        <p>Es besteht keine Eintragung im Handelsregister.</p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p>
          Marius Hosman
          <br />
          Mörikstraße 9
          <br />
          73119 Zell unter Aichelberg
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben in diesem Impressum. Wir sind nicht bereit und nicht
          verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </LegalLayout>
  );
}

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

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
          allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch
          nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach
          Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur
          Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben
          hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis
          einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
          Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">Haftung für von Kunden hochgeladene Inhalte</h2>
        <p>
          Im Rahmen der angebotenen Software können Kunden eigene Inhalte (z.B. Bilder, Videos) hochladen
          und auf von ihnen betriebenen Anzeigegeräten wiedergeben. Für diese vom jeweiligen Kunden
          bereitgestellten Inhalte, insbesondere für deren Rechtmäßigkeit (u.a. Urheber-, Marken- und
          Persönlichkeitsrechte Dritter), ist ausschließlich der jeweilige Kunde als Hochladender
          verantwortlich. Eine inhaltliche Kontrolle der hochgeladenen Medien durch uns findet nicht
          statt. Wir werden rechtswidrige Inhalte nach Kenntniserlangung unverzüglich entfernen.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss
          haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die
          Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
          verantwortlich.
        </p>
      </section>
    </LegalLayout>
  );
}

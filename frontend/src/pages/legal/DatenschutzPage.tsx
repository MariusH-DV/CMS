import { ReactNode } from 'react';
import LegalLayout from './LegalLayout';

function Todo({ children }: { children: ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 text-xs">
      <span className="font-semibold">Bitte ergänzen:</span> {children}
    </div>
  );
}

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <p className="text-xs text-slate-400">
        Diese Erklärung ist ein Entwurf auf Basis der tatsächlich in dieser Software verarbeiteten Daten.
        Sie ersetzt keine rechtliche Prüfung - bitte vor der Veröffentlichung von einer fachkundigen Stelle
        gegenlesen lassen, insbesondere im Hinblick auf die unten markierten offenen Punkte.
      </p>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">1. Verantwortlicher</h2>
        <p>
          Marius Hosman
          <br />
          Eventtechnik Marius Hosman
          <br />
          Mörikstraße 9
          <br />
          73119 Zell unter Aichelberg
          <br />
          Telefon: 0157 5303 6817
          <br />
          E-Mail: info@hosman.events
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">2. Datenschutzbeauftragter</h2>
        <p>
          Nach § 38 BDSG ist ein Datenschutzbeauftragter nur zu bestellen, wenn in der Regel mindestens 20
          Personen ständig mit der automatisierten Verarbeitung personenbezogener Daten beschäftigt sind.
          Diese Voraussetzung liegt bei uns nicht vor, weshalb kein Datenschutzbeauftragter bestellt ist.
          Für Anliegen zum Datenschutz wenden Sie sich bitte direkt an den oben unter Ziffer 1 genannten
          Verantwortlichen.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">3. Hosting</h2>
        <p>
          Diese Anwendung wird auf einem bei der STRATO AG angemieteten Server betrieben. Der Server wird
          vollständig eigenverantwortlich durch den unter Ziffer 1 genannten Verantwortlichen über die
          Serververwaltungssoftware Plesk administriert - STRATO hat als reiner Infrastruktur-Anbieter
          keinen Zugriff auf die inhaltlichen Daten dieser Anwendung. Der Serverstandort liegt innerhalb
          der Europäischen Union, es findet keine Datenübermittlung in ein Drittland statt.
        </p>
        <Todo>
          Bitte die genaue Geschäftsanschrift der STRATO AG ergänzen (ich kenne sie nicht sicher genug,
          um sie hier fehlerfrei einzutragen) - zu finden z.B. im eigenen STRATO-Kundenkonto oder auf
          strato.de/impressum.
        </Todo>
        <p className="mt-2">
          Beim Aufruf dieser Anwendung erhebt der Server automatisch sogenannte Server-Logfiles, die Ihr
          Browser übermittelt. Dies sind: IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene Seite,
          übertragene Datenmenge, verwendeter Browser und Betriebssystem. Diese Daten dienen der
          technischen Bereitstellung und Absicherung des Betriebs und werden nicht mit anderen
          Datenquellen zusammengeführt.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">4. Auftragsverarbeitung</h2>
        <p>
          Obwohl STRATO keinen inhaltlichen Zugriff auf die Anwendung hat, gilt STRATO als
          Infrastruktur-Anbieter datenschutzrechtlich als Auftragsverarbeiter (Art. 28 DSGVO).
        </p>
        <Todo>
          Bitte prüfen, ob im STRATO-Kundenkonto bereits ein Auftragsverarbeitungsvertrag (AVV) mit STRATO
          abgeschlossen/akzeptiert wurde (die meisten deutschen Hoster bieten diesen als Standard-Dokument
          zum Akzeptieren im Kundenbereich an) - falls ja, hier kurz erwähnen ("Mit STRATO AG besteht ein
          Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO."), falls noch nicht geschehen, sollte er
          vor Veröffentlichung dieser Erklärung abgeschlossen werden.
        </Todo>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">5. Welche Daten diese Anwendung verarbeitet</h2>
        <p className="font-medium text-slate-800 mt-1">Benutzerkonten</p>
        <p>
          Bei der Anlage eines Benutzerkontos (durch den Betreiber oder einen Mandanten-Administrator)
          werden E-Mail-Adresse, Vor- und Nachname sowie ein verschlüsseltes (gehashtes) Passwort
          gespeichert. Diese Daten werden ausschließlich zur Anmeldung und Berechtigungsverwaltung
          innerhalb der Anwendung verwendet.
        </p>
        <p className="font-medium text-slate-800 mt-2">Anmeldung / Sitzung</p>
        <p>
          Nach der Anmeldung wird ein Sitzungs-Token (JWT) im lokalen Speicher (localStorage) Ihres
          Browsers abgelegt, um Sie während der Nutzung angemeldet zu halten. Es werden keine
          Tracking- oder Werbe-Cookies eingesetzt.
        </p>
        <p className="font-medium text-slate-800 mt-2">Raspberry-Pi-Player-Geräte</p>
        <p>
          Jedes registrierte Wiedergabegerät sendet in regelmäßigen Abständen einen technischen
          Statusbericht (u.a. IP-Adresse, Systemauslastung, Softwareversion) an den Server, damit der
          Betriebszustand in der Verwaltungsoberfläche angezeigt werden kann. Diese Daten beziehen sich
          auf das Gerät, nicht unmittelbar auf eine Person.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">6. Von Mandanten hochgeladene Medieninhalte</h2>
        <p>
          Mandanten (Kunden, die diese Software zur Digital-Signage-Verwaltung nutzen) können eigene
          Bild- und Videoinhalte hochladen und auf ihren Anzeigegeräten wiedergeben. Enthalten diese vom
          Mandanten bereitgestellten Inhalte personenbezogene Daten (z.B. Abbildungen von Personen), ist
          für deren Erhebung und die Rechtmäßigkeit ihrer Verwendung ausschließlich der jeweilige Mandant
          als datenschutzrechtlich Verantwortlicher im Sinne von Art. 4 Nr. 7 DSGVO zuständig. Wir stellen
          als technischer Dienstleister lediglich die Speicher- und Wiedergabeinfrastruktur bereit und
          nehmen keine inhaltliche Prüfung der hochgeladenen Medien vor.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">7. Speicherdauer</h2>
        <p>
          Personenbezogene Daten werden gespeichert, solange das jeweilige Benutzerkonto bzw. der
          jeweilige Mandant besteht. Nach Löschung eines Kontos oder Mandanten werden die zugehörigen
          Daten aus der produktiven Datenbank entfernt. Server-Logfiles werden nach einer angemessenen
          Frist automatisch gelöscht.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">8. Ihre Rechte</h2>
        <p>Sie haben jederzeit das Recht auf:</p>
        <ul className="list-disc list-inside">
          <li>Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p className="mt-2">
          Wenden Sie sich hierfür an die oben unter Ziffer 1 genannte Kontaktadresse.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-1">9. Beschwerderecht bei einer Aufsichtsbehörde</h2>
        <p>
          Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer
          personenbezogenen Daten zu beschweren, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts,
          Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
        </p>
      </section>
    </LegalLayout>
  );
}

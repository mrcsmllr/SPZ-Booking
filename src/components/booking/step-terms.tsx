"use client";

import { useState, type UIEvent } from "react";
import { useBookingStore } from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldCheck } from "lucide-react";

export function StepTerms() {
  const { data, updateData, nextStep, prevStep } = useBookingStore();
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const accepted = data.consentGiven || false;

  const handleTermsScroll = (event: UIEvent<HTMLDivElement>) => {
    if (hasScrolledToEnd) return;
    const container = event.currentTarget;
    const isAtBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 4;
    if (isAtBottom) {
      setHasScrolledToEnd(true);
    }
  };

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <ShieldCheck className="h-5 w-5 text-coral" />
          Allgemeine Geschaeftsbedingungen
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Bitte akzeptieren Sie die AGB, um mit Ihrer Buchung fortzufahren.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-landhaus-cream-dark bg-landhaus-cream/30 p-4 text-sm text-landhaus-brown-light/80">
          <p className="font-medium text-landhaus-brown">AGB</p>
          <div
            className="mt-2 max-h-80 overflow-y-auto pr-2"
            onScroll={handleTermsScroll}
          >
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
{`1. Geltungsbereich

1. Diese Allgemeinen Geschaeftsbedingungen, im Folgenden AGB, gelten fuer saemtliche Buchungen, Reservierungen und Bestellungen ueber die Buchungswebsite des Stadtparkzauber.
2. Anbieter und Vertragspartner ist:

J.L.B. Gaststaettenbetrieb GmbH
Otto-Wels-Strasse 2, 22303 Hamburg
Ramin Dibadj-Mitzlaff
info@landhaus-walter.de
+49 40 228 584 870

3. Diese AGB gelten gegenueber Verbrauchern im Sinne des 13 BGB sowie gegenueber Unternehmern im Sinne des 14 BGB.
4. Abweichende Bedingungen des Kunden gelten nur, wenn wir ihrer Geltung ausdruecklich in Textform zugestimmt haben.

2. Vertragsgegenstand

1. Ueber die Buchungswebsite koennen je nach Verfuegbarkeit insbesondere folgende Leistungen gebucht werden:
1. Eintritts- oder Zutrittsleistungen
2. Tisch- oder Flaechenreservierungen
3. Gruppenbuchungen
4. Verzehr- oder Leistungspakete
5. Zusatzleistungen

2. Der konkrete Leistungsumfang ergibt sich ausschliesslich aus der jeweiligen Leistungsbeschreibung im Buchungsprozess sowie aus der Buchungsbestaetigung.
3. Ein Anspruch auf einen bestimmten Tisch, Bereich, Standort oder eine bestimmte Platzierung besteht nur, wenn dies in der Buchungsbestaetigung ausdruecklich zugesagt wurde.

3. Vertragsschluss

1. Die Darstellung der Leistungen auf der Website stellt noch kein verbindliches Angebot dar, sondern eine Aufforderung zur Abgabe einer Buchung.
2. Mit Abschluss des Buchungsvorgangs und Anklicken des Buttons "zahlungspflichtig buchen" gibt der Kunde ein verbindliches Angebot zum Abschluss eines Vertrags ab.
3. Der Vertrag kommt zustande, sobald
1. der Buchungsvorgang erfolgreich abgeschlossen wurde,
2. die Zahlung erfolgreich autorisiert oder ausgefuehrt wurde, und
3. dem Kunden eine Buchungsbestaetigung per E-Mail zugeht.
4. Die automatisch versandte Eingangsbestaetigung stellt noch keine Annahme dar, sofern sie nicht ausdruecklich als Buchungsbestaetigung bezeichnet ist.
5. Kann eine Buchung aus Kapazitaets-, Sicherheits- oder Organisationsgruenden nicht angenommen werden, kommt kein Vertrag zustande. Bereits geleistete Zahlungen werden in diesem Fall unverzueglich erstattet.
6. Der Kunde ist verpflichtet, saemtliche im Buchungsprozess gemachten Angaben vollstaendig und korrekt zu machen.

4. Preise und Zahlung

1. Es gelten die im Buchungsprozess angegebenen Preise zum Zeitpunkt der Buchung.
2. Saemtliche Preise verstehen sich in Euro inklusive der gesetzlichen Umsatzsteuer, sofern nicht ausdruecklich anders angegeben.
3. Der Gesamtpreis wird vor Abschluss der Buchung im Checkout ausgewiesen.
4. Die Zahlung ist unmittelbar mit Vertragsschluss faellig und erfolgt ueber die im Buchungsprozess angebotenen Zahlungsmethoden.
5. Eine Buchung ist nur wirksam, wenn die Zahlung erfolgreich durchgefuehrt oder verbindlich autorisiert wurde.
6. Rueckbelastungskosten, die der Kunde zu vertreten hat, traegt der Kunde.

5. Kein Widerrufsrecht bei termingebundenen Freizeitleistungen

1. Soweit die gebuchte Leistung eine Dienstleistung im Zusammenhang mit Freizeitbetaetigungen betrifft und fuer die Leistungserbringung ein spezifischer Termin oder Zeitraum vorgesehen ist, besteht kein Widerrufsrecht.
2. Dies gilt insbesondere fuer Buchungen von Eintrittsleistungen, Reservierungen, Tischbuchungen, Gruppenpaketen und sonstigen Leistungen des Stadtparkzauber mit festem Veranstaltungsdatum oder festem Nutzungszeitraum.
3. Sofern im Einzelfall ausnahmsweise kein Ausschluss des Widerrufsrechts vorliegt, gelten die gesetzlichen Vorschriften.

6. Stornierung durch den Kunden

1. Eine Stornierung bedarf mindestens der Textform, zum Beispiel per E-Mail an stadtparkzauber@landhaus-walter.de
2. Massgeblich fuer die Berechnung der Stornierungsfrist ist der Zugang der Stornierung bei uns.
3. Im Falle einer Stornierung sind wir berechtigt, folgende pauschalierte Stornokosten zu berechnen:
1. bis 30 Kalendertage vor dem gebuchten Termin, kostenlos
2. bis 2 Wochen vor dem gebuchten Termin, 50 % des Gesamtpreises
3. ab 2 Wochen vor dem gebuchten Termin, 75 % des Gesamtpreises
4. Dem Kunden bleibt ausdruecklich der Nachweis vorbehalten, dass uns kein Schaden oder ein wesentlich geringerer Schaden entstanden ist.
5. Bereits gezahlte Betraege werden nach Abzug der geschuldeten Stornokosten auf das urspruenglich verwendete Zahlungsmittel zurueckerstattet.
6. Fuer individuell angefragte Sonderleistungen, bereits verbindlich bestellte Fremdleistungen oder kundenspezifische Leistungen koennen abweichende Stornobedingungen gelten, sofern diese dem Kunden vor Vertragsschluss ausdruecklich mitgeteilt wurden.

7. Umbuchung

1. Ein Anspruch auf Umbuchung besteht nicht.
2. Soweit organisatorisch und kapazitiv moeglich, koennen wir einer Umbuchung auf Kulanzbasis zustimmen.
3. Im Falle einer genehmigten Umbuchung koennen wir eine angemessene Umbuchungsgebuehr erheben. Alternativ kann die Umbuchung als Stornierung der urspruenglichen Buchung und Neubuchung behandelt werden.

8. Leistungen, Aenderungen, Witterung

1. Der Stadtparkzauber ist eine Veranstaltungsflaeche mit saisonalem Charakter. Geringfuegige Aenderungen im Ablauf, bei Oeffnungszeiten, Programmpunkten, Standangeboten, Zugaengen, Tischzuweisungen oder Flaechenzuordnungen bleiben vorbehalten, sofern sie sachlich gerechtfertigt und fuer den Kunden zumutbar sind.
2. Schlechtes Wetter allein begruendet keinen Anspruch auf kostenfreie Stornierung, Ruecktritt oder Erstattung, sofern die gebuchte Hauptleistung im Wesentlichen erbracht werden kann und die Durchfuehrung der Veranstaltung aus Sicherheitsgruenden zulaessig ist.
3. Notwendige Aenderungen aufgrund behoerdlicher Auflagen, Sicherheitsanforderungen, Gefahrenlagen oder organisatorischer Erfordernisse bleiben vorbehalten.

9. Absage, Unterbrechung, hoehere Gewalt

1. Muss eine gebuchte Leistung oder die Veranstaltung insgesamt aus Gruenden abgesagt, unterbrochen, beschraenkt oder verlegt werden, die wir nicht zu vertreten haben, insbesondere aufgrund hoeherer Gewalt, behoerdlicher Anordnung, Sicherheitslagen, Unwetter, technischer Stoerungen, Krankheit wesentlicher Leistungstraeger oder sonstiger unvorhersehbarer Umstaende, bemuehen wir uns um eine angemessene Loesung.
2. Bei ersatzloser Absage erstatten wir bereits gezahlte Entgelte fuer nicht erbrachte Leistungen.
3. Wird ein Ersatztermin angeboten, koennen wir bestimmen, dass die Buchung hierfuer fortgilt, sofern dies fuer den Kunden zumutbar ist. Ist der Ersatztermin fuer den Kunden unzumutbar, kann der Kunde innerhalb von 14 Tagen nach Mitteilung in Textform widersprechen. In diesem Fall erstatten wir bereits gezahlte Betraege fuer die betroffene Leistung.
4. Weitergehende Ansprueche des Kunden bestehen nur im Rahmen von Ziffer 11.

10. Zutritt, Verhalten, Hausrecht, Jugendschutz

1. Es gelten die vor Ort bekannt gemachten Sicherheits-, Haus- und Zutrittsregelungen.
2. Den Anweisungen des Personals, des Sicherheitsdienstes und der Veranstaltungsleitung ist Folge zu leisten.
3. Wir sind berechtigt, Kunden oder Begleitpersonen bei Vorliegen eines sachlichen Grundes vom Zutritt auszuschliessen oder von der Veranstaltung zu verweisen, insbesondere bei
1. Verstoss gegen gesetzliche Vorschriften, Hausregeln oder Sicherheitsanweisungen
2. aggressivem, diskriminierendem, belaestigendem oder erheblich stoerendem Verhalten
3. offensichtlicher starker Alkoholisierung oder Drogenbeeinflussung
4. Mitfuehren verbotener Gegenstaende
4. In diesen Faellen besteht kein Anspruch auf Erstattung, soweit der Ausschluss vom Kunden oder seinen Begleitpersonen zu vertreten ist.
5. Die Vorgaben des Jugendschutzrechts bleiben unberuehrt.

11. Haftung

1. Wir haften unbeschraenkt bei Vorsatz und grober Fahrlaessigkeit sowie bei Schaeden aus der Verletzung des Lebens, des Koerpers oder der Gesundheit.
2. Bei leicht fahrlaessiger Verletzung wesentlicher Vertragspflichten haften wir nur auf den vertragstypischen, vorhersehbaren Schaden.
3. Im Uebrigen ist unsere Haftung bei leichter Fahrlaessigkeit ausgeschlossen.
4. Soweit unsere Haftung ausgeschlossen oder beschraenkt ist, gilt dies auch zugunsten unserer gesetzlichen Vertreter, Mitarbeitenden, Erfuellungsgehilfen und sonstigen Beauftragten.
5. Fuer eingebrachte Gegenstaende des Kunden haften wir nur nach den gesetzlichen Vorschriften.

12. Datenverarbeitung

1. Wir verarbeiten personenbezogene Daten des Kunden ausschliesslich im Rahmen der geltenden Datenschutzbestimmungen.
2. Naehere Informationen zur Verarbeitung personenbezogener Daten, zu Zwecken, Rechtsgrundlagen, Empfaengern, Speicherdauern und Betroffenenrechten enthaelt unsere separate Datenschutzerklaerung auf der Website.

13. Streitbeilegung

1. Wir weisen darauf hin, dass die Europaeische Online-Streitbeilegungsplattform nicht mehr zur Verfuegung steht.
2. Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

14. Schlussbestimmungen

1. Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts, soweit dem keine zwingenden Verbraucherschutzvorschriften entgegenstehen.
2. Ist der Kunde Kaufmann, juristische Person des oeffentlichen Rechts oder oeffentlich-rechtliches Sondervermoegen, ist Gerichtsstand fuer alle Streitigkeiten aus diesem Vertragsverhaeltnis Hamburg.
3. Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt.`}
            </pre>
          </div>
          {!hasScrolledToEnd && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Hinweis: Bitte scrollen Sie einmal bis zum Ende der AGB. Erst danach
                  kann die Checkbox aktiviert werden.
                </span>
              </p>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            disabled={!hasScrolledToEnd}
            checked={accepted}
            onChange={(e) => updateData({ consentGiven: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-coral accent-coral focus:ring-coral"
          />
          <span className="text-sm text-landhaus-brown-light/80">
            Ich habe die AGB gelesen und akzeptiere diese.
          </span>
        </label>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => prevStep()}
            className="border-landhaus-cream-dark hover:bg-landhaus-cream"
          >
            Zurück
          </Button>
          <Button
            size="lg"
            disabled={!accepted}
            onClick={() => nextStep()}
            className="bg-coral hover:bg-coral-light"
          >
            Weiter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

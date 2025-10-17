
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { changelogData } from '@/lib/changelog-data';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BarChartHorizontal, Package, Wrench, ShoppingCart, ClipboardCheck, Users } from 'lucide-react';

const getBadgeVariant = (type: string) => {
  switch (type.toUpperCase()) {
    case 'NEU':
      return 'default';
    case 'VERBESSERT':
      return 'secondary';
    case 'BEHOBEN':
      return 'destructive';
    default:
      return 'outline';
  }
};

const GuideFAQItem = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <AccordionItem value={title}>
        <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-base text-left">{title}</h4>
            </div>
        </AccordionTrigger>
        <AccordionContent className="pl-16">
            <div className="prose prose-sm prose-p:text-muted-foreground max-w-none">
             {children}
            </div>
        </AccordionContent>
    </AccordionItem>
);


export default function ChangelogPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Willkommen!</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Ein Überblick über die App und alle neuen Funktionen.
          </p>
        </div>
        
        <Card className="mb-12 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl">Anleitung: Ein schneller Start</CardTitle>
                <CardDescription>Klicken Sie auf die einzelnen Bereiche, um mehr über deren Funktionen zu erfahren.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    <GuideFAQItem icon={BarChartHorizontal} title="Dashboard">
                        <p>Ihre zentrale Anlaufstelle. Hier sehen Sie auf einen Blick Artikel mit niedrigem Bestand, den Status Ihrer Maschinen und die letzten Aktivitäten im Lager.</p>
                        <ul>
                            <li><strong>Maschinenstatus:</strong> Sehen Sie sofort, welche Maschinen verliehen, reserviert oder in Reparatur sind.</li>
                            <li><strong>Lager-Kennzahlen:</strong> Überwachen Sie Artikel unter Mindestbestand, angeordnete Bestellungen und bereits bestellte Ware.</li>
                            Letzte Aktivitäten: Verfolgen Sie die jüngsten Lagerbewegungen in Echtzeit.
                        </ul>
                    </GuideFAQItem>
                    <GuideFAQItem icon={Package} title="Lagerbestand">
                         <p>Das Herzstück der App. Legen Sie neue Artikel an, verwalten Sie Bestände, Lieferanten und Lagerorte. Drucken Sie Etiketten mit QR-Codes für eine schnelle Erfassung.</p>
                        <ul>
                            <li><strong>Artikelverwaltung:</strong> Erstellen, bearbeiten und organisieren Sie all Ihre Lagerartikel. Fügen Sie Bilder, Barcodes und Lieferanteninformationen hinzu.</li>
                            <li><strong>Schnell-Buchung:</strong> Ändern Sie Bestände mit wenigen Klicks direkt in der Listenansicht.</li>
                            <li><strong>Etikettendruck:</strong> Erstellen und drucken Sie individuelle Etiketten mit QR-Codes und allen wichtigen Informationen.</li>
                        </ul>
                    </GuideFAQItem>
                    <GuideFAQItem icon={Wrench} title="Maschinen">
                        <p>Verwalten Sie Ihren Maschinen- und Werkzeugpark. Behalten Sie den Überblick, welche Maschine gerade verliehen ist, welche repariert wird oder für wann eine reserviert ist.</p>
                        <ul>
                            <li><strong>Verleih & Rückgabe:</strong> Erfassen Sie schnell und einfach per QR-Code-Scan, wer eine Maschine ausleiht und wann sie zurückkommt.</li>
                            <li><strong>Reservierungen:</strong> Planen Sie die Verfügbarkeit Ihrer Maschinen für zukünftige Projekte oder Baustellen.</li>
                            <li><strong>Wartung & Reparatur:</strong> Markieren Sie Maschinen als &quot;In Reparatur&quot;, um eine Ausleihe zu verhindern und den Überblick zu behalten.</li>
                        </ul>
                    </GuideFAQItem>
                     <GuideFAQItem icon={ShoppingCart} title="Bestellungen">
                        <p>Automatisieren Sie Ihren Bestellprozess. Artikel, die den Mindestbestand unterschreiten, erscheinen hier als Bestellvorschlag. Mit wenigen Klicks erstellen Sie eine Bestellliste oder markieren Artikel als bestellt.</p>
                        <ul>
                            <li><strong>Bestellvorschläge:</strong> Die App gruppiert automatisch Artikel, die nachbestellt werden müssen, nach Großhändler.</li>
                            <li><strong>Bestelllisten erstellen:</strong> Fassen Sie Vorschläge zu einer konkreten Bestellung zusammen und kopieren Sie die Liste für Ihre E-Mail oder Ihr Bestellportal.</li>
                            <li><strong>Status-Verfolgung:</strong> Markieren Sie Bestellungen als &quot;bestellt&quot; und buchen Sie den Wareneingang, sobald die Lieferung eintrifft.</li>
                        </ul>
                    </GuideFAQItem>
                    <GuideFAQItem icon={ClipboardCheck} title="Inventur">
                        <p>Führen Sie schnell und einfach Inventuren durch. Scannen Sie den QR-Code eines Artikels und geben Sie den gezählten Bestand ein. Die App schlägt Ihnen vor, welche Artikel als Nächstes gezählt werden sollten.</p>
                        <ul>
                            <li><strong>Scanner-Funktion:</strong> Nutzen Sie die Kamera Ihres Geräts, um Artikel per QR- oder Barcode zu erfassen.</li>
                            <li><strong>Inventur-Assistent:</strong> Die App sortiert Artikel so, dass diejenigen, deren letzte Zählung am längsten her ist, zuerst erscheinen.</li>
                            <li><strong>Bestenliste:</strong> Ein spielerisches Element, das anzeigt, wer im aktuellen Monat die meisten Artikel gezählt hat.</li>
                        </ul>
                    </GuideFAQItem>
                    <GuideFAQItem icon={Users} title="Benutzer & Einstellungen">
                         <p>Passen Sie die App an Ihre Bedürfnisse an. Unter <span className="font-semibold">Benutzer</span> legen Sie fest, wer Buchungen durchführen kann. Unter <span className="font-semibold">Einstellungen</span> können Sie Integrationen verwalten und die Navigation anpassen.</p>
                        <ul>
                            <li><strong>Benutzerverwaltung:</strong> Legen Sie fest, wer die App nutzen und Buchungen vornehmen kann.</li>
                            <li><strong>Navigationsmenü anpassen:</strong> Blenden Sie Menüpunkte aus, die Sie nicht benötigen, um die Oberfläche aufzuräumen.</li>
                            <li><strong>Integrationen:</strong> In Zukunft können Sie hier die App mit externen Diensten wie der IDS-Schnittstelle Ihres Großhändlers verbinden.</li>
                        </ul>
                    </GuideFAQItem>
                </Accordion>
            </CardContent>
        </Card>


        <div className="space-y-12">
          {changelogData.map((entry, index) => (
            <div key={index} className="relative">
              <div className="absolute left-0 top-0 h-full w-0.5 bg-border -translate-x-4 md:-translate-x-8"></div>
              <div className="relative pl-4 md:pl-8">
                <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-primary -translate-x-[17.5px] md:-translate-x-[33.5px]"></div>
                <p className="text-sm font-semibold text-primary">
                  {format(new Date(entry.date), 'dd. MMMM yyyy', { locale: de })}
                </p>
                <Card className="mt-2">
                  <CardHeader>
                    <CardTitle className="text-xl">{entry.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {entry.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-4">
                          <Badge
                            variant={getBadgeVariant(change.type)}
                            className="mt-1 flex-shrink-0"
                          >
                            {change.type}
                          </Badge>
                          <p className="text-muted-foreground">
                            {change.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

    
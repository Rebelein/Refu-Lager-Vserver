
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { YearlyInventoryExportRow } from '@/lib/types';
import Link from 'next/link';

export default function ExportPage() {
    const { getYearlyInventory, getAvailableYears } = useAppContext();
    const { toast } = useToast();
    const [selectedYear, setSelectedYear] = React.useState<string>(String(new Date().getFullYear()));
    const [availableYears, setAvailableYears] = React.useState<number[]>([]);

    React.useEffect(() => {
        const years = getAvailableYears();
        setAvailableYears(years);
        if (years.length > 0 && !years.includes(Number(selectedYear))) {
            setSelectedYear(String(years[0]));
        }
    }, [getAvailableYears, selectedYear]);

    const handleExport = () => {
        const year = Number(selectedYear);
        if (isNaN(year)) {
            toast({
                title: 'Ungültiges Jahr',
                description: 'Bitte wählen Sie ein gültiges Jahr für den Export aus.',
                variant: 'destructive',
            });
            return;
        }

        const data = getYearlyInventory(year);
        if (data.length === 0) {
            toast({
                title: 'Keine Daten gefunden',
                description: `Für das Jahr ${year} konnten keine Inventurdaten gefunden werden.`,
                variant: 'destructive',
            });
            return;
        }

        const csvContent = convertToCSV(data);
        downloadCSV(csvContent, `inventur_${year}.csv`);

        toast({
            title: 'Export erfolgreich',
            description: `Die Inventurdaten für das Jahr ${year} wurden heruntergeladen.`,
        });
    };

    const convertToCSV = (data: YearlyInventoryExportRow[]) => {
        const header = [
            'Artikel-ID',
            'Artikelname',
            'Hersteller-Artikelnummer',
            'Lagerplatz',
            'Fach',
            'Lagerort',
            'Bestand zum Jahresende'
        ];
        const rows = data.map(row => 
            [
                `"${row.itemId}"`,
                `"${row.itemName}"`,
                `"${row.itemNumber}"`,
                `"${row.mainLocation}"`,
                `"${row.subLocation}"`,
                `"${row.locationName}"`,
                row.endOfYearStock
            ].join(',')
        );
        return [header.join(','), ...rows].join('\n');
    };

    const downloadCSV = (content: string, fileName: string) => {
        const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Datenexport</CardTitle>
                    <CardDescription>
                        Exportieren Sie Ihre Inventurdaten als CSV-Datei für jährliche Rückblicke und externe Analysen. Für eine interaktive Analyse direkt in der App, besuchen Sie die <Link href="/analysis" className="text-primary underline">Analyse-Seite</Link>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Jahr wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.length > 0 ? (
                                availableYears.map(year => (
                                    <SelectItem key={year} value={String(year)}>
                                        {year}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value={selectedYear} disabled>
                                    {selectedYear}
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleExport} disabled={availableYears.length === 0}>
                        Jahresinventur exportieren
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

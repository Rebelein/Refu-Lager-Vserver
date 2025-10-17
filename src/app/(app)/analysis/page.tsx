
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisData } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function AnalysisPage() {
    const { getAvailableYears, getAnalysisData, locations } = useAppContext();
    const { toast } = useToast();
    
    const [availableYears, setAvailableYears] = React.useState<number[]>([]);
    const [yearA, setYearA] = React.useState<string>('');
    const [yearB, setYearB] = React.useState<string>('');
    const [selectedLocation, setSelectedLocation] = React.useState<string>('all');
    const [analysisDataA, setAnalysisDataA] = React.useState<AnalysisData | null>(null);
    const [analysisDataB, setAnalysisDataB] = React.useState<AnalysisData | null>(null);
    const [fastMoversCount, setFastMoversCount] = React.useState<number>(15);


    React.useEffect(() => {
        const years = getAvailableYears();
        setAvailableYears(years);
        if (years.length > 0) {
            setYearA(String(years[0]));
            if (years.length > 1) {
                setYearB(String(years[1]));
            } else {
                setYearB(String(years[0]));
            }
        }
    }, [getAvailableYears]);
    
    const handleAnalyze = () => {
        if (!yearA || !yearB) {
            toast({
                title: 'Bitte Jahre auswählen',
                description: 'Wählen Sie zwei Jahre aus, um die Analyse zu starten.',
                variant: 'destructive',
            });
            return;
        }
        setAnalysisDataA(getAnalysisData(Number(yearA), selectedLocation));
        setAnalysisDataB(getAnalysisData(Number(yearB), selectedLocation));
    };
    
    const combinedStockEvolution = React.useMemo(() => {
        if (!analysisDataA) return [];

        const evolutionMap = new Map(analysisDataA.stockEvolution.map(item => [item.itemId, { ...item, yearAChange: item.change, yearBChange: 0 }]));

        if (analysisDataB && yearA !== yearB) {
            analysisDataB.stockEvolution.forEach(itemB => {
                if (evolutionMap.has(itemB.itemId)) {
                    const existing = evolutionMap.get(itemB.itemId)!;
                    existing.yearBChange = itemB.change;
                } else {
                    evolutionMap.set(itemB.itemId, {
                        ...itemB,
                        yearAChange: 0,
                        yearBChange: itemB.change
                    });
                }
            });
        }
        return Array.from(evolutionMap.values()).sort((a,b) => Math.abs(b.yearAChange) - Math.abs(a.yearAChange));

    }, [analysisDataA, analysisDataB, yearA, yearB]);


    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Lager-Analyse</CardTitle>
                    <CardDescription>
                       Vergleichen Sie Lagerkennzahlen über verschiedene Jahre, um Trends zu erkennen und Ihr Lager zu optimieren.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
                     <Select value={yearA} onValueChange={setYearA}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Jahr A wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={`year-a-${year}`} value={String(year)}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={yearB} onValueChange={setYearB} disabled={availableYears.length < 2}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Jahr B wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                             {availableYears.filter(y => y !== Number(yearA)).map(year => (
                                <SelectItem key={`year-b-${year}`} value={String(year)}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Lagerort wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Lagerorte</SelectItem>
                            {locations.map(loc => (
                                <SelectItem key={loc.id} value={loc.id}>
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAnalyze} disabled={availableYears.length === 0}>
                        Analysieren
                    </Button>
                </CardContent>
            </Card>

            {analysisDataA && (
                 <Tabs defaultValue="evolution">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="evolution">Bestandsentwicklung</TabsTrigger>
                        <TabsTrigger value="fast-movers">Renner</TabsTrigger>
                        <TabsTrigger value="slow-movers">Penner</TabsTrigger>
                    </TabsList>
                    <TabsContent value="evolution">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Bestandsentwicklung</CardTitle>
                                <CardDescription>Vergleich der Bestandsänderungen zwischen den ausgewählten Jahren.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Artikel</TableHead>
                                            <TableHead className="text-right">Veränderung {yearA}</TableHead>
                                            {yearA !== yearB && <TableHead className="text-right">Veränderung {yearB}</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {combinedStockEvolution.slice(0, 15).map(item => (
                                            <TableRow key={item.itemId}>
                                                <TableCell>{item.itemName}</TableCell>
                                                <TableCell className="text-right">
                                                     <span className={cn('flex items-center justify-end', item.yearAChange > 0 ? 'text-green-600' : item.yearAChange < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                                                        {item.yearAChange > 0 ? <ArrowUp className="h-4 w-4 mr-1"/> : item.yearAChange < 0 ? <ArrowDown className="h-4 w-4 mr-1"/> : <Minus className="h-4 w-4 mr-1"/>}
                                                        {item.yearAChange}
                                                    </span>
                                                </TableCell>
                                                {yearA !== yearB && <TableCell className="text-right">
                                                     <span className={cn('flex items-center justify-end', item.yearBChange > 0 ? 'text-green-600' : item.yearBChange < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                                                        {item.yearBChange > 0 ? <ArrowUp className="h-4 w-4 mr-1"/> : item.yearBChange < 0 ? <ArrowDown className="h-4 w-4 mr-1"/> : <Minus className="h-4 w-4 mr-1"/>}
                                                        {item.yearBChange}
                                                    </span>
                                                </TableCell>}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="fast-movers">
                        <Card className="mt-4">
                             <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                                    <div>
                                        <CardTitle>Renner (Top {fastMoversCount})</CardTitle>
                                        <CardDescription>Die Artikel mit den meisten Abgängen im Jahr {yearA}.</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                                        <Label htmlFor="fast-movers-count" className="shrink-0">Anzahl anzeigen</Label>
                                        <Input
                                            id="fast-movers-count"
                                            type="number"
                                            value={fastMoversCount}
                                            onChange={(e) => setFastMoversCount(Number(e.target.value))}
                                            className="w-24"
                                            min="1"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Artikel</TableHead>
                                            <TableHead className="text-right">Abgänge</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisDataA.fastMovers.slice(0, fastMoversCount).map(item => (
                                            <TableRow key={item.itemId}>
                                                <TableCell>{item.itemName}</TableCell>
                                                <TableCell className="text-right">{item.turnover}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="slow-movers">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Penner</CardTitle>
                                <CardDescription>Artikel ohne jegliche Lagerbewegung im Jahr {yearA}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Artikel</TableHead>
                                            <TableHead>Lagerplatz</TableHead>
                                            <TableHead className="text-right">Aktueller Bestand</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisDataA.slowMovers.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.mainLocation} / {item.subLocation}</TableCell>
                                                <TableCell className="text-right">{item.stocks.reduce((acc, s) => acc + s.quantity, 0)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

            {!analysisDataA && (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">Wählen Sie bitte Jahre aus und klicken Sie auf &quot;Analysieren&quot;, um die Daten zu laden.</p>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
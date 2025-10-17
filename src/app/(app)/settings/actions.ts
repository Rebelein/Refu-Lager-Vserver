'use server';

// WICHTIG: Die zentrale 'ai' Instanz aus genkit.ts importieren
import { config } from 'dotenv';
config();
import { ai } from '@/ai/genkit'; 
import OpenAI from 'openai';

interface TestConnectionParams {
    provider: string;
    apiKey: string;
    model: string;
}

export async function testAiConnection(params: TestConnectionParams): Promise<{ success: boolean, error?: string }> {
    try {
        if (!params.model) {
            throw new Error("Kein Modell ausgewählt.");
        }
        if (!params.apiKey) {
            throw new Error("API-Schlüssel fehlt.");
        }
        
        if (params.provider === 'openrouter') {
            const openai = new OpenAI({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: params.apiKey,
                defaultHeaders: {
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://rebelein-lager.web.app', 
                    'X-Title': 'Rebelein Lager',
                },
            });
            await openai.chat.completions.create({
                model: params.model,
                messages: [{ role: 'user', content: 'Hallo' }],
                max_tokens: 5,
            });

        } else { // Für 'google'
            
            // KORREKTUR: Die manuelle Initialisierung von genkit wird entfernt.
            // Wir verwenden jetzt die zentrale 'ai' Instanz.
            
            let modelToUse = params.model;

            // KORREKTUR: Wir fügen den 'googleai/' Präfix hinzu, genau wie im analyze-item-flow.
            if (params.provider === 'google' && !modelToUse.startsWith('googleai/')) {
                modelToUse = `googleai/${modelToUse}`;
            }

            await ai.generate({
                model: modelToUse as any,
                prompt: 'Hallo',
                // KORREKTUR: Wir übergeben den API-Schlüssel über das 'config'-Objekt.
                config: {
                    apiKey: params.apiKey,
                    maxOutputTokens: 5,
                }
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Test connection failed:", error);
        let errorMessage = error.message || 'Ein unbekannter Fehler ist aufgetreten.';
        if (error.code) { // Handle specific API errors
            errorMessage = `Fehler: ${error.code} - ${error.message}`;
        }
        if (errorMessage.includes("API key not valid")) {
            errorMessage = "Der API-Schlüssel ist ungültig oder hat nicht die nötigen Berechtigungen."
        }
        return { success: false, error: errorMessage };
    }
}

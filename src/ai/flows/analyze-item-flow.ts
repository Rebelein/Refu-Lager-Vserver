
'use server';
/**
 * @fileOverview An AI flow to analyze an inventory item from a URL or an image.
 *
 * - analyzeItem - A function that handles the item analysis process.
 * - AnalyzeItemInput - The input type for the analyzeItem function.
 * - AnalyzeItemOutput - The return type for the analyzeItem function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';


const AnalyzeItemInputSchema = z.object({
  url: z.string().optional().describe("A URL to the product page of the wholesaler."),
  photoDataUri: z.string().optional().describe("A photo of the item as a data URI."),
  model: z.string().optional().describe("The specific AI model to use for this request."),
  apiKey: z.string().optional().describe("The API key for the selected provider."),
  provider: z.string().optional().describe("The AI provider ('google' or 'openrouter')."),
});
export type AnalyzeItemInput = z.infer<typeof AnalyzeItemInputSchema>;

const ManufacturerItemNumberSchema = z.object({
  number: z.string().describe("The article number itself."),
  manufacturer: z.string().optional().describe("The name of the manufacturer for this specific article number."),
});

const AnalyzeItemOutputSchema = z.object({
  name: z.string().describe("The name of the item."),
  manufacturerItemNumbers: z.array(ManufacturerItemNumberSchema).describe("A list of all found manufacturer's article numbers (Hersteller-Artikelnummer or Werksartikelnummer) and their corresponding manufacturer names. On sanitaer-heinze.com, there can be multiple 'Werksartikelnummer', each potentially with a different manufacturer name in parentheses next to it. You must extract all pairs."),
  wholesalerName: z.string().describe("The name of the wholesaler (e.g., 'GC-Gruppe', 'Pfeiffer & May', 'Reisser', 'Sanitär-Heinze')."),
  wholesalerItemNumber: z.string().describe("The wholesaler's own article number for the product. For 'Sanitär-Heinze', this is labeled 'Art-Nr.'. For other sites, it could be 'Großhändler-Artikelnummer' or similar."),
  barcode: z.string().optional().describe("The EAN barcode for the item, if available."),
});
export type AnalyzeItemOutput = z.infer<typeof AnalyzeItemOutputSchema>;

export async function analyzeItem(input: AnalyzeItemInput): Promise<AnalyzeItemOutput> {
  return analyzeItemFlow(input);
}

const analyzeItemFlow = ai.defineFlow(
  {
    name: 'analyzeItemFlow',
    inputSchema: AnalyzeItemInputSchema,
    outputSchema: AnalyzeItemOutputSchema,
  },
  async (input) => {
    
    const systemPrompt = `You are an expert in the German SHK (Sanitär, Heizung, Klima) industry. Your task is to analyze product information from a URL or an image and extract specific details with very high accuracy.

You must identify the following fields. If you cannot find a specific piece of information with certainty, you MUST return an empty string "" or an empty list [] for that field rather than guessing.

1.  **name**: The concise product name.
2.  **manufacturerItemNumbers**: A list of objects. Look for labels like "Hersteller-Artikelnummer" or "Werksartikelnummer". On websites like sanitaer-heinze.com, the section is labeled "Werksartikelnummer". You MUST extract ALL pairs of the number and the manufacturer's name in parentheses next to it (e.g., "12345 (Viega)"). For each pair, create a separate object in the list like \`{ "number": "12345", "manufacturer": "Viega" }\`. If there is no name in parentheses, the manufacturer field should be an empty string.
3.  **wholesalerName**: The name of the wholesaler. You must choose from this list: GC-Gruppe, Pfeiffer & May, Reisser, Sanitär-Heinze. If the URL is from "sanitaer-heinze.com" or the layout clearly labels the wholesaler number as "Art-Nr.", the wholesaler is "Sanitär-Heinze". If you cannot determine the wholesaler, respond with 'Unbekannt'.
4.  **wholesalerItemNumber**: The wholesaler's own article number for the product. For 'Sanitär-Heinze', this is labeled 'Art-Nr.'. For other sites, it could be 'Großhändler-Artikelnummer' or similar.
5.  **barcode**: The EAN number. On "sanitaer-heinze.com" this is labeled "EAN".
`;
    
    if (input.provider === 'openrouter' && input.apiKey && input.model) {
        const openAiClient = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: input.apiKey,
            defaultHeaders: {
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://rebelein-lager.web.app', 
                'X-Title': 'Rebelein Lager',
            },
        });
        
        const messages: any[] = [{ role: 'system', content: systemPrompt }];
        
        const content: any[] = [];
        if (input.url) {
            content.push({ type: 'text', text: `Analyze the content from this URL: ${input.url}` });
        }
        if (input.photoDataUri) {
            content.push({ type: 'image_url', image_url: { url: input.photoDataUri } });
        }
        
        messages.push({ role: 'user', content: content });
        
        try {
            const completion = await openAiClient.chat.completions.create({
                model: input.model,
                messages: messages,
                response_format: { type: 'json_object' },
            });

            const responseJson = completion.choices[0]?.message?.content;
            if (!responseJson) {
                throw new Error("AI did not return a valid response.");
            }

            try {
                const parsedOutput = JSON.parse(responseJson);
                // Temporary fix for schema mismatch where old models might still return manufacturerItemNumber
                if (parsedOutput.manufacturerItemNumber && !parsedOutput.manufacturerItemNumbers) {
                  parsedOutput.manufacturerItemNumbers = parsedOutput.manufacturerItemNumber.map((num: string) => ({ number: num, manufacturer: ''}));
                  delete parsedOutput.manufacturerItemNumber;
                }
                return AnalyzeItemOutputSchema.parse(parsedOutput);
            } catch (e) {
                console.error("Failed to parse OpenRouter JSON response:", e);
                throw new Error("Failed to parse AI response from OpenRouter.");
            }
        } catch (error: any) {
             if (error.message && (error.message.includes('No endpoints found that support image input') || error.status === 404)) {
                throw new Error('IMAGE_NOT_SUPPORTED');
            }
            throw error;
        }

    } else {
        const context: ({ text: string } | { media: { url: string } })[] = [];

        if (input.url) {
            context.push({ text: `Analyze the content from this URL: ${input.url}` });
        }

        if (input.photoDataUri) {
            context.push({ media: { url: input.photoDataUri } });
        }
        
        let modelToUse = input.model;
        if (!modelToUse) {
             throw new Error("Google AI model not specified.");
        }

        if (input.provider === 'google' && !modelToUse.startsWith('googleai/')) {
            modelToUse = `googleai/${modelToUse}`;
        }
        
        const { output } = await ai.generate({
          prompt: [
            {text: systemPrompt},
            ...context
          ],
          model: modelToUse as any,
          output: {
            schema: AnalyzeItemOutputSchema,
          },
          config: input.apiKey && input.provider === 'google' ? { apiKey: input.apiKey } : undefined
        });

        return output!;
    }
  }
);

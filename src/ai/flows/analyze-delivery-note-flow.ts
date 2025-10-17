
'use server';
/**
 * @fileOverview An AI flow to analyze a delivery note image and match it against an order.
 *
 * - analyzeDeliveryNote - A function that handles the delivery note analysis process.
 * - AnalyzeDeliveryNoteInput - The input type for the analyzeDeliveryNote function.
 * - AnalyzeDeliveryNoteOutput - The return type for the analyzeDeliveryNote function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';

const DeliveryNoteItemSchema = z.object({
  itemId: z.string().describe("The unique ID of the item from the original order."),
  itemName: z.string().describe("The name of the item from the original order."),
  itemNumber: z.string().describe("The manufacturer's article number from the original order."),
  wholesalerItemNumber: z.string().optional().describe("The wholesaler's article number from the original order."),
  orderedQuantity: z.number().describe("The quantity that was originally ordered."),
  deliveredQuantity: z.number().describe("The quantity that the AI found on the delivery note. This is the most important field to extract. Must be a number."),
  matchStatus: z.enum(['ok', 'partial', 'extra', 'missing']).describe("The status of the match. 'ok': delivered equals ordered. 'partial': delivered is less than ordered. 'extra': delivered is more than ordered. 'missing': item was not found on the delivery note at all.")
});

export type DeliveryNoteItem = z.infer<typeof DeliveryNoteItemSchema>;

const AnalyzeDeliveryNoteOutputSchema = z.object({
  orderNumber: z.string().optional().describe("The order number found on the delivery note. Can be labeled 'Bestell-Nr.', 'Kommission', etc."),
  matchedItems: z.array(DeliveryNoteItemSchema).describe("A list of all items from the original order, with their delivery status updated based on the analysis of the delivery note image."),
});
export type AnalyzeDeliveryNoteOutput = z.infer<typeof AnalyzeDeliveryNoteOutputSchema>;

// We can't use the OrderItem from lib/types directly in Zod as it has no schema.
// So we define a schema that matches its structure.
const OrderItemSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  itemNumber: z.string(),
  wholesalerItemNumber: z.string().optional(),
  quantity: z.number(),
  receivedQuantity: z.number(),
  status: z.enum(['pending', 'commissioned', 'received']),
  locationId: z.string(),
  // Added for the new flow
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  // Add a field for all known supplier numbers for this item
  allWholesalerItemNumbers: z.array(z.string()).optional().describe("A list of ALL known wholesaler item numbers for this product."),
});

const AnalyzeDeliveryNoteInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the delivery note as a data URI. The image may be partially blacked out for privacy."),
  orderItems: z.array(OrderItemSchema).describe("A list of ALL items from ALL open orders."),
  model: z.string().optional().describe("The specific AI model to use."),
  apiKey: z.string().optional().describe("The API key for the selected provider."),
  provider: z.string().optional().describe("The AI provider ('google' or 'openrouter')."),
});
export type AnalyzeDeliveryNoteInput = z.infer<typeof AnalyzeDeliveryNoteInputSchema>;


export async function analyzeDeliveryNote(input: AnalyzeDeliveryNoteInput): Promise<AnalyzeDeliveryNoteOutput> {
  return analyzeDeliveryNoteFlow(input);
}

const analyzeDeliveryNoteFlow = ai.defineFlow(
  {
    name: 'analyzeDeliveryNoteFlow',
    inputSchema: AnalyzeDeliveryNoteInputSchema,
    outputSchema: AnalyzeDeliveryNoteOutputSchema,
  },
  async (input) => {
    
    const systemPrompt = `You are an expert SHK (Sanitär, Heizung, Klima) warehouse assistant. Your task is to analyze a partially blacked-out image of a German delivery note ("Lieferschein") and match its contents against a list of expected items from an order. Focus ONLY on the visible areas.

You MUST follow these steps:
1.  Locate the order number on the delivery note. It can be labeled as "Ihre Kommission", "Bestell-Nr.", "Kommission", etc. This is the MOST IMPORTANT step. Return this number in the 'orderNumber' field.
2.  Based on the 'orderNumber' you found, filter the provided 'orderItems' list to only include items belonging to that specific order.
3.  For EACH item in the now-filtered list, find it on the delivery note. You can use the manufacturer article number (Hersteller-Artikelnummer) or ANY of the provided wholesaler item numbers (allWholesalerItemNumbers) or the item name (Bezeichnung) to match them. An item on the delivery note might have an article number from a different wholesaler than originally planned.
4.  For each matched item, extract the DELIVERED QUANTITY ("Menge"). This is the most critical piece of information.
5.  Construct the \`matchedItems\` array in the output. Every item from the filtered order list MUST be present in the output.
6.  Set the \`deliveredQuantity\` for each item. If an item from the order is NOT found on the delivery note, its \`deliveredQuantity\` MUST be 0.
7.  Set the \`matchStatus\` for each item based on comparing \`orderedQuantity\` and \`deliveredQuantity\`:
    - 'ok': If deliveredQuantity equals orderedQuantity.
    - 'partial': If deliveredQuantity is greater than 0 but less than orderedQuantity.
    - 'missing': If deliveredQuantity is 0.
    - 'extra': If deliveredQuantity is greater than orderedQuantity.

Here is the list of all items from all open orders:
{{#each orderItems}}
- From Order: {{orderNumber}}, Item ID: {{itemId}}, Name: "{{itemName}}", Manufacturer-Art.Nr: {{itemNumber}}, All Wholesaler-Art.Nr.: [{{#each allWholesalerItemNumbers}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}], Ordered: {{quantity}}
{{/each}}

Analyze the delivery note image and return the structured JSON with the results.
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
        
        const stringifiedOrderItems = input.orderItems.map(item => 
          `- From Order: ${item.orderNumber}, Item ID: ${item.itemId}, Name: "${item.itemName}", Manufacturer-Art.Nr: ${item.itemNumber}, All Wholesaler-Art.Nr.: [${(item.allWholesalerItemNumbers || []).join(', ')}], Ordered: ${item.quantity}`
        ).join('\n');

        const filledPrompt = `You are an expert SHK (Sanitär, Heizung, Klima) warehouse assistant. Your task is to analyze a partially blacked-out image of a German delivery note ("Lieferschein") and match its contents against a list of expected items from an order. Focus ONLY on the visible areas.

You MUST follow these steps:
1.  Locate the order number on the delivery note. It can be labeled as "Ihre Kommission", "Bestell-Nr.", "Kommission", etc. This is the MOST IMPORTANT step. Return this number in the 'orderNumber' field.
2.  Based on the 'orderNumber' you found, filter the provided 'orderItems' list to only include items belonging to that specific order.
3.  For EACH item in the now-filtered list, find it on the delivery note. You can use the manufacturer article number (Hersteller-Artikelnummer) or ANY of the provided wholesaler item numbers (allWholesalerItemNumbers) or the item name (Bezeichnung) to match them. An item on the delivery note might have an article number from a different wholesaler than originally planned.
4.  For each matched item, extract the DELIVERED QUANTITY ("Menge"). This is the most critical piece of information.
5.  Construct the \`matchedItems\` array in the output. Every item from the filtered order list MUST be present in the output.
6.  Set the \`deliveredQuantity\` for each item. If an item from the order is NOT found on the delivery note, its \`deliveredQuantity\` MUST be 0.
7.  Set the \`matchStatus\` for each item based on comparing \`orderedQuantity\` and \`deliveredQuantity\`:
    - 'ok': If deliveredQuantity equals orderedQuantity.
    - 'partial': If deliveredQuantity is greater than 0 but less than orderedQuantity.
    - 'missing': If deliveredQuantity is 0.
    - 'extra': If deliveredQuantity is greater than orderedQuantity.

Here is the list of all items from all open orders:
${stringifiedOrderItems}

Analyze the delivery note image and return the structured JSON with the results.
`;
        
        const messages: any[] = [
            { role: 'system', content: filledPrompt },
            { role: 'user', content: [
                { type: 'image_url', image_url: { url: input.photoDataUri } }
            ]}
        ];
        
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
                return AnalyzeDeliveryNoteOutputSchema.parse(parsedOutput);
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
            {media: { url: input.photoDataUri }}
          ],
          model: modelToUse as any,
          output: {
            schema: AnalyzeDeliveryNoteOutputSchema,
          },
          context: {
              orderItems: input.orderItems,
          },
          config: input.apiKey && input.provider === 'google' ? { apiKey: input.apiKey } : undefined
        });

        return output!;
    }
  }
);

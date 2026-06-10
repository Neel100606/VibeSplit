import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Controller to scan a receipt image using Google Gemini API.
 * Converts the uploaded image buffer, configures the Gemini client to return JSON,
 * runs the OCR parsing prompt, and returns the parsed array of items and prices.
 */
export const scanReceipt = async (req, res) => {
  try {
    // 1. Check if the API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('AI Error: GEMINI_API_KEY is not defined in the environment.');
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    // 2. Validation
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt image uploaded' });
    }

    // 3. Image Conversion (Convert buffer to base64 inline data structure)
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    // 4. Model Configuration
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    // 5. Prompt Engineering
    const systemPrompt = `You are an expert OCR receipt parser. Analyze the attached receipt image carefully. Extract all individual line items along with their respective final prices. Your output must strictly be a raw JSON array of objects, where each object contains exactly two keys: 'itemName' (string representing the item description) and 'itemPrice' (number representing the cost). Do not include any markdown formatting, no backticks (\`\`\`json), and no conversational introductory or concluding text. If an item cannot be clearly read, skip it.`;

    // 6. Execute AI Generation
    const result = await model.generateContent([systemPrompt, imagePart]);
    const response = await result.response;
    const responseText = response.text().trim();

    // 7. Response Processing & Error Handling for Parsing
    let parsedArray;
    try {
      parsedArray = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parsing of Gemini response failed:', parseError, '\nResponse text was:', responseText);
      return res.status(500).json({ error: 'Failed to parse AI receipt response into structured data.' });
    }

    if (!Array.isArray(parsedArray)) {
      console.error('Gemini response was not a JSON array:', parsedArray);
      return res.status(500).json({ error: 'AI receipt parsing did not return a valid list of items.' });
    }

    return res.json({ success: true, items: parsedArray });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return res.status(500).json({ error: 'Failed to process receipt image.' });
  }
};

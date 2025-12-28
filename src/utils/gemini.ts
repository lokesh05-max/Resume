import { GoogleGenerativeAI } from "@google/generative-ai";
const pdfjs = require('pdf-parse');

// Debug flag
const DEBUG = true;

// Initialize Gemini API
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('ERROR: Missing Gemini API key. Please set REACT_APP_GEMINI_API_KEY in your .env file');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash-latest",
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
  },
});

// Helper function for debug logging
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[Gemini]', ...args);
  }
};

export const analyzeResume = async (resumeText: string, jobDescription: string): Promise<string> => {
  try {
    debugLog('Starting resume analysis...');
    debugLog('Resume text length:', resumeText.length);
    debugLog('Job description length:', jobDescription.length);
    
    if (!resumeText || !jobDescription) {
      throw new Error('Resume text and job description are required');
    }

    if (resumeText.length < 10) {
      throw new Error(`Resume text is too short (${resumeText.length} characters)`);
    }

    if (jobDescription.length < 10) {
      throw new Error(`Job description is too short (${jobDescription.length} characters)`);
    }

    debugLog('Resume text length:', resumeText.length);
    debugLog('Job description length:', jobDescription.length);

    // Truncate if too long to avoid API limits
    const MAX_LENGTH = 30000; // Gemini's context window is large, but let's be safe
    const truncatedResume = resumeText.length > MAX_LENGTH 
      ? resumeText.substring(0, MAX_LENGTH) + '... [truncated]' 
      : resumeText;

    const prompt = `You are an expert resume reviewer. Analyze the following resume against the job description and provide detailed feedback.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${truncatedResume}

ANALYSIS FORMAT:
1. Overall Match Score (0-100%): [score]%
2. Key Strengths:
   - [strength 1]
   - [strength 2]
   - [strength 3]
3. Areas for Improvement:
   - [improvement 1]
   - [improvement 2]
4. Missing Keywords/Skills:
   - [keyword 1]
   - [keyword 2]
5. Suggestions for Improvement:
   - [suggestion 1]
   - [suggestion 2]
   - [suggestion 3]`;

    debugLog('Sending request to Gemini API...');
    debugLog('Sending request to Gemini API...');
    
    try {
      const result = await model.generateContent(prompt);
      debugLog('Received response from Gemini API');
      
      if (!result || !result.response) {
        throw new Error('Invalid response structure from Gemini API');
      }
      
      const response = result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response content from Gemini API');
      }
      
      debugLog('Response text length:', text.length);
      return text;
    } catch (apiError) {
      console.error('Gemini API Error:', apiError);
      throw new Error(`Gemini API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Error in analyzeResume:", error);
    throw new Error(`Failed to analyze resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  debugLog('Starting PDF extraction for file:', file.name);
  
  return new Promise((resolve, reject) => {
    if (!file) {
      const error = new Error('No file provided');
      debugLog('Extraction error:', error);
      reject(error);
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      const error = new Error('File is too large. Maximum size is 10MB.');
      debugLog('File size error:', file.size, 'bytes');
      reject(error);
      return;
    }

    const fileReader = new FileReader();
    
    fileReader.onload = async (e) => {
      try {
        debugLog('File loaded, starting extraction...');
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        if (!arrayBuffer) {
          throw new Error('Failed to read file: empty result');
        }

        const typedArray = new Uint8Array(arrayBuffer);
        
        // Parse the PDF with error handling for corrupted files
        const data = await pdfjs(typedArray).catch((pdfError: Error) => {
          debugLog('PDF.js error:', pdfError);
          if (pdfError instanceof Error) {
            if (pdfError.message.includes('Invalid PDF')) {
              throw new Error('The uploaded file is not a valid PDF or is corrupted.');
            } else if (pdfError.message.includes('password')) {
              throw new Error('Password-protected PDFs are not supported.');
            }
          }
          throw pdfError;
        });
        
        const text = data.text || '';
        const trimmedText = text.trim();
        
        debugLog('Extracted text length:', trimmedText.length);
        
        if (trimmedText.length === 0) {
          throw new Error('The PDF appears to be empty or contains no extractable text.');
        }
        
        // Basic validation to check if we got meaningful text
        const wordCount = trimmedText.split(/\s+/).length;
        if (wordCount < 5) { // Very short text might indicate extraction failure
          debugLog('Suspiciously low word count:', wordCount);
          throw new Error('The PDF does not contain enough text. It might be a scanned document or image.');
        }
        
        debugLog('PDF extraction successful');
        resolve(trimmedText);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during PDF processing';
        debugLog('PDF processing error:', error);
        reject(new Error(`Failed to process PDF: ${errorMessage}`));
      }
    };
    
    fileReader.onerror = (error) => {
      debugLog('FileReader error:', error);
      reject(new Error('Failed to read the file. The file might be corrupted or in an unsupported format.'));
    };
    
    fileReader.onabort = () => {
      const error = new Error('File reading was aborted');
      debugLog('File read aborted');
      reject(error);
    };
    
    // Start reading the file
    try {
      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      debugLog('Error reading file:', error);
      reject(new Error('Failed to read the file. It might be corrupted or in an unsupported format.'));
    }
  });
};
export const runtime = "nodejs";
// Using Apache Tika Server for file parsing
import { NextResponse } from "next/server";
import { Ollama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { LLMResponseSchema, LLMResponse } from "./schema";

export const config = {
  api: {
    bodyParser: false,
  },
};

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const SUPPORTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
  "text/plain",
];

const SUPPORTED_EXTENSIONS = [".csv", ".xls", ".xlsx", ".pdf", ".txt"];

interface FileValidationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

class FileValidationException extends Error {
  constructor(public validationError: FileValidationError) {
    super(validationError.message);
    this.name = "FileValidationException";
  }
}

function validateFileSize(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationException({
      code: "FILE_TOO_LARGE",
      message: `File size exceeds the maximum limit of ${
        MAX_FILE_SIZE / (1024 * 1024)
      }MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
      details: {
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
        maxSizeMB: MAX_FILE_SIZE / (1024 * 1024),
      },
    });
  }
}

function validateFileFormat(file: File): void {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf("."));

  // Check file extension
  if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
    throw new FileValidationException({
      code: "UNSUPPORTED_FORMAT",
      message: `File format '${fileExtension}' is not supported. Supported formats are: ${SUPPORTED_EXTENSIONS.join(
        ", "
      )}.`,
      details: {
        fileName: file.name,
        fileExtension,
        supportedExtensions: SUPPORTED_EXTENSIONS,
        supportedFormats: "CSV, Excel (.xls, .xlsx), PDF, and plain text files",
      },
    });
  }

  // Check MIME type if available
  if (file.type && !SUPPORTED_MIME_TYPES.includes(file.type)) {
    console.warn(
      `[validateFileFormat] MIME type '${file.type}' not in supported list, but extension '${fileExtension}' is valid. Proceeding with validation.`
    );
  }
}

function validateFileContent(file: File): void {
  if (file.size === 0) {
    throw new FileValidationException({
      code: "EMPTY_FILE",
      message:
        "The uploaded file is empty. Please upload a file with transaction data.",
      details: {
        fileName: file.name,
        fileSize: file.size,
      },
    });
  }
}

function validateFile(file: File): void {
  validateFileSize(file);
  validateFileFormat(file);
  validateFileContent(file);
}

async function parseFormData(
  req: Request
): Promise<{ fileBuffer: Buffer; fileName: string }> {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    console.error(
      "[parseFormData] No file uploaded or file is a string:",
      file
    );
    throw new FileValidationException({
      code: "NO_FILE_UPLOADED",
      message: "No file was uploaded. Please select a file to upload.",
      details: {
        receivedValue: file,
        expectedType: "File object",
      },
    });
  }

  // file is of type File - validate it
  console.log("[parseFormData] Received file:", {
    name: file.name,
    type: file.type,
    size: file.size,
    constructor: file.constructor?.name,
  });

  // Perform comprehensive file validation
  validateFile(file);

  console.log("[parseFormData] File validation passed");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { fileBuffer: buffer, fileName: file.name };
  } catch (err) {
    console.error("[parseFormData] Error reading file buffer:", err);
    throw new FileValidationException({
      code: "FILE_READ_ERROR",
      message:
        "Failed to read the uploaded file. The file may be corrupted or inaccessible.",
      details: {
        fileName: file.name,
        fileSize: file.size,
        error: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}

async function fileBufferToText(buffer: Buffer, fileName: string) {
  // Use Apache Tika Server for PDF and text extraction
  try {
    // Use Docker Compose service name for Tika when running in containers
    const tikaUrl = "http://tika:9998/tika";
    const response = await fetch(tikaUrl, {
      method: "PUT",
      headers: {
        Accept: "text/plain",
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `[fileBufferToText] Tika server error: ${response.status} ${response.statusText}`,
        errorText
      );

      if (response.status === 422) {
        throw new FileValidationException({
          code: "UNSUPPORTED_FILE_CONTENT",
          message:
            "The file content cannot be processed. The file may be corrupted, password-protected, or in an unsupported format.",
          details: {
            fileName,
            tikaStatus: response.status,
            tikaError: errorText,
          },
        });
      } else if (response.status === 500) {
        throw new Error(
          "File processing service is temporarily unavailable. Please try again later."
        );
      } else {
        throw new Error(
          `File processing failed with status ${response.status}. Please ensure the file is valid and try again.`
        );
      }
    }

    const text = await response.text();

    if (!text || text.trim().length === 0) {
      throw new FileValidationException({
        code: "NO_EXTRACTABLE_CONTENT",
        message:
          "No readable content could be extracted from the file. Please ensure the file contains transaction data and is not corrupted.",
        details: {
          fileName,
          extractedTextLength: text?.length || 0,
        },
      });
    }

    return text;
  } catch (err) {
    if (err instanceof FileValidationException) {
      throw err; // Re-throw validation exceptions as-is
    }

    console.error("[fileBufferToText] Tika parse error", err);

    // Handle network/connection errors
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(
        "File processing service is unavailable. Please try again later or contact support if the problem persists."
      );
    }

    throw new Error(
      `Failed to extract content from the file. Please ensure the file is valid and not corrupted. Error: ${
        err instanceof Error ? err.message : "Unknown error"
      }`
    );
  }
}

// Refactored to use llamaindex for prompt management and LLM calls
const ollama = new Ollama({
  baseUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  model: "gemma3n:e2b",
});

const parser = new JsonOutputParser();

function extractJsonFromText(text: string): string | null {
  // Try to extract the first JSON object from the text
  // Look for JSON that starts with { and ends with }
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) {
    return match[0];
  }

  // If no match, try to find JSON between code blocks or other markers
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  return null;
}

async function callOllamaLLM(
  content: string,
  schema: string
): Promise<LLMResponse> {
  const format_instructions = parser.getFormatInstructions();

  // Create PromptTemplate inside the function to avoid module-level instantiation issues
  const promptTemplate = new PromptTemplate({
    template:
      "You are a precise JSON extraction assistant. Extract transaction data from the broker file content and return ONLY a valid JSON object.\n\n" +
      "CRITICAL REQUIREMENTS:\n" +
      "- Return ONLY valid JSON - no explanations, no markdown, no extra text\n" +
      "- ONLY include transactions where assetType is 'stock' (ignore crypto, cash, etc.)\n" +
      "- Use the exact field names shown in the schema\n" +
      '- If no stock transactions found, return: {{"transactions": []}}\n' +
      "- All dates must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)\n" +
      "- All numbers must be valid numbers (not strings)\n\n" +
      "REQUIRED JSON STRUCTURE:\n" +
      "{schema}\n\n" +
      "EXAMPLE OUTPUT:\n" +
      '{{"transactions": [{{"assetSymbol": "AAPL", "assetName": "Apple Inc", "assetType": "stock", "type": "buy", "quantity": 10, "price": 150.50, "date": "2024-01-15T10:30:00.000Z", "currency": "USD", "exchange": "NASDAQ"}}]}}\n\n' +
      "FILE CONTENT TO PARSE:\n{content}",
    inputVariables: ["schema", "content"],
  });

  const prompt = await promptTemplate.format({
    schema,
    content,
  });
  const response = await ollama.invoke(prompt);
  console.log("[LLM] Raw response received:", response);
  console.log("[LLM] Response type:", typeof response);

  let jsonText = response;
  // Try to extract JSON if extra text is present
  if (typeof response === "string") {
    const extracted = extractJsonFromText(response);
    if (extracted) {
      jsonText = extracted;
      console.log("[LLM] Extracted JSON:", jsonText);
    } else {
      console.log("[LLM] No JSON found in response, using full response");
    }
  }
  try {
    // First try to parse as JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (jsonErr) {
      console.error("[LLM] Failed to parse JSON:", jsonErr);
      console.error("[LLM] Raw response:", response);
      console.error("[LLM] Extracted JSON text:", jsonText);
      throw new Error("LLM returned invalid JSON format");
    }

    // Then validate against our schema
    try {
      return LLMResponseSchema.parse(parsed);
    } catch (schemaErr) {
      console.error("[LLM] Schema validation failed:", schemaErr);
      console.error("[LLM] Parsed object:", JSON.stringify(parsed, null, 2));

      // Try to fix common issues
      if (parsed && typeof parsed === "object") {
        // If it's missing the transactions array, add it
        if (!parsed.transactions) {
          parsed.transactions = [];
        }

        // If transactions is not an array, try to fix it
        if (!Array.isArray(parsed.transactions)) {
          parsed.transactions = [];
        }

        // Try validation again after fixes
        try {
          return LLMResponseSchema.parse(parsed);
        } catch (fixErr) {
          console.error("[LLM] Still invalid after fixes:", fixErr);
        }
      }

      throw new Error("LLM returned JSON that doesn't match expected schema");
    }
  } catch (err) {
    console.error(
      "[LLM] Output is not valid or does not match schema",
      err,
      response
    );
    throw new Error("LLM returned invalid or malformed JSON");
  }
}

export async function POST(req: Request) {
  try {
    console.log("[POST] Incoming request:", {
      method: req.method,
      headers: Object.fromEntries(Array.from(req.headers.entries())),
    });

    // Parse form and get file buffer with validation
    const { fileBuffer, fileName } = await parseFormData(req);
    console.log("[POST] File buffer and name obtained:", {
      fileName,
      bufferLength: fileBuffer.length,
    });

    // Read file content (PDF or text) with enhanced error handling
    const content = await fileBufferToText(fileBuffer, fileName);
    console.log(
      "[POST] File content extracted successfully, length:",
      content.length
    );

    // Define the schema string to match your TransactionSchema
    const schema = `{
  "transactions": [
    {
      "assetSymbol": "string",
      "assetName": "string",
      "assetType": "stock" | "crypto" | "cash" | "other",
      "type": "buy" | "sell" | "deposit" | "withdraw",
      "quantity": number,
      "price": number,
      "date": "ISO 8601 date string",
      "notes": "string (optional)",
      "currency": "string",
      "exchange": "string"
    }
  ]
}`;

    // Call LLM with enhanced error handling
    const parsed = await callOllamaLLM(content, schema);
    console.log(
      "[POST] LLM response received successfully, transactions count:",
      parsed.transactions.length
    );

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[POST] Error occurred:", err);

    // Handle file validation errors with appropriate status codes
    if (err instanceof FileValidationException) {
      const { code, message, details } = err.validationError;

      // Determine appropriate HTTP status code based on error type
      let statusCode = 400; // Bad Request (default for validation errors)

      switch (code) {
        case "FILE_TOO_LARGE":
          statusCode = 413; // Payload Too Large
          break;
        case "UNSUPPORTED_FORMAT":
        case "UNSUPPORTED_FILE_CONTENT":
          statusCode = 415; // Unsupported Media Type
          break;
        case "NO_FILE_UPLOADED":
        case "EMPTY_FILE":
        case "NO_EXTRACTABLE_CONTENT":
          statusCode = 400; // Bad Request
          break;
        case "FILE_READ_ERROR":
          statusCode = 422; // Unprocessable Entity
          break;
        default:
          statusCode = 400;
      }

      return NextResponse.json(
        {
          error: message,
          code,
          details,
          type: "validation_error",
        },
        { status: statusCode }
      );
    }

    // Handle other types of errors
    const errorMsg = err instanceof Error ? err.message : "Parsing failed";

    // Check for specific error types to provide better status codes
    if (
      errorMsg.includes("service is unavailable") ||
      errorMsg.includes("temporarily unavailable")
    ) {
      return NextResponse.json(
        {
          error: errorMsg,
          code: "SERVICE_UNAVAILABLE",
          type: "service_error",
          details: {
            suggestion:
              "Please try again later or contact support if the problem persists.",
          },
        },
        { status: 503 } // Service Unavailable
      );
    }

    if (
      errorMsg.includes("LLM returned invalid") ||
      errorMsg.includes("malformed JSON")
    ) {
      return NextResponse.json(
        {
          error:
            "Failed to parse the file content. The file format may not be supported or the content may be unclear.",
          code: "PARSING_ERROR",
          type: "processing_error",
          details: {
            originalError: errorMsg,
            suggestion:
              "Please ensure the file contains clear transaction data in a supported format.",
          },
        },
        { status: 422 } // Unprocessable Entity
      );
    }

    // Generic server error for unexpected issues
    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing your file.",
        code: "INTERNAL_ERROR",
        type: "server_error",
        details: {
          message: errorMsg,
          suggestion:
            "Please try again or contact support if the problem persists.",
        },
      },
      { status: 500 }
    );
  }
}

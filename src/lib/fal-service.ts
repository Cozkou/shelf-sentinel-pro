import { fal } from "@fal-ai/client";

// Configure fal client with API key
fal.config({
  credentials: import.meta.env.VITE_FAL_KEY,
});

export interface VideoAnalysisResult {
  output: string;
}

/**
 * Analyzes a video file using fal.ai's video understanding model
 * @param videoFile - The video file to analyze
 * @param prompt - The question or analysis prompt for the video
 * @param detailedAnalysis - Whether to request more detailed analysis
 * @returns The AI analysis result
 */
export async function analyzeVideo(
  videoFile: File,
  prompt: string,
  detailedAnalysis: boolean = false
): Promise<string> {
  try {
    // Upload the video file to fal storage
    const videoUrl = await fal.storage.upload(videoFile);

    console.log("Uploaded video to:", videoUrl);

    // Subscribe to the video understanding endpoint
    const result = await fal.subscribe("fal-ai/video-understanding", {
      input: {
        video_url: videoUrl,
        prompt: prompt,
        detailed_analysis: detailedAnalysis,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("Analysis in progress...", update);
        }
      },
    });

    return result.data.output;
  } catch (error) {
    console.error("Video analysis error:", error);

    if (error instanceof Error) {
      throw new Error(`Failed to analyze video: ${error.message}`);
    }

    throw new Error("Failed to analyze video. Please try again.");
  }
}

/**
 * Analyzes a video from a URL
 * @param videoUrl - The URL of the video to analyze
 * @param prompt - The question or analysis prompt for the video
 * @param detailedAnalysis - Whether to request more detailed analysis
 * @returns The AI analysis result
 */
export async function analyzeVideoFromUrl(
  videoUrl: string,
  prompt: string,
  detailedAnalysis: boolean = false
): Promise<string> {
  try {
    const result = await fal.subscribe("fal-ai/video-understanding", {
      input: {
        video_url: videoUrl,
        prompt: prompt,
        detailed_analysis: detailedAnalysis,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("Analysis in progress...", update);
        }
      },
    });

    return result.data.output;
  } catch (error) {
    console.error("Video analysis error:", error);

    if (error instanceof Error) {
      throw new Error(`Failed to analyze video: ${error.message}`);
    }

    throw new Error("Failed to analyze video. Please try again.");
  }
}

/**
 * Analyzes an image file using fal.ai's vision LLM for object detection and inventory counting
 * @param imageFile - The image file to analyze
 * @param prompt - The analysis prompt (default focuses on inventory counting)
 * @returns The AI analysis result with object counts and details
 */
export async function analyzeImage(
  imageFile: File,
  prompt?: string
): Promise<string> {
  try {
    // Upload the image file to fal storage
    const imageUrl = await fal.storage.upload(imageFile);

    console.log("Uploaded image to:", imageUrl);

    const analysisPrompt = prompt ||
      `Analyze this inventory shelf image. For each distinct product or item visible, provide:
1. Item name or description
2. Exact count of units visible

Format your response as a numbered list with this EXACT format:
1. [Quantity]x [Item Name]
2. [Quantity]x [Item Name]
3. [Quantity]x [Item Name]

Example:
1. 12x Coca Cola Cans
2. 8x Potato Chips Bags
3. 15x Water Bottles

Be precise with counts. If you cannot determine the exact count, provide your best estimate.`;

    // Use fal.ai's vision LLM (Google Gemini Flash) for image analysis
    const result = await fal.subscribe("fal-ai/any-llm/vision", {
      input: {
        prompt: analysisPrompt,
        image_urls: [imageUrl],
        model: "google/gemini-flash-1.5",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("Image analysis in progress...", update);
        }
      },
    });

    return result.data.output;
  } catch (error) {
    console.error("Image analysis error:", error);

    if (error instanceof Error) {
      throw new Error(`Failed to analyze image: ${error.message}`);
    }

    throw new Error("Failed to analyze image. Please try again.");
  }
}

/**
 * Analyzes an image from a URL using fal.ai's vision LLM
 * @param imageUrl - The URL of the image to analyze
 * @param prompt - The analysis prompt (default focuses on inventory counting)
 * @returns The AI analysis result with object counts and details
 */
export async function analyzeImageFromUrl(
  imageUrl: string,
  prompt?: string
): Promise<string> {
  try {
    const analysisPrompt = prompt ||
      `Analyze this inventory shelf image. For each distinct product or item visible, provide:
1. Item name or description
2. Exact count of units visible

Format your response as a numbered list with this EXACT format:
1. [Quantity]x [Item Name]
2. [Quantity]x [Item Name]
3. [Quantity]x [Item Name]

Example:
1. 12x Coca Cola Cans
2. 8x Potato Chips Bags
3. 15x Water Bottles

Be precise with counts. If you cannot determine the exact count, provide your best estimate.`;

    const result = await fal.subscribe("fal-ai/any-llm/vision", {
      input: {
        prompt: analysisPrompt,
        image_urls: [imageUrl],
        model: "google/gemini-flash-1.5",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("Image analysis in progress...", update);
        }
      },
    });

    return result.data.output;
  } catch (error) {
    console.error("Image analysis error:", error);

    if (error instanceof Error) {
      throw new Error(`Failed to analyze image: ${error.message}`);
    }

    throw new Error("Failed to analyze image. Please try again.");
  }
}

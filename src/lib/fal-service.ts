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


import { GoogleGenAI } from "@google/genai";
import { Track, Alert, GroundingLink } from "../types";

// Always use named parameter for apiKey and directly from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTacticalSummary = async (tracks: Track[], alerts: Alert[]) => {
  const prompt = `
    Act as a Brigade-level Tactical Operations Center (TOC) Intelligence Officer. 
    Analyze the current Common Operational Picture (COP) data provided below and provide a concise, 1-paragraph "Commander's Executive Summary".
    Focus on high-threat items, potential fratricide risks, and significant activity.
    
    TRACKS: ${JSON.stringify(tracks.map(t => ({ callsign: t.callsign, type: t.type, pos: t.pos })))}
    ALERTS: ${JSON.stringify(alerts.map(a => ({ type: a.type, severity: a.severity, message: a.message })))}
    
    Response must be professional, military-focused, and strictly under 100 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use .text property directly as per SDK guidelines.
    return { text: response.text || "", links: [] };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Intelligence summary unavailable. Check direct feeds for status.", links: [] };
  }
};

export const queryLocalIntel = async (query: string, location: { latitude: number; longitude: number }) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: `Tactical Request: ${query}. Focus on terrain, infrastructure, and local facilities relevant to a command post.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        }
      },
    });

    // Use .text property directly as per SDK guidelines.
    const text = response.text || "No intelligence report generated.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const links: GroundingLink[] = chunks
      .filter((chunk: any) => chunk.maps)
      .map((chunk: any) => ({
        uri: chunk.maps.uri,
        title: chunk.maps.title || "Map Location"
      }));

    return { text, links };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Failed to query local intelligence baseline.", links: [] };
  }
};

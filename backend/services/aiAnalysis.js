const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AIAnalysisService {
  async analyzeCommunication(text, participantName) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Analyze this group discussion contribution and provide a communication score.

Participant: ${participantName}
Text: "${text}"

Evaluate based on:
1. Clarity (0-25): Clear expression of ideas
2. Relevance (0-25): On-topic and meaningful contribution
3. Engagement (0-25): Active participation and interaction
4. Professionalism (0-25): Language quality and tone

Respond ONLY in valid JSON format:
{
  "clarity": <number>,
  "relevance": <number>,
  "engagement": <number>,
  "professionalism": <number>,
  "totalScore": <sum>,
  "feedback": "<brief feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"]
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error('Invalid AI response format');
    } catch (error) {
      console.error('AI Analysis Error:', error);
      // Return default scores if AI fails
      return {
        clarity: 15, relevance: 15, engagement: 15, professionalism: 15,
        totalScore: 60,
        feedback: 'Analysis completed. Keep participating actively in discussions.',
        strengths: ['Participated in the discussion', 'Contributed messages'],
        improvements: ['Try to elaborate more on your points', 'Engage with other participants']
      };
    }
  }
}

module.exports = new AIAnalysisService();

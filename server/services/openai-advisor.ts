import OpenAI from "openai";

// Using gpt-4o for reliable performance and Turkish language support
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AdvisorMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getPackagingAndSalesAdvice(
  productDescription: string,
  conversationHistory: AdvisorMessage[] = []
): Promise<string> {
  try {
    const systemPrompt = `Sen Türkiye pazarında uzman bir lojistik ve satış danışmanısın. Müşterilere ürünlerinin paketleme ve satış kanalları hakkında detaylı tavsiyeler veriyorsun. Amacın, satışlarını artırmak için en uygun paketleme stratejileri ve satış kanallarını önermek.

Şunları göz önünde bulundur:
- Ürünün özelliklerine göre en uygun paketleme yöntemleri
- Ürün güvenliği ve taşıma maliyetleri
- Türkiye ve uluslararası e-ticaret platformları
- Gümrük ve kargo süreçleri
- Maliyet optimizasyonu
- Müşteri deneyimi

Cevaplarını Türkçe ver ve pratik, uygulanabilir öneriler sun.`;

    const messages: AdvisorMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: productDescription }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("OpenAI returned no content:", JSON.stringify(response.choices[0]));
      return "Üzgünüm, bir yanıt oluşturamadım. Lütfen tekrar deneyin.";
    }
    return content;
  } catch (error: any) {
    console.error("OpenAI advisor error:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      response: error.response?.data
    });
    throw new Error(`Danışman hizmetinde bir hata oluştu: ${error.message}`);
  }
}

export async function generateConversationTitle(firstMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: 'system',
          content: 'Verilen mesaja dayanarak kısa, açıklayıcı bir başlık oluştur (maksimum 60 karakter). Sadece başlığı döndür, başka bir şey yazma. Türkçe yaz.'
        },
        {
          role: 'user',
          content: firstMessage
        }
      ],
      max_tokens: 30,
    });

    return response.choices[0].message.content?.trim() || "Yeni Danışma";
  } catch (error: any) {
    console.error("Title generation error:", error);
    return "Yeni Danışma";
  }
}

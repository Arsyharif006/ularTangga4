# Setup AI Question Generator untuk Ular Tangga

## Overview
Sistem generasi pertanyaan AI telah diintegrasikan untuk menghasilkan pertanyaan dinamis berdasarkan tema pilihan. Sistem ini mendukung multiple AI providers dan memiliki fallback ke static questions jika AI tidak tersedia.

## AI Providers yang Didukung

### 1. **Google Gemini** (Recommended - Gratis)
- **Website**: https://aistudio.google.com/apikey
- **Quota**: 60 requests per minute (free tier)
- **Setup**:
  ```
  NEXT_PUBLIC_GEMINI_API_KEY=<your_api_key>
  NEXT_PUBLIC_AI_PROVIDER=gemini
  ```

### 2. **Groq** (Cepat - Gratis)
- **Website**: https://console.groq.com
- **Quota**: Lebih generous dari Gemini
- **Setup**:
  ```
  NEXT_PUBLIC_GROQ_API_KEY=<your_api_key>
  NEXT_PUBLIC_AI_PROVIDER=groq
  ```

### 3. **OpenAI** (Berbayar)
- **Website**: https://platform.openai.com/api-keys
- **Model**: gpt-3.5-turbo
- **Setup**:
  ```
  NEXT_PUBLIC_OPENAI_API_KEY=<your_api_key>
  NEXT_PUBLIC_AI_PROVIDER=openai
  ```

## Instalasi & Setup

### Step 1: Copy Environment Template
```bash
# Copy .env.local.example ke .env.local
cp .env.local.example .env.local
```

### Step 2: Dapatkan API Key
Pilih salah satu provider di atas dan dapatkan API key mereka.

### Step 3: Isi .env.local
Edit file `.env.local` dan isi:

```env
# Contoh untuk Google Gemini
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyD...
NEXT_PUBLIC_AI_PROVIDER=gemini
NEXT_PUBLIC_USE_AI_QUESTIONS=true
```

### Step 4: Jalankan Development Server
```bash
npm run dev
```

## Fitur

### ✅ Tema Pertanyaan
- Sains
- Pemrograman
- Sejarah
- Geografi
- Umum (General)

### ✅ Kesulitan
- Easy (Mudah)
- Medium (Sedang) - Default
- Hard (Sulit)

### ✅ Caching & Performance
- Pertanyaan di-cache dalam memory untuk performa optimal
- Jika cache habis, sistem auto-generate pertanyaan baru
- Fallback ke static questions jika AI gagal

### ✅ Error Handling
- Jika API key tidak valid → fallback ke static questions
- Jika rate limit terbatas → coba lagi dengan delay
- Pertanyaan tidak pernah repeat dalam satu game session

## Troubleshooting

### ❌ Error: "API Key tidak diset"
**Solusi**: Pastikan `.env.local` sudah diisi dengan key yang benar

### ❌ Error: "Rate limit exceeded"
**Solusi**: 
- Tunggu beberapa menit
- Switch ke provider lain (Groq lebih permissive)
- Tingkatkan limit di provider console

### ❌ Pertanyaan tidak ter-generate
**Solusi**: 
- Check API key di .env.local
- Check network connection
- Cek apakah API provider accessible
- System akan fallback ke static questions otomatis

### ❌ Pertanyaan selalu sama (static)
**Solusi**:
- Pastikan `NEXT_PUBLIC_USE_AI_QUESTIONS=true`
- Pastikan API key valid
- Check browser console untuk error messages
- Cek file `.env.local` tersimpan dengan benar

## Development

### File Structure
```
src/
├── lib/
│   ├── aiQuestionGenerator.ts    # AI API integration
│   ├── questionCache.ts           # Question caching system
│   └── initQuestionSystem.ts      # Initialization service
├── stores/
│   └── gameStore.ts               # Updated untuk AI support
├── data/
│   └── questions/
│       ├── programming.ts         # Programming soal (NEW)
│       └── ...
└── components/
    └── setup/
        └── GameSetup.tsx          # Initialize cache on mount
```

### Menambah Provider AI Baru
Buka `src/lib/aiQuestionGenerator.ts` dan tambahkan function `generateWithProviderName()`:

```typescript
async function generateWithYourProvider(
  theme: QuestionTheme, 
  difficulty: string
): Promise<GeneratedQuestionData> {
  // Implement your logic
}
```

Kemudian tambah case di `generateQuestionFromAI()`:
```typescript
} else if (provider === 'yourprovider') {
  data = await generateWithYourProvider(theme, difficulty);
}
```

## Best Practices

1. **Jangan hardcode API key di code** - Selalu gunakan .env.local
2. **Jangan commit .env.local** - Sudah di .gitignore
3. **Monitor quota** - Provider gratis punya rate limit
4. **Test dengan cache** - Pertama kali load game akan slow, setelah itu cepat
5. **Keep fallback questions** - Static questions sebagai backup

## Performance Tips

- First load akan lebih lambat (10-15 detik) saat pre-generate cache
- Refresh tidak perlu re-generate (cache di-maintain)
- Pertanyaan cached in-memory, tidak perlu database
- Optimal untuk development, cukup untuk production dengan rate limiting

## Future Improvements

- [ ] Database untuk persist questions
- [ ] Question difficulty level selection UI
- [ ] Admin panel untuk manage questions
- [ ] Analytics untuk track soal populer
- [ ] Local LLM support (Ollama)

## Support

Jika ada masalah:
1. Check `.env.local` configuration
2. Check browser console untuk error details
3. Check network tab untuk API calls
4. Check function logs di `src/lib/questionCache.ts`

---

**Happy Learning! 🎓**

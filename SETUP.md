# Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with your OpenAI API key:

```
NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here
```

**Important:** 
- The `.env.local` file is already in `.gitignore` and will not be committed
- Never commit your API key to the repository
- Get your API key from: https://platform.openai.com/api-keys

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with your OpenAI API key

3. Run the development server:
   ```bash
   npm run dev
   ```

The application will use the API key from the environment variable for generating embeddings.


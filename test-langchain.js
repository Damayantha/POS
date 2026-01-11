const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage } = require('@langchain/core/messages');

const API_KEY = 'AIzaSyBQC2IRZmOqUKWX8aUOtgrMXMLW034MoaU';
const MODEL_NAME = 'gemini-1.5-flash';

async function test() {
    console.log('Testing LangChain Integration (' + MODEL_NAME + ')...');
    try {
        console.log('Importing ChatGoogleGenerativeAI succeeded.');
        
        const model = new ChatGoogleGenerativeAI({
            model: MODEL_NAME, // Correct property name per source code
            apiKey: API_KEY,
        });
        
        console.log('Model instantiated.');
        
        const response = await model.invoke([
            new HumanMessage("Hello, are you working?")
        ]);
        
        console.log('Response received:', response.content);
        console.log('SUCCESS');
    } catch (error) {
        console.error('FAILURE:', error);
    }
}

test();

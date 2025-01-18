from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import json
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize OpenAI client with API key from .env
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")  # Load API key from .env
)

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    try:
        # Print request information for debugging
        print("Received request")
        print(f"Content-Type: {request.content_type}")
        print(f"Raw data: {request.get_data()}")

        # Parse request data
        data = request.get_json(force=True)
        country1 = data.get('country1', '').strip()
        country2 = data.get('country2', '').strip()

        print(f"Processing request for {country1} and {country2}")

        if not country1 or not country2:
            return jsonify({'error': 'Both countries are required'}), 400

        # Create completion with new client.chat.completions.create method
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert in international relations and geopolitics."},
                {"role": "user", "content": f"""Provide a detailed analysis of the relationship between {country1} and {country2}, covering:
                    1. Current diplomatic relations
                    2. Economic partnerships and trade
                    3. Historical context and key events, including wars and changes that happened because of it
                    4. Current challenges and opportunities
                    Please provide factual, up-to-date information, and keep it under 400 words"""}
            ],
            temperature=0.7,
            max_tokens=500
        )

        # Extract response
        response_text = completion.choices[0].message.content

        # Create and return response
        response = jsonify({'response': response_text})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting server...")
    app.run(host='127.0.0.1', port=5002, debug=True)
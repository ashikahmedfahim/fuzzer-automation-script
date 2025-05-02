import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from 'fs';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateResponse = async (prompt) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });
  return response;
}

const readCSV = (filePath) => {
  const results = fs.readFileSync(filePath, 'utf8');
  const data = results.split('[').map(row => row.replaceAll('\n', '').replaceAll(',', '').split(']'));
  return data;
}

const main = async () => {
  const csvFilePath = 'rules.csv';
  const data = readCSV(csvFilePath);

  const basePrompt = `we will do mqtt fuzzer test.
                      now generate hex stream for the testing in the below format
                      {
                      "issue" : "breaks connection",
                      "type" : "CONNECT",
                      "hex" : "0x fa 12 .... "
                      }
                      i will give you some rules and generate the json based on this
                      there are 15 packet types (also called Control Packet Types)
                      give me the json for each packet type
                      only give me the json only extra information`;
  const response  = await generateResponse(basePrompt);
  console.log('====================================');
  console.log('Base Prompt:');
  console.log((JSON.stringify(response)));
  console.log('====================================');

  //wait for 60 seconds before the next request
  const waitTime = 15000; //  60 seconds
  // This is to avoid hitting the rate limit
  await new Promise(resolve => setTimeout(resolve, waitTime));
  

  for (let i = 0; i < data.length; i++) {
    if (data[i][1] !== undefined) {
      const prompt = `Rule: ${data[i][1]}, generate the json for this rule, follow this format {
                      "issue" : "breaks connection",
                      "type" : "CONNECT / DISCONNECT / PUBLISH / SUBSCRIBE / UNSUBSCRIBE /...",
                      "hex" : "0x fa 12 .... "
                      }`;
      console.log(`Prompt: ${prompt}`);
      const response = await generateResponse(prompt);
      //parse json response
      const parsedResponse = JSON.stringify(response);
      const jsonResponse = JSON.parse(parsedResponse);
      const readableOutput = jsonResponse?.candidates[0]?.content.parts[0]?.text;
      console.log(readableOutput);
      // Wait for 10 seconds before the next request
      const waitTime = 10000; // 10 seconds
      // This is to avoid hitting the rate limit
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Save the response to a file
      const fileName = `response.json`;
      fs.writeFileSync(fileName, JSON.stringify(readableOutput, null, 2), 'utf8');
    }
  }
  console.log('All requests completed.');
}

main();
const fs = require("fs-extra");
const puppeteer = require("puppeteer");

/**
 * Função sleep que retorna uma Promise que será resolvida após um determinado período.
 * @param {number} timeout - Tempo em milissegundos para o qual a Promise deve ser resolvida.
 * @returns {Promise} - Uma Promise que será resolvida após o timeout especificado.
 */
function sleep(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

async function loadJson(filePath) {
  const data = await fs.readFile(filePath, "utf8");
  return JSON.parse(data);
}

async function saveJson(filePath, jsonData) {
  const data = JSON.stringify(jsonData, null, 2);
  await fs.writeFile(filePath, data);
}

async function translateText(page, text) {
  await page.goto("https://www.google.com/search?q=tradutor", {
    waitUntil: "networkidle2",
  });
  const input = await page.waitForSelector("#tw-source-text-ta");
  await input.type(text);
  await sleep(1300);
  const translatedText = await page.evaluate(() => {
    const spanElement = document.querySelector("#tw-target-text > span.Y2IQFc");
    return spanElement ? spanElement.innerHTML : "";
  });
  console.log({ translatedText });
  return translatedText;
}

async function translateObject(page, obj) {
  const fieldsToTranslate = ["country", "name"];
  const translatedObj = { ...obj };

  for (const field of fieldsToTranslate) {
    if (translatedObj[field]) {
      translatedObj[field] = await translateText(page, translatedObj[field]);
    }
  }

  return translatedObj;
}

async function main() {
  const inputFilePath = "data.json";
  const outputFilePath = "translated_airports.json";

  const jsonData = await loadJson(inputFilePath);
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();

  const translatedData = [];

  for (let i = 0; i < jsonData.length; i++) {
    const item = jsonData[i];
    const translatedItem = await translateObject(page, item);
    translatedData.push(translatedItem);

    console.log(`Translated ${i + 1} of ${jsonData.length}`);
  }

  await browser.close();

  const formattedData = translatedData.map((js) => ({
    code: js.code,
    lat: js.lat,
    lon: js.lon,
    name: js.name,
    city: js.city,
    state: js.state,
    country: js.country,
  }));

  await saveJson(outputFilePath, formattedData);

  console.log(`JSON traduzido salvo em ${outputFilePath}`);
}

main().catch(console.error);

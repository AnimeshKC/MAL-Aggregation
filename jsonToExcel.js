const fs = require("fs");
const xlsx = require("xlsx");
const mangaObj = JSON.parse(fs.readFileSync("ComfyCampOnly_Manga.json"));
const animeObj = JSON.parse(fs.readFileSync("ComfyCampOnly.json"));

const wb = xlsx.utils.book_new();

const MINIMUM_THRESHOLD = 5;

wb.Props = {
  Title: "Comfy Camp Aggregation",
};
wb.SheetNames.push("anime");
wb.SheetNames.push("manga");

const wsAnimeData = [["Name", "Pseudocount Mean", "Mean", "# Scores"]];

const wsMangaData = [["Name", "Pseudocount Mean", "Mean", "# Scores"]];

function expandData(obj, wsData) {
  for (const mediaId of Object.keys(obj)) {
    const { title, mean, pMean, numScored } = obj[mediaId];
    if (numScored >= MINIMUM_THRESHOLD) {
      wsData.push([title, pMean, mean, numScored]);
    }
  }
}
expandData(animeObj, wsAnimeData);
expandData(mangaObj, wsMangaData);

const wscols = [
  { wch: 50 },
  { wch: 20 },
  { wch: 15 },
  { wch: 15 },
  { wch: 15 },
];

wsAnime = xlsx.utils.aoa_to_sheet(wsAnimeData);
wsAnime["!cols"] = wscols;
wsManga = xlsx.utils.aoa_to_sheet(wsMangaData);
wsManga["!cols"] = wscols;

wb.Sheets["anime"] = wsAnime;
wb.Sheets["manga"] = wsManga;

xlsx.writeFile(wb, "out.xlsx");
console.log("End");

const malScraper = require("mal-scraper");
const async = require("async");
const fs = require("fs");
const path = require("path");
const { cachedDataVersionTag } = require("v8");

const MIN_PROGRESS = 0.33;
const user_arr = [];

const pseudocount_FREQUENCY = 2;
const pseudocount_VALUE = 5.5;

//function that just generates the metadata object of a user.
function generateMetadata(name, type = "ANIME", platform = "MAL") {
  return { name, platform, type };
}

function uniqueArrayFromTxt(txtPath, splitString = "\n") {
  return [...new Set(fs.readFileSync(txtPath).toString().split(splitString))];
}

//return a base object that will be used as the target for object assignment
function getBaseObj() {
  return { Others: {} };
}

function getUserBaseObj(name, type = "ANIME", platform = "MAL") {
  return Object.assign(getBaseObj(), {
    metadata: generateMetadata(name, type, platform),
  });
}

function isStarted(status) {
  //status 1-4 means that the entry has been started
  return status < 5;
}
function getProgress(consumedCount, seriesCount) {
  if (seriesCount === 0) {
    return 1;
  }
  if (!consumedCount) {
    return 0;
  }
  if (consumedCount >= seriesCount) {
    return 1;
  } else {
    return parseFloat((consumedCount / seriesCount).toFixed(2));
  }
}
const userStatusMap = {
  1: "CURRENT",
  2: "COMPLETED",
  3: "PAUSED",
  4: "DROPPED",
  6: "PLANNING",
};
function getInstanceProperties(instance, type = "anime") {
  let numConsumed;
  let score = instance.score;
  let id;
  let seriesCount;
  let title;
  let status = instance.status;

  if (type === "anime") {
    numConsumed = instance.numWatchedEpisodes;
    id = instance.animeId;
    seriesCount = instance.animeNumEpisodes;
    title = instance.animeTitle;
  } else if (type == "manga") {
    numConsumed = instance.nbReadChapters;
    title = instance.mangaTitle;
    id = instance.mangaId;
    seriesCount = instance.mangaNumChapters;
  }
  return { numConsumed, score, id, seriesCount, title, status };
}
async function getUserObject(
  username,
  type = "anime",
  prevObj = {},
  after = 0
) {
  try {
    const userObject = !Object.entries(prevObj).length
      ? getUserBaseObj(username, type)
      : { ...prevObj };
    const data = await malScraper.getWatchListFromUser(username, after, type);
    if (!data) {
      return;
    }
    if (data.length) {
      for (const instance of data) {
        const { numConsumed, score, id, seriesCount, title, status } =
          getInstanceProperties(instance, type);

        if (!isStarted(status)) {
          continue;
        }
        const progress = getProgress(numConsumed, seriesCount);
        const statusString = userStatusMap[status];
        userObject[id] = {
          progress,
          score,
          status: statusString,
          title,
        };
      }
      const sleep_val = 25 + Math.random() * 912;
      await sleep(sleep_val + Math.random() * 725 * (after / 300));
      return getUserObject(username, type, userObject, after + 300);
    }
    console.count("Waiting");
    return userObject;
  } catch (e) {
    if (
      e.message === "Request failed with status code 400" ||
      e.message === "Request failed with status code 404" ||
      e.message === "Request failed with status code 403"
    ) {
      if (e.message === "Request failed with status code 403") {
        console.log("Look at forbidden error");
        console.log(e);
      }
    } else {
      throw e;
    }
  }
}

function pushObjToArr(obj, arr) {
  arr.push(obj);
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function recordUsers(userList, type = "anime", folder = "UsersFolder") {
  try {
    const usersArray = [];
    for (let i = 0; i < userList.length; i++) {
      const username = userList[i];
      sleep(i * 12 + i * Math.random() * 121);
      const currUserObj = await getUserObject(username, type);
      if (currUserObj) {
        await writeUser(currUserObj, type, folder);
      }
    }
    console.log("done");
  } catch (e) {}
}
function getUserListFromFileName(fileName, sliceBegin = 0, sliceEnd = 10000) {
  const userList = uniqueArrayFromTxt(fileName);
  const slicedUserList = userList.slice(sliceBegin, sliceEnd);
  return slicedUserList;
}
async function execute(userList, type = "anime", folderName = "UsersFolder") {
  try {
    await recordUsers(userList, type, folderName);
    console.log("Complete");
  } catch (e) {}
}

async function executeBoth(userList, folderName = "UsersFolder") {
  try {
    await Promise.all([
      execute(userList, "anime", folderName),
      execute(userList, "manga", folderName),
    ]);
    console.log("Both have been executed.");
  } catch (e) {}
}
async function runComfyCamp() {
  const comfyCamp50 = getUserListFromFileName("ComfyCampUsers.txt", 450, 520);
  console.log(comfyCamp50);
  const folderName = "ComfyCampOnly";
  await executeBoth(comfyCamp50, folderName);
  recordScores("ComfyCampOnly", "ComfyCampOnly.json", "anime");
  recordScores("ComfyCampOnly", "ComfyCampOnly_Manga.json", "manga");
}
const folderName = "UsersFolder";
const JusticeUserList = getUserListFromFileName("JusticeUserList.txt");
executeBoth(JusticeUserList, folderName);

async function writeUser(userObj, type = "anime", folder = "UsersFolder") {
  try {
    if (!userObj) return;
    console.log(userObj["metadata"]);
    const username = userObj["metadata"]["name"];
    const platformName = userObj["metadata"]["platform"];
    const type = userObj["metadata"]["type"];
    const fileString = `./${folder}/${username}_${platformName}_${type}.json`;
    fs.writeFileSync(fileString, JSON.stringify(userObj), { flag: "w" });
    console.log(`Finished for ${username}`);
  } catch (e) {
    console.log(e.message);
    // console.log(
    //   `The userObj in this case has metadata: ${userObj["metadata"]}`
    // );
  }
}
async function singleTest(username) {
  const animeObj = await getUserObject(username, "anime");
  const mangaObj = await getUserObject(username, "manga");
  await writeUser(animeObj, "anime");
  await writeUser(mangaObj, "manga");
}

function getNewMean(oldMean, oldCount, newValue) {
  const newMean = (oldMean * oldCount + newValue) / (oldCount + 1);
  return newMean;
}
function recordScores(dirName, writeFileName = "Users.json", type = "anime") {
  const scoreObject = {};
  const directoryPath = path.join(__dirname, dirName);
  const fileNames = fs.readdirSync(directoryPath);
  const endString = `${type}.json`;
  fileNames.forEach((fileName) => {
    //in this case, we're working with the proper format
    if (fileName.includes(endString)) {
      const filePath = path.join(directoryPath, fileName);
      const currObj = JSON.parse(fs.readFileSync(filePath));
      for (const key of Object.keys(currObj)) {
        if (scoreObject.hasOwnProperty(key)) {
          const progress = currObj[key]["progress"];
          const score = currObj[key]["score"];
          const completionAddition = progress === 1 ? 1 : 0;
          if (progress >= MIN_PROGRESS && score > 0) {
            scoreObject[key].mean = getNewMean(
              scoreObject[key].mean,
              scoreObject[key].numScored,
              currObj[key]["score"]
            );
            scoreObject[key].numScored += 1;
            scoreObject[key].numCompleted += completionAddition;
            const pMean =
              (scoreObject[key].mean * scoreObject[key].numScored +
                pseudocount_VALUE * pseudocount_FREQUENCY) /
              (scoreObject[key].numScored + pseudocount_FREQUENCY);
            scoreObject[key].pMean = pMean;
          }
        } else {
          const progress = currObj[key]["progress"];
          const score = currObj[key]["score"];
          if (progress >= MIN_PROGRESS && score > 0) {
            const numCompleted = progress === 1 ? 1 : 0;
            scoreObject[key] = {
              title: currObj[key]["title"],
              mean: currObj[key]["score"],
              numScored: 1,
              numCompleted,
              pMean: 0,
            };
          }
        }
      }
    }
  });
  console.log("Starting to write to json file");
  fs.writeFileSync(writeFileName, JSON.stringify(scoreObject), { flag: "w" });
  console.log("Finished writing to file");
}

// singleTest("VitorVerde");

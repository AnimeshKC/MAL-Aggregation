const malScraper = require("mal-scraper");
const async = require("async");
const fs = require("fs");
const { cachedDataVersionTag } = require("v8");

const user_arr = [];

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
          //   title,
        };
      }
      sleep(20 + 20 * (after / 300));
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

async function pushObjToArr(obj, arr) {
  arr.push(obj);
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function recordUsers(userList, type = "anime", folder = "UsersFolder") {
  const usersArray = [];
  for (let i = 0; i < userList.length; i++) {
    const username = userList[i];
    sleep(i * 100);
    const currUserObj = await getUserObject(username, type);
    if (currUserObj) {
      await writeUser(currUserObj, type, folder);
    }
  }
  console.log("done");
}

const folderName = "Justice";
async function execute(filename) {
  const userList = uniqueArrayFromTxt(filename);
  await recordUsers(userList, "anime");
  await recordUsers(userList, "manga");
  console.log("finished both");
}
execute("JusticeUserList.txt");

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
    console.log(
      `The userObj in this case has metadata: ${userObj["metadata"]}`
    );
  }
}
async function singleTest(username) {
  const animeObj = await getUserObject(username, "anime");
  const mangaObj = await getUserObject(username, "manga");
  await writeUser(animeObj, "anime");
  await writeUser(mangaObj, "manga");
}
// singleTest("zenmodeman");

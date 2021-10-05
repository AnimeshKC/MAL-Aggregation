const malScraper = require("mal-scraper");
const fs = require("fs");
const { cachedDataVersionTag } = require("v8");
const INCLUDED_USERS = [];
const INACESSABLE_USERS = [];
let scoreObject = {};
const MINIMUM_USERS = 5;
const pseudocount_VALUE = 5.5;
const pseudocount_FREQUENCY = 2;
const VARIATION_MIN = 10;
const RAND_SLEEP_MAX = 6000;
const seriesStatusMap = { ONGOING: 1, FINISHED: 2, NOT_YET_STARTED: 3 };
const userStatusMap = {
  CONSUMING: 1,
  COMPLETED: 2,
  ON_HOLD: 3,
  DROPPED: 4,
  PLAN_TO_CONSUME: 6,
};
const MINIMUM_COMPLETED_RATIO = 0.33;
function getIntroductionString() {
  return `
  Date of Update: ${new Date().toDateString()}

  IMPORTANT NOTE: The Scraper obtains data based on the user's default animelist page, 
  so for those whose lists default to, for example, "Currently Watching" rather than "All Anime" will
  have incomplete results. 

  The following users are included: 
  ${INCLUDED_USERS}

  The following users could not be included, either because their lists are not public (private or friend restricted) or because their accounts no longer exist: 
  
  ${INACESSABLE_USERS}
  
  This aggregation uses pseudocounts to reduce skewing of data with a smaller sample size. The psuecount value used is ${pseudocount_VALUE}, and the frequency is ${pseudocount_FREQUENCY}
  
  For a user's score to count for a finished title, the user must have consumed at least ${
    MINIMUM_COMPLETED_RATIO * 100
  }% of the work.
  
  Scores are provided only for works that have scores from at least ${MINIMUM_USERS} users
  `;
}
/*
{item1: {currentMean: 0, totalUsers: 0, users: {}}}
*/

//const userList = [...new Set(textList)]

function uniqueArrayFromTxt(txtPath, splitString = "\n") {
  return [...new Set(fs.readFileSync(txtPath).toString().split(splitString))];
}

/*
type: "anime" or "manga"
*/
function getTitleFromInstance(instance, type = "anime") {
  if (type === "manga") {
    return instance.mangaTitle;
  }
  return instance.animeTitle;
}
async function getUserScores(
  user,
  cacheObj = null,
  prevObject = {},
  after = 0,
  type = "anime"
) {
  try {
    const rand_sleep = Math.random() * RAND_SLEEP_MAX;
    // await sleep(rand_sleep);
    const userObject = !Object.entries(prevObject).length
      ? { [user]: [] }
      : { ...prevObject };
    const userScores = userObject[user];
    const data = await malScraper.getWatchListFromUser(user, after, type);
    if (data.length) {
      for (const instance of data) {
        const { score, status } = instance;
        title = getTitleFromInstance(instance, type);
        const completed = status === userStatusMap.COMPLETED;
        if (validateInstance(instance, type)) {
          userScores.push({ title, score, completed });
        } else if (completed) userScores.push({ title, score: 0, completed });
      }
      const sleep_val = 20 + Math.random() * 30;
      await sleep(sleep_val + sleep_val * (after / 300));
      return getUserScores(user, cacheObj, userObject, after + 300, type);
    }

    console.count("Waiting");
    return userObject;
  } catch (e) {
    //400: non-public list; 404: user deleted list or changed user
    if (
      e.message === "Request failed with status code 400" ||
      e.message === "Request failed with status code 404" ||
      e.message === "Request failed with status code 403"
    ) {
      if (e.message === "Request failed with status code 403") {
        console.log("Look at forbidden error");
        console.log(e);
      }
      if (cacheObj && cacheObj[user]) {
        return { [user]: cacheObj[user] };
      } else INACESSABLE_USERS.push(user);
    } else throw e;
  }
}

/*
Testing user function

*/
async function printUser(user, type = "anime") {
  try {
    const data = await getUserScores(user, {}, {}, 0, type);
    console.log("Length of data:", data[user].length);
    fs.writeFileSync("test.json", JSON.stringify(data), { flag: "w" });
  } catch (e) {
    console.log(e.message);
  }
}
// printUser("MightyMole", "manga");

//validates whether an incomplete instance counts
function validateInstance(instance, type = "anime") {
  const { score, status } = instance;
  const seriesStatus =
    type === "anime"
      ? instance.animeAiringStatus
      : instance.mangaPublishingStatus;
  const seriesCount =
    type === "anime" ? instance.animeNumEpisodes : instance.mangaNumChapters;
  const isFinished = seriesStatus === seriesStatusMap.FINISHED;
  const isOngoing = seriesStatus === seriesStatusMap.ONGOING;
  const userCount =
    type === "anime" ? instance.numWatchedEpisodes : instance.numReadChapters;
  const validFinishedScore =
    score &&
    isFinished &&
    Math.floor((userCount / seriesCount) * 100) >=
      MINIMUM_COMPLETED_RATIO * 100;
  const validOngoingScore =
    score && isOngoing && status !== userStatusMap.PLAN_TO_CONSUME;
  return validFinishedScore || validOngoingScore;
}

function aggregateUser(userObject, aggregationObject) {
  const user = Object.keys(userObject)[0];
  const userScores = userObject[user];
  for (const instance of userScores) {
    const { title, score, completed } = instance;
    if (!aggregationObject[title])
      aggregationObject[title] = {
        data: { currentMean: 0, totalUsers: 0, users: {}, totalCompleted: 0 },
      };
    const { data } = aggregationObject[title];
    if (score) {
      // if score is 0, don't update mean or total users
      data.currentMean = (
        (data.currentMean * data.totalUsers + score) /
        (data.totalUsers + 1)
      ).toFixed(2);
      data.totalUsers += 1;
    }

    data.totalCompleted = completed
      ? data.totalCompleted + 1
      : data.totalCompleted;
    data.users[user] = score;
  }
}

function cacheData(cacheObject, cacheFileName) {
  fs.writeFileSync(cacheFileName, JSON.stringify(cacheObject));
}

async function aggregateData(
  userList,
  storageFileName = "test.txt",
  cacheObj = null,
  cacheFileName = "testCache.txt",
  type = "anime"
) {
  try {
    const aggregationObject = {};
    for (let i = 0; i < userList.length; i++) {
      const user = userList[i];
      sleep(i * 175 + Math.random() * 50);
      const userObject = await getUserScores(user, cacheObj, {}, 0, type);
      if (!userObject) continue;
      aggregateUser(userObject, aggregationObject);
      INCLUDED_USERS.push(user);
      if (cacheObj) cacheObj[user] = userObject[user];
    }
    if (cacheObj && cacheFileName) cacheData(cacheObj, cacheFileName);
    const outputData = getOutputData(aggregationObject, cacheObj);
    storeAggregation(outputData, storageFileName);
  } catch (e) {
    console.log(e.message);
  }
}

function storeAggregation(outputData, storageFileName) {
  // variationData: {
  //   RMSE: string;
  //   count: number;
  //   username: string;
  // }
  // [];
  const { sortedData, top100Completed, variationData } = outputData;
  const introductionString = getIntroductionString();

  console.log("starting to write to file");
  fs.writeFileSync(storageFileName, introductionString, { flag: "w" });

  fs.writeFileSync(storageFileName, "\n Rankings: \n", { flag: "a" });

  for (let i = 0; i < sortedData.length; i++) {
    const placement = i + 1;
    const { title, data } = sortedData[i];
    const { pcMean, currentMean, totalUsers, totalCompleted } = data;
    const placementString = `${placement}. ${title} - Pseudocount Mean: ${pcMean}; Number of Scores: ${totalUsers}; Real Mean: ${currentMean}; Total Completed: ${totalCompleted} \n`;
    fs.writeFileSync(storageFileName, placementString, { flag: "a" });
  }
  fs.writeFileSync(
    storageFileName,
    `\n Score Errors for Users with at least ${VARIATION_MIN} entries scored: \n`,
    { flag: "a" }
  );
  for (let i = 0; i < variationData.length; i++) {
    const placement = i + 1;
    const { username, count, RMSE, MAE } = variationData[i];
    const placementString = `${placement}. user: ${username}; RMSE: ${RMSE}; MAE: ${MAE}; count: ${count} \n`;
    fs.writeFileSync(storageFileName, placementString, { flag: "a" });
  }

  fs.writeFileSync(storageFileName, "\n Most Completed: \n", { flag: "a" });
  for (let i = 0; i < top100Completed.length; i++) {
    const placement = i + 1;
    const { title, totalCompleted } = top100Completed[i];
    const placementString = `${placement}. ${title} - Total Completed: ${totalCompleted} \n`;
    fs.writeFileSync(storageFileName, placementString, { flag: "a" });
  }
  console.log("done writing to file");
}

function getOutputData(aggregationData, cacheObj = null) {
  //returns the proper sorted data format and the proper completion data format
  const unfilteredArr = Object.keys(aggregationData).map((key) => {
    return { title: key, data: aggregationData[key].data };
  });

  const filteredArr = unfilteredArr.filter(
    (scoredInstance) => scoredInstance.data.totalUsers >= MINIMUM_USERS
  );
  const pseudocountedArr = filteredArr.map((scoredInstance) => {
    const newScoredInstance = { ...scoredInstance };
    const { data } = newScoredInstance;
    const { currentMean, totalUsers } = data;
    data.pcMean = (
      (currentMean * totalUsers + pseudocount_VALUE * pseudocount_FREQUENCY) /
      (totalUsers + pseudocount_FREQUENCY)
    ).toFixed(2);
    return newScoredInstance;
  });
  const sortedData = pseudocountedArr.sort(
    (a, b) =>
      b.data.pcMean - a.data.pcMean ||
      b.data.totalUsers - a.data.totalUsers ||
      b.data.totalCompleted - a.data.totalCompleted
  );
  const completedArr = filteredArr.map((scoredInstance) => {
    const { title, data } = scoredInstance;
    const { totalCompleted } = data;
    return { title, totalCompleted };
  });
  const sortedCompletedArr = completedArr.sort(
    (a, b) => b.totalCompleted - a.totalCompleted
  );
  const top100Completed = sortedCompletedArr.slice(0, 100);

  let variationData = null;
  if (cacheObj) {
    variationData = getVariationData(cacheObj, pseudocountedArr);
  }
  return { sortedData, top100Completed, variationData };
}
function getVariationData(cacheObj, pseudocountedArr) {
  //pseudocountedArr: {title, data: {pcmean}}[]
  const userArr = Object.keys(cacheObj);
  const variationData = [];
  for (const username of userArr) {
    if (!(username in cacheObj)) continue;
    const fullData = cacheObj[username];
    const scores = fullData.filter((element) => element.score);

    //simple parameter for now, to handle incomplete cases
    if (scores.length < VARIATION_MIN) continue;
    let userSquareDeviation = 0;
    let userAbsoluteDeviation = 0;
    let count = 0;
    for (const work of scores) {
      const aggregateData = pseudocountedArr.find(
        (element) => element.title === work.title
      );
      if (!aggregateData) continue;

      userSquareDeviation += Math.pow(
        aggregateData.data.pcMean - work.score,
        2
      );

      userAbsoluteDeviation += Math.abs(aggregateData.data.pcMean - work.score);

      count++;
    }
    const RMSE = Math.sqrt(userSquareDeviation / count).toFixed(2);
    const MAE = (userAbsoluteDeviation / count).toFixed(2);
    variationData.push({ RMSE, count, username, MAE });
  }
  const filteredVariationData = variationData.filter(
    (e) => e.count >= VARIATION_MIN
  );
  const sortedVariationData = filteredVariationData.sort(
    (a, b) => a.RMSE - b.RMSE || a.MAE - b.MAE
  );
  return sortedVariationData;
}

const userList = uniqueArrayFromTxt("JusticeUserList.txt");
// console.log(userList);
// aggregateData(
//   userList,
//   "JusticeScores.txt",
//   getCacheObjFromFile("JusticeCache.json"),
//   "JusticeCache.json",
//   "anime"
// );

aggregateData(
  userList,
  "JusticeManga.txt",
  getCacheObjFromFile("JusticeManga.json"),
  "JusticeManga.json",
  "manga"
);

/*
const userList = uniqueArrayFromTxt("mcmServerUsers.txt", "\r\n")
const cacheObj = getCacheObjFromFile("mcmServerCache.json")
aggregateData(userList, "mcmServerScores.txt", cacheObj, "mcmServerCache.json")
*/

function getCacheObjFromFile(fileName) {
  return JSON.parse(fs.readFileSync(fileName));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function find_user_comparison(cacheObj, title1, title2) {
  const cacheArr = Object.entries(cacheObj);
  let title1Arr = [];
  let title2Arr = [];
  for (entry of cacheArr) {
    const arr = entry[1]; //array of objects with a title key
    const userName = entry[0];
    for (const work of arr) {
      if (work.title === title1) {
        title1Arr.push(userName);
      }
      if (work.title === title2) {
        title2Arr.push(userName);
      }
    }
  }
  let difference = title1Arr.filter((x) => !title2Arr.includes(x));
  console.log(`Users for ${title1}:`);
  console.log(title1Arr);
  console.log(`Users for ${title2}:`);
  console.log(title2Arr);
}
// find_user_comparison(getCacheObjFromFile("JusticeCache.json"), "Neon Genesis Evangelion", "Neon Genesis Evangelion: The End of Evangelion");

async function getUserDeviation(user) {
  //userObject: {[user]: [{ title, score, completed }]}
  const userObject = await getUserScores(user);
  const userArray = userObject[user];
  const scoreArray = userArray
    .map((scoreObject) => {
      return scoreObject.score;
    })
    .filter((score) => score > 0);
  const standardDeviation = getStandardDeviationArray(scoreArray);
  console.log(
    `The user ${user} has standard deviation of ${standardDeviation}`
  );
}
async function getUserDeviations(userArray) {
  for (const user of userArray) {
    await getUserDeviation(user);
  }
}
function getStandardDeviationArray(scoreArray) {
  const sumValue = scoreArray.reduce((total, current) => total + current);
  const mean = sumValue / scoreArray.length;

  let squareSumDiff = 0;
  for (const score of scoreArray) {
    squareSumDiff += Math.pow(mean - score, 2);
  }
  const standardDeviation = Math.sqrt(squareSumDiff / scoreArray.length);
  return standardDeviation;
}
// getUserDeviations(["MightyMole", "MizunoWaveRider"]);
// getUserDeviation("zenmodeman");
// console.log(getStandardDeviationArray([7.33, 8, 7.33, 7.67, 7, 6.67]));

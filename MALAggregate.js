const malScraper = require("mal-scraper")
const fs = require("fs")
const { cachedDataVersionTag } = require("v8")
const INCLUDED_USERS = []
const INACESSABLE_USERS = []
let scoreObject = {}
const MINIMUM_USERS = 5
const PSUEDOCOUNT_VALUE = 5.5
const PSUEDOCOUNT_FREQUENCY = 1
const seriesStatusMap = { ONGOING: 1, FINISHED: 2, NOT_YET_STARTED: 3 }
const userStatusMap = {
  CONSUMING: 1,
  COMPLETED: 2,
  ON_HOLD: 3,
  DROPPED: 4,
  PLAN_TO_CONSUME: 5,
}
const MINIMUM_COMPLETED_RATIO = 0.33
function getIntroductionString() {
  return `
  Date of Update: ${new Date().toDateString()}

  The following users are included: 
  ${INCLUDED_USERS}

  The following users could not be included, either because their lists are not public or because their accounts no longer exist: 
  
  ${INACESSABLE_USERS}
  
  This aggregation uses psuedocounts to reduce skewing of data with a smaller sample size. The psuecount value used is ${PSUEDOCOUNT_VALUE}, and the frequency is ${PSUEDOCOUNT_FREQUENCY}
  
  For a user's score to count for a finished title, the user must have consumed at least ${
    MINIMUM_COMPLETED_RATIO * 100
  }% of the work.
  
  Scores are provided only for anime that have scores from at least ${MINIMUM_USERS} users
  `
}
/*
{item1: {currentMean: 0, totalUsers: 0, users: {}}}
*/

//const userList = [...new Set(textList)]

function uniqueArrayFromTxt(txtPath, splitString = "\n") {
  return [...new Set(fs.readFileSync(txtPath).toString().split(splitString))]
}

async function getUserScores(
  user,
  cacheObj = null,
  prevObject = {},
  after = 0
) {
  try {
    const userObject = !Object.entries(prevObject).length
      ? { [user]: [] }
      : { ...prevObject }
    const userScores = userObject[user]
    const data = await malScraper.getWatchListFromUser(user, after, "anime")
    if (data.length) {
      for (const instance of data) {
        const { animeTitle, score, status } = instance
        const completed = status === userStatusMap.COMPLETED
        if (validateInstance(instance)) {
          userScores.push({ title: animeTitle, score, completed })
        } else if (completed)
          userScores.push({ title: animeTitle, score: 0, completed })
      }
      return getUserScores(user, cacheObj, userObject, after + 300)
    }
    console.count("Waiting")
    return userObject
  } catch (e) {
    //400: non-public list; 404: user deleted list or changed user
    if (
      e.message === "Request failed with status code 400" ||
      e.message === "Request failed with status code 404" ||
      e.message === "Request failed with status code 403"
    ) {
      if (e.message === "Request failed with status code 403") {
        console.log("Look at forbidden error")
      }
      if (cacheObj && cacheObj[user]) {
        return { [user]: cacheObj[user] }
      } else INACESSABLE_USERS.push(user)
    } else throw e
  }
}

/*
Testing user function

*/
async function printUser(user) {
  try {
    const data = await getUserScores(user, {})
    console.log("Length of data:", data[user].length)
    fs.writeFileSync("test.json", JSON.stringify(data), { flag: "w" })
  } catch (e) {
    console.log(e.message)
  }
}
//printUser("mcm")

function validateInstance(instance) {
  const {
    animeAiringStatus,
    score,
    numWatchedEpisodes,
    animeNumEpisodes,
    status,
  } = instance
  const isFinished = animeAiringStatus === seriesStatusMap.FINISHED
  const isOngoing = animeAiringStatus === seriesStatusMap.ONGOING

  const validFinishedScore =
    score &&
    isFinished &&
    Math.floor((numWatchedEpisodes / animeNumEpisodes) * 100) >=
      MINIMUM_COMPLETED_RATIO * 100
  const validOngoingScore =
    score && isOngoing && status !== userStatusMap.PLAN_TO_CONSUME
  return validFinishedScore || validOngoingScore
}

function aggregateUser(userObject, aggregationObject) {
  const user = Object.keys(userObject)[0]
  const userScores = userObject[user]
  for (const instance of userScores) {
    const { title, score, completed } = instance
    if (!aggregationObject[title])
      aggregationObject[title] = {
        data: { currentMean: 0, totalUsers: 0, users: {}, totalCompleted: 0 },
      }
    const { data } = aggregationObject[title]
    if (score) {
      // if score is 0, don't update mean or total users
      data.currentMean = (
        (data.currentMean * data.totalUsers + score) /
        (data.totalUsers + 1)
      ).toFixed(2)
      data.totalUsers += 1
    }

    data.totalCompleted = completed
      ? data.totalCompleted + 1
      : data.totalCompleted
    data.users[user] = score
  }
}

function cacheData(cacheObject, cacheFileName) {
  fs.writeFileSync(cacheFileName, JSON.stringify(cacheObject))
}

async function aggregateData(
  userList,
  storageFileName = "test.txt",
  cacheObj = null,
  cacheFileName = "testCache.txt"
) {
  try {
    const aggregationObject = {}
    for (const user of userList) {
      const userObject = await getUserScores(user, cacheObj)
      if (!userObject) continue
      aggregateUser(userObject, aggregationObject)
      INCLUDED_USERS.push(user)
      if (cacheObj) cacheObj[user] = userObject[user]
    }
    if (cacheObj && cacheFileName) cacheData(cacheObj, cacheFileName)
    const outputData = getOutputData(aggregationObject)
    storeAggregation(outputData, storageFileName)
  } catch (e) {
    console.log(e.message)
  }
}

function storeAggregation(outputData, storageFileName) {
  const { sortedData, top100Completed } = outputData
  const introductionString = getIntroductionString()

  console.log("starting to write to file")
  fs.writeFileSync(storageFileName, introductionString, { flag: "w" })

  fs.writeFileSync(storageFileName, "\n Rankings: \n", { flag: "a" })

  for (let i = 0; i < sortedData.length; i++) {
    const placement = i + 1
    const { title, data } = sortedData[i]
    const { pcMean, currentMean, totalUsers, totalCompleted } = data
    const placementString = `${placement}. ${title} - Psuedocount Mean: ${pcMean}; Number of Scores: ${totalUsers}; Real Mean: ${currentMean}; Total Completed: ${totalCompleted} \n`
    fs.writeFileSync(storageFileName, placementString, { flag: "a" })
  }
  fs.writeFileSync(storageFileName, "\n Most Watched: \n", { flag: "a" })
  for (let i = 0; i < top100Completed.length; i++) {
    const placement = i + 1
    const { title, totalCompleted } = top100Completed[i]
    const placementString = `${placement}. ${title} - Total Completed: ${totalCompleted} \n`
    fs.writeFileSync(storageFileName, placementString, { flag: "a" })
  }
  console.log("done writing to file")
}

function getOutputData(aggregationData) {
  //returns the proper sorted data format and the proper completion data format
  const unfilteredArr = Object.keys(aggregationData).map((key) => {
    return { title: key, data: aggregationData[key].data }
  })

  const filteredArr = unfilteredArr.filter(
    (scoredInstance) => scoredInstance.data.totalUsers >= MINIMUM_USERS
  )
  const psuedoCountedArr = filteredArr.map((scoredInstance) => {
    const newScoredInstance = { ...scoredInstance }
    const { data } = newScoredInstance
    const { currentMean, totalUsers } = data
    data.pcMean = (
      (currentMean * totalUsers + PSUEDOCOUNT_VALUE * PSUEDOCOUNT_FREQUENCY) /
      (totalUsers + PSUEDOCOUNT_FREQUENCY)
    ).toFixed(2)
    return newScoredInstance
  })
  const sortedData = psuedoCountedArr.sort(
    (a, b) =>
      b.data.pcMean - a.data.pcMean ||
      b.data.totalUsers - a.data.totalUsers ||
      b.data.totalCompleted - a.data.totalCompleted
  )
  const completedArr = filteredArr.map((scoredInstance) => {
    const { title, data } = scoredInstance
    const { totalCompleted } = data
    return { title, totalCompleted }
  })
  const sortedCompletedArr = completedArr.sort(
    (a, b) => b.totalCompleted - a.totalCompleted
  )
  const top100Completed = sortedCompletedArr.slice(0, 100)

  return { sortedData, top100Completed }
}

/*
const userList = uniqueArrayFromTxt("JusticeUserList.txt")
const cacheObj = getCacheObjFromFile("JusticeCache.json")
aggregateData(userList, "JusticeScores.txt", cacheObj, "JusticeCache.json")
*/

/*
const userList = uniqueArrayFromTxt("mcmServerUsers.txt", "\r\n")
const cacheObj = getCacheObjFromFile("mcmServerCache.json")
aggregateData(userList, "mcmServerScores.txt", cacheObj, "mcmServerCache.json")
*/

function getCacheObjFromFile(fileName) {
  return JSON.parse(fs.readFileSync(fileName))
}

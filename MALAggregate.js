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

function uniqueArrayFromTxt(txtPath) {
  return [...new Set(fs.readFileSync(txtPath).toString().split("\n"))]
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
        if (validateInstance(instance)) {
          const { animeTitle, score, status } = instance
          const completed = status === userStatusMap.COMPLETED
          userScores.push({ title: animeTitle, score, completed })
        }
      }
      return getUserScores(user, cacheObj, userObject, after + 300)
    }
    console.count("Waiting")
    return userObject
  } catch (e) {
    //400: non-public list; 404: user deleted list or changed user
    if (
      e.message === "Request failed with status code 400" ||
      e.message === "Request failed with status code 404"
    ) {
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
  const data = await getUserScores(user)
  console.log("Length of data:", data[user].length)
  fs.writeFileSync("test.json", JSON.stringify(data), { flag: "w" })
}
//printUser("zenmodeman")

function validateInstance(instance) {
  const {
    animeAiringStatus,
    score,
    numWatchedEpisodes,
    animeNumEpisodes,
    status,
    animeTitle,
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
async function addUserScores(user, after = 0) {
  try {
    const data = await malScraper.getWatchListFromUser(user, after, "anime")
    if (data.length) {
      for (const instance of data) {
        if (validateInstance(instance)) {
          const { animeTitle, score } = instance
          if (!scoreObject[animeTitle])
            scoreObject[animeTitle] = {
              currentMean: 0,
              totalUsers: 0,
              users: {},
            }
          scoreObject[animeTitle].currentMean = (
            (scoreObject[animeTitle].currentMean *
              scoreObject[animeTitle].totalUsers +
              score) /
            (scoreObject[animeTitle].totalUsers + 1)
          ).toFixed(2)
          scoreObject[animeTitle].totalUsers++
          scoreObject[animeTitle].users = {
            ...scoreObject[animeTitle].users,
            [user]: score,
          }
        }
      }
      if (after === 0) INCLUDED_USERS.push(user) //append users whose data could be obtained only the first time their list is iterated through
      return addUserScores(user, after + 300)
    }
    console.count("Waiting")
    return scoreObject
  } catch (e) {
    //400 error is for private lists, and 404 is for users that cannot be found

    if (
      e.message === "Request failed with status code 400" ||
      e.message === "Request failed with status code 404"
    ) {
      INACESSABLE_USERS.push(user)
    } else throw e
  }
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
    data.currentMean = (
      (data.currentMean * data.totalUsers + score) /
      (data.totalUsers + 1)
    ).toFixed(2)
    data.totalUsers += 1
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
}

const userList = uniqueArrayFromTxt("JusticeUserList.txt")
const cacheObj = getCacheObjFromFile("JusticeCache.json")
//console.log(cacheObj)
aggregateData(userList, "TestJusticeScores.txt", cacheObj, "JusticeCache.json")
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
    const placementString = `${placement}. ${title} - Psuedocount Mean: ${pcMean}; Number of Users: ${totalUsers}; Real Mean: ${currentMean}; Total Completed: ${totalCompleted} \n`
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
async function result(userList, batchName) {
  for (const user of userList) {
    await addUserScores(user)
  }
  console.log(
    `Successful Users: ${INCLUDED_USERS} \n UnSuccessful Users: ${INACESSABLE_USERS}`
  )
  const unfilteredArr = Object.keys(scoreObject).map((key) => {
    return { title: key, data: scoreObject[key] }
  })
  const filteredArr = unfilteredArr.filter(
    (scoredInstance) => scoredInstance.data.totalUsers >= MINIMUM_USERS
  )
  const psuedoCountedArr = filteredArr.map((scoredInstance) => {
    const newScoredInstance = { ...scoredInstance }
    const { currentMean, totalUsers } = newScoredInstance.data
    newScoredInstance.data.pcMean = (
      (currentMean * totalUsers + PSUEDOCOUNT_VALUE * PSUEDOCOUNT_FREQUENCY) /
      (totalUsers + PSUEDOCOUNT_FREQUENCY)
    ).toFixed(2)
    return newScoredInstance
  })
  const sortedArr = psuedoCountedArr.sort(
    (a, b) => b.data.pcMean - a.data.pcMean || b.totalUsers - a.totalUsers
  )
  const INTRODUCTION_STRING = `
  The following users are included: 
  ${INCLUDED_USERS}
  The following users could not be included, either because their lists are not public or because their accounts no longer exist: 
  ${INACESSABLE_USERS}
  
  This aggregation uses psuedocounts to reduce skewing of data with a smaller sample size. The psuecount value used is ${PSUEDOCOUNT_VALUE}, and the frequency is ${PSUEDOCOUNT_FREQUENCY}
  
  For a user's score to count for a finished title, the user must have consumed at least ${
    MINIMUM_COMPLETED_RATIO * 100
  }% of the work.

  `
  console.log("starting to write to file")
  fs.writeFileSync(`${batchName}.txt`, INTRODUCTION_STRING, { flag: "w" })
  for (let i = 0; i < sortedArr.length; i++) {
    const placement = i + 1
    const { title, data } = sortedArr[i]
    const { pcMean, currentMean, totalUsers } = data
    const placementString = `${placement}. ${title} - Psuedocount Mean: ${pcMean}; Number of Users: ${totalUsers}; Real Mean: ${currentMean} \n`
    fs.writeFileSync(`${batchName}.txt`, placementString, { flag: "a" })
  }

  console.log("done writing to file")
}

//console.log(userObject)
//const reshapedData = adaptAggregationFormatToUserFormat(userObject)
//console.log(reshapedData)

function getCacheObjFromFile(fileName) {
  return JSON.parse(fs.readFileSync(fileName))
}
/*
const catchyData = JSON.parse(fs.readFileSync("asstheteFixed.json"))
const justiceCache = JSON.parse(fs.readFileSync("JusticeCache.json"))
justiceCache["assthete"] = catchyData["assthete"]
fs.writeFileSync("JusticeCache.json", JSON.stringify(justiceCache), {
  flag: "w",
})
*/

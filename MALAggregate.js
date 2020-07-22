const malScraper = require("mal-scraper")
const fs = require("fs")
const includedUsers = []
const inacessableUsers = []
let scoreObject = {}
const minimumUsers = 5
const psuedoCountValue = 5.5
const psuedoCountFrequency = 1
const seriesStatusMap = { ONGOING: 1, FINISHED: 2, NOT_YET_STARTED: 3 }
const userStatusMap = {
  CONSUMING: 1,
  COMPLETED: 2,
  ON_HOLD: 3,
  DROPPED: 4,
  PLAN_TO_CONSUME: 5,
}
const MINIMUM_COMPLETED_RATIO = 0.33
/*
{item1: {currentMean: 0, totalUsers: 0, users: {}}}
*/
const textList = [
  "mightymole",
  "Isy_Quizgag",
  "Lukalade",
  "Mio",
  "Exphantom",
  "Yung_Icetea",
  "ccorn",
  "AltonWi34129768",
  "SolidSnake777000",
  "mcm",
  "krystallus",
  "Robinne",
  "Stiff99",
  "Bunnie",
  "RetroHead_",
  "changelog",
  "yanntjezz",
  "MenDouKote",
  "Carlosec",
  "Deoxysos",
  "indigohead",
  "leosmileyface",
  "aaron216",
  "DooMWhite",
  "KingBlex",
  "JalenHarris",
  "YourObsession",
  "kursed",
  "skinlog",
  "Shamo-",
  "NotFred",
  "Mienus",
  "huss",
  "Velcifer",
  "Ilie_Rares",
  "Prottoy",
  "Phiro_",
  "Bossun_86",
  "Tr1pkt12",
  "Matthew_S",
  "tuduo",
  "CynicalMatt",
  "Ektopos_Mayhem",
  "BlackDisaster",
  "CalmYaMind",
  "LucasRios2002Ani",
  "Protokahn",
  "Lnazuma",
  "Assepsia",
  "Ramaladni",
  "OmegaWaffles",
  "RetroRaven",
  "TheAquaSpaceCow",
  "Kingzor124",
  "LucasRiots",
  "AestheticOnion",
  "moeslasher",
  "Naito_",
  "Saeedpoppa",
  "veuera",
  "AstralSky",
]
const userList = [...new Set(textList)]

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
async function addUserScores(username, after = 0) {
  try {
    const data = await malScraper.getWatchListFromUser(username, after, "anime")
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
            [username]: score,
          }
        }
      }
      if (after === 0) includedUsers.push(username) //append users whose data could be obtained only the first time their list is iterated through
      return addUserScores(username, after + 300)
    }
    console.count("Waiting")
    return scoreObject
  } catch (e) {
    //400 error is for private lists, and 404 is for users that cannot be found

    if (
      e.message === "Request failed with status code 400" ||
      e.message === "Request failed with status code 404"
    ) {
      inacessableUsers.push(username)
    } else throw e
  }
}

async function result(userList, batchName) {
  for (const user of userList) {
    await addUserScores(user)
  }
  console.log(
    `Successful Users: ${includedUsers} \n UnSuccessful Users: ${inacessableUsers}`
  )
  const unfilteredArr = Object.keys(scoreObject).map((key) => {
    return { titleName: key, data: scoreObject[key] }
  })
  const filteredArr = unfilteredArr.filter(
    (scoredInstance) => scoredInstance.data.totalUsers >= minimumUsers
  )
  const psuedoCountedArr = filteredArr.map((scoredInstance) => {
    const newScoredInstance = { ...scoredInstance }
    const { currentMean, totalUsers } = newScoredInstance.data
    newScoredInstance.data.pcMean = (
      (currentMean * totalUsers + psuedoCountValue * psuedoCountFrequency) /
      (totalUsers + psuedoCountFrequency)
    ).toFixed(2)
    return newScoredInstance
  })
  const sortedArr = psuedoCountedArr.sort(
    (a, b) => b.data.pcMean - a.data.pcMean
  )
  const introductionString = `
  The following users are included: 
  ${includedUsers}
  The following users could not be included, either because their lists are not public or because their accounts no longer exist: 
  ${inacessableUsers}
  
  This aggregation uses psuedocounts to reduce skewing of data with a smaller sample size. The psuecount value used is ${psuedoCountValue}, and the frequency is ${psuedoCountFrequency}
  
  For a user's score to count for a finished title, the user must have consumed at least ${
    MINIMUM_COMPLETED_RATIO * 100
  }% of the work.

  `
  console.log("starting to write to file")
  fs.writeFileSync(`${batchName}.txt`, introductionString, { flag: "w" })
  for (let i = 0; i < sortedArr.length; i++) {
    const placement = i + 1
    const { titleName, data } = sortedArr[i]
    const { pcMean, currentMean, totalUsers } = data
    const placementString = `${placement}. ${titleName} - Psuedocount Mean: ${pcMean}; Number of Users: ${totalUsers}; Real Mean: ${currentMean} \n`
    fs.writeFileSync(`${batchName}.txt`, placementString, { flag: "a" })
  }

  console.log("done writing to file")
}
//result(userList, "JusticeScores")
async function singleResult(user) {
  await addUserScores(user)
  console.log("starting")
  fs.writeFileSync(`${user}.json`, JSON.stringify(scoreObject))
  console.log("Finishing")
  console.log(scoreObject)
  console.log(inacessableUsers)
}

function adaptAggregationFormatToUserFormat(aggregationFormUserData) {
  const titleList = Object.keys(aggregationFormUserData)
  console.log(titleList)
  const userArr = []
  let userName = null
  for (const title of titleList) {
    console.log(title)
    const data = aggregationFormUserData[title]
    console.log(data)
    const { users } = data
    console.log(users)
    if (userName === null) userName = Object.keys(users)[0]
    userArr.push({ title, score: users[userName], isCompleted: true })
  }
  return { [userName]: userArr }
}
const userObject = JSON.parse(
  fs.readFileSync("assthete.json", {
    encoding: "utf8",
    flag: "r",
  })
)
//console.log(userObject)
const reshapedData = adaptAggregationFormatToUserFormat(userObject)
//console.log(reshapedData)

console.log("Starting to write data")
fs.writeFileSync("asstheteFixed.json", JSON.stringify(reshapedData))
console.log("finished")

const malScraper = require("mal-scraper")
const fs = require("fs")
const includedUsers = []
const inacessableUsers = []
let scoreObject = {}
const minimumUsers = 5
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
const userList = [
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
]

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
        //if  the anime/manga is complete, then user must have finished at least 33% of it for the score to count
        //if it is ongoing, for simplicity sake, all scores will be counted

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

async function result(batchName) {
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
  jsonOutput = {
    scores: filteredArr,
  }
  const JSONData = JSON.stringify(jsonOutput)
  console.log("starting to write to file")
  fs.writeFileSync(`${batchName}.json`, JSONData)
  console.log("done writing to file")
}
result("JusticeScores")

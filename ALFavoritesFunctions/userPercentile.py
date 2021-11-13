import requests

list_query = """query ($name:String,$type:MediaType) {MediaListCollection(userName:$name,sort:SCORE_DESC,status_in:[COMPLETED,DROPPED,PAUSED,CURRENT,REPEATING],type:$type,forceSingleCompletedList:true) {
lists {
    isCustomList
    name
    entries{
        score(format:POINT_100)
        progress
      	status
      	repeat
      	completedAt {
      	  year
      	  month
      	  day
      	}
      	updatedAt
      	createdAt
        media {
            id
          	idMal
            title{romaji}
            episodes
            chapters
        }
    }
}
}
}"""
url = "https://graphql.anilist.co"

# This returns a list of only scores and no other information data about the scores
def getUserScoresSequenceByType(username, type="ANIME"):
    response = requests.post(
        url, json={"query": list_query, "variables": {"name": username, "type": type}}
    )
    respJson = response.json()
    # print(respJson)
    entries = respJson["data"]["MediaListCollection"]["lists"][0]["entries"]
    scoreSequence = []
    for entry in entries:
        currScore = entry["score"]
        if currScore > 0:
            scoreSequence.append(currScore)
    return scoreSequence


def getUserScoresSequence(username):
    animeSequence = getUserScoresSequenceByType(username, "ANIME")
    mangaSequence = getUserScoresSequenceByType(username, "MANGA")
    totalSequence = []
    totalSequence.extend(animeSequence)
    totalSequence.extend(mangaSequence)
    return totalSequence


def getPercentile(scoreArr, value, exclusive=True):
    sortedScoreArr = sorted(scoreArr, reverse=True)
    # print(sortedScoreArr)
    exclusiveIdx = None
    for i in range(len(scoreArr)):
        comparisonCheck = (
            value > sortedScoreArr[i] if exclusive else value >= sortedScoreArr[i]
        )
        if comparisonCheck:
            exclusiveIdx = i
            break
    if not exclusiveIdx:
        return 0

    percentile = (len(scoreArr) - exclusiveIdx) / len(scoreArr)
    if percentile == 0:
        return 100
    return percentile


# from userPercentile import getUserScoresSequence as gu, getPercentile as gp
